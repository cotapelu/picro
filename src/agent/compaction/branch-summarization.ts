// SPDX-License-Identifier: Apache-2.0
/**
 * Branch Summarization - Summarize a branch when navigating away.
 * Clean-room implementation inspired by reference.
 */

import { complete } from '../../llm';
import type { Model } from '../../llm';
import type { SessionEntry, BranchSummaryEntry } from '../session-manager';
import { getMessageFromEntry, serializeConversation, formatFileOperations, computeFileLists, createFileOps, extractFileOpsFromMessage } from './utils';

/**
 * Result of branch summarization.
 */
export interface BranchSummaryResult {
  summary?: string;
  readFiles?: string[];
  modifiedFiles?: string[];
  aborted?: boolean;
  error?: string;
}

/**
 * Details stored in BranchSummaryEntry.
 */
export interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}

/**
 * Preparation result for branch summarization.
 */
export interface BranchPreparation {
  /** Messages to summarize, chronological */
  entries: SessionEntry[];
  /** File operations extracted */
  fileOps: ReturnType<typeof createFileOps>;
  /** Total tokens */
  totalTokens: number;
}

/**
 * Options for generating branch summary.
 */
export interface GenerateBranchSummaryOptions {
  model: Model;
  apiKey: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  customInstructions?: string;
  replaceInstructions?: boolean;
  reserveTokens?: number; // default 16384
}

/**
 * Collect entries that should be summarized when navigating from old position to new.
 *
 * @param entries - All session entries in chronological order
 * @param oldLeafId - Current position (leaf entry ID) or null for root
 * @param targetId - Target position (leaf entry ID)
 * @returns Entries to summarize and common ancestor ID
 */
export function collectEntriesForBranchSummary(
  entries: SessionEntry[],
  oldLeafId: string | null,
  targetId: string
): { entriesToSummarize: SessionEntry[]; commonAncestorId: string | null } {
  if (!oldLeafId) {
    return { entriesToSummarize: [], commonAncestorId: null };
  }

  // Build parent map for quick navigation
  const parentMap = new Map<string, string | null>();
  for (const entry of entries) {
    if (entry.parentId) {
      parentMap.set(entry.id, entry.parentId);
    } else {
      parentMap.set(entry.id, null);
    }
  }

  // Build path from oldLeaf to root
  const oldPath: string[] = [];
  let curr: string | null = oldLeafId;
  while (curr) {
    oldPath.push(curr);
    curr = parentMap.get(curr) ?? null;
  }

  // Build path from target to root
  const targetPath: string[] = [];
  curr = targetId;
  while (curr) {
    targetPath.push(curr);
    curr = parentMap.get(curr) ?? null;
  }

  // Find common ancestor (closest to root)
  let commonAncestorId: string | null = null;
  const oldSet = new Set(oldPath);
  for (const node of targetPath) {
    if (oldSet.has(node)) {
      commonAncestorId = node;
      break;
    }
  }

  // Collect entries from oldPath up to (but not including) common ancestor
  const entriesToSummarize: SessionEntry[] = [];
  const seen = new Set<string>();
  for (const id of oldPath) {
    if (id === commonAncestorId) break;
    const entry = entries.find(e => e.id === id);
    if (entry && !seen.has(entry.id)) {
      entriesToSummarize.push(entry);
      seen.add(entry.id);
    }
  }

  // Reverse to chronological order (oldest first)
  entriesToSummarize.reverse();

  return { entriesToSummarize, commonAncestorId };
}

/**
 * Generate a branch summary using LLM.
 *
 * @param entries - Entries to summarize (should be chronological)
 * @param options - Generation options
 * @returns Summary entry that can be inserted into session
 */
export async function generateBranchSummary(
  entries: SessionEntry[],
  options: GenerateBranchSummaryOptions
): Promise<BranchSummaryEntry> {
  const { model, apiKey, headers, signal, customInstructions, replaceInstructions = false, reserveTokens = 16384 } = options;

  if (entries.length === 0) {
    throw new Error('No entries to summarize');
  }

  // 1. Extract file operations
  const fileOps = createFileOps();
  for (const entry of entries) {
    if (entry.type === 'message') {
      const turn = entry.message as any;
      if (turn.role === 'assistant') {
        const agentMsg = {
          role: 'assistant',
          content: turn.content,
          timestamp: turn.timestamp,
          toolCalls: (turn.content as any[]).filter((c: any) => c.type === 'toolCall').map((c: any) => ({
            id: c.id,
            name: c.name,
            arguments: c.arguments,
          })),
        };
        extractFileOpsFromMessage(agentMsg, fileOps);
      }
    }
  }

  const { readFiles, modifiedFiles } = computeFileLists(fileOps);
  const fileOpsText = formatFileOperations(fileOps);

  // 2. Build system prompt
  let systemPrompt = `You are a summarization assistant. Summarize this conversation branch concisely.\n\nInclude:\n- Key facts and decisions\n- Important file paths and code snippets\n- Errors or issues\n- Final outcome\n\nKeep under 200 words.`;
  if (fileOpsText) {
    systemPrompt += `\n\nFiles accessed:\n${fileOpsText}`;
  }
  if (customInstructions) {
    if (replaceInstructions) {
      systemPrompt = customInstructions;
    } else {
      systemPrompt += `\n\nAdditional instructions:\n${customInstructions}`;
    }
  }

  // 3. Serialize conversation
  const conversation = serializeConversation(entries, { includeCompaction: true });
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: `Summarize:\n\n${conversation}` },
  ] as any[];

  // 4. Call LLM
  const result = await complete(
    model,
    { messages },
    { maxTokens: 2048, temperature: 0.3, signal, apiKey }
  );

  const summary = (result.content?.[0]?.text || result.content || '').trim();

  // 5. Create branch summary entry
  const entryId = crypto.randomUUID();
  const parentId = entries[0]?.parentId || null;
  const timestamp = new Date().toISOString();

  return {
    type: 'branch_summary',
    id: entryId,
    parentId,
    timestamp,
    fromId: entries[0]!.id,
    summary,
    details: {
      readFiles,
      modifiedFiles,
    },
  };
}
