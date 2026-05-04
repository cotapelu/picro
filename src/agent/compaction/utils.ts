// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction utilities - shared functions for compaction and branch summarization.
 * Clean-room implementation inspired by reference but rewritten.
 */

import type { ConversationTurn } from '../types';
import type { SessionEntry } from '../session-manager';

// ============================================================================
// File Operations Tracking
// ============================================================================

/**
 * Tracks files read and modified during a session.
 */
export interface FileOperations {
  read: Set<string>;
  edited: Set<string>;
}

/**
 * Create empty FileOperations.
 */
export function createFileOps(): FileOperations {
  return {
    read: new Set(),
    edited: new Set(),
  };
}

/**
 * Extract file operations from a message (tool calls).
 * Populates fileOps.read and fileOps.edited based on tool usage.
 */
export function extractFileOpsFromMessage(
  message: any,
  fileOps: FileOperations
): void {
  // Check if message has tool calls
  if (!message.toolCalls) return;

  for (const toolCall of message.toolCalls) {
    const toolName = toolCall.name;
    const args = toolCall.arguments;

    // Read operations: read, find, grep, ls
    if (toolName === 'read' || toolName === 'find' || toolName === 'grep' || toolName === 'ls') {
      if (typeof args.path === 'string') {
        fileOps.read.add(args.path);
      } else if (Array.isArray(args.paths)) {
        for (const p of args.paths) {
          if (typeof p === 'string') fileOps.read.add(p);
        }
      }
    }

    // Edit operations: edit, write
    if (toolName === 'edit' || toolName === 'write') {
      if (typeof args.path === 'string') {
        fileOps.edited.add(args.path);
      }
    }
  }
}

/**
 * Compute file lists from FileOperations.
 */
export function computeFileLists(fileOps: FileOperations): { readFiles: string[]; modifiedFiles: string[] } {
  return {
    readFiles: Array.from(fileOps.read).sort(),
    modifiedFiles: Array.from(fileOps.edited).sort(),
  };
}

/**
 * Format file operations for inclusion in compaction/branch summaries.
 */
export function formatFileOperations(fileOps: FileOperations): string {
  const { readFiles, modifiedFiles } = computeFileLists(fileOps);

  let text = '';
  if (readFiles.length > 0) {
    text += `Read files (${readFiles.length}): ${readFiles.slice(0, 10).join(', ')}${readFiles.length > 10 ? '...' : ''}\n`;
  }
  if (modifiedFiles.length > 0) {
    text += `Modified files (${modifiedFiles.length}): ${modifiedFiles.slice(0, 10).join(', ')}${modifiedFiles.length > 10 ? '...' : ''}\n`;
  }
  return text.trim();
}

// ============================================================================
// Message & Entry Conversion
// ============================================================================

/**
 * Convert a SessionEntry to a message-like object for LLM context.
 * Returns undefined for entries that shouldn't be included in context.
 */
export function getMessageFromEntry(
  entry: SessionEntry,
  options: { includeCompaction?: boolean } = {}
): any { // using any for simplicity
  switch (entry.type) {
    case 'message':
      return entry.message as any;

    case 'custom_message':
      // Convert custom_message to a message-like structure
      return {
        role: 'user' as const,
        content: entry.content,
        timestamp: entry.timestamp,
      } as any;

    case 'branch_summary':
      // Create a special message for branch summary
      return {
        role: 'user' as const,
        content: `[Branch Summary] ${entry.summary}`,
        timestamp: entry.timestamp,
      } as any;

    case 'compaction':
      if (options.includeCompaction) {
        // Include compaction summary as user message for context
        return {
          role: 'user' as const,
          content: `[Compaction] ${entry.summary}`,
          timestamp: entry.timestamp,
        } as any;
      }
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Serialize a conversation turn to string for token estimation.
 */
export function serializeTurn(turn: ConversationTurn): string {
  const role = turn.role.toUpperCase();
  const content = extractTextContent(turn.content);
  return `[${role}]: ${content}`;
}

/**
 * Extract plain text from content blocks.
 */
export function extractTextContent(content: any[]): string {
  return content
    .map((block) => {
      switch (block.type) {
        case 'text':
          return block.text;
        case 'thinking':
          return `[Thinking: ${block.thinking}]`;
        case 'toolCall':
          return `[Tool Call: ${block.name}(${JSON.stringify(block.arguments)})]`;
        default:
          return '';
      }
    })
    .join(' ');
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for a string (approximation: chars / 4).
 * This is a rough estimate; actual token count varies by model.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate total tokens for a set of entries.
 */
export function calculateContextTokens(entries: SessionEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.type === 'message') {
      total += estimateTokens(serializeTurn(entry.message as ConversationTurn));
    } else if (entry.type === 'compaction' || entry.type === 'branch_summary') {
      total += estimateTokens(entry.summary);
    } else if (entry.type === 'custom_message') {
      total += estimateTokens(String(entry.content));
    } else {
      total += estimateTokens(JSON.stringify(entry));
    }
  }
  return total;
}

// ============================================================================
// System Prompts
// ============================================================================

/**
 * System prompt for summarization tasks.
 */
export const SUMMARIZATION_SYSTEM_PROMPT = `You are a summarization assistant. Your task is to create a concise summary of a conversation branch.

Instructions:
- Focus on key information, decisions, and outcomes
- Preserve file paths and important code snippets
- Include any errors or issues encountered
- Keep the summary under 500 words
- Be factual and neutral`;

// ============================================================================
// Conversation Serialization
// ============================================================================

/**
 * Serialize entries to conversation format for LLM.
 */
export function serializeConversation(
  entries: SessionEntry[],
  options: { includeCompaction?: boolean } = {}
): string {
  const lines: string[] = [];

  for (const entry of entries) {
    const msg = getMessageFromEntry(entry, options);
    if (msg) {
      lines.push(serializeTurn(msg));
    }
  }

  return lines.join('\n');
}
