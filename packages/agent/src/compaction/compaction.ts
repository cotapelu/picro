// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction - Main entry point for context compaction.
 *
 * Compacts a session by summarizing older entries while preserving recent context.
 */

import { complete } from '@picro/llm';
import type { Model } from '@picro/llm';
import {
  prepareCompaction,
  type PrepareCompactionResult,
} from './core.js';
import { computeFileLists, formatFileOperations, SUMMARIZATION_SYSTEM_PROMPT } from './utils.js';
import type { SessionEntry, CompactionEntry } from '../session-manager.js';

/**
 * Options for compaction.
 */
export interface CompactOptions {
  /** Model to use for summarization */
  model: Model;
  /** API key for the model */
  apiKey: string;
  /** Optional extra headers */
  headers?: Record<string, string>;
  /** Abort signal */
  signal?: AbortSignal;
  /** Tokens to reserve for future context (default: 16384) */
  reserveTokens?: number;
  /** Maximum tokens for summary response (default: 4096) */
  maxSummaryTokens?: number;
}

/**
 * Perform compaction on a list of session entries.
 *
 * Returns a new CompactionEntry that should be inserted into the session
 * immediately before the first kept entry (i.e., at cut point).
 *
 * The compaction entry will contain:
 * - summary: LLM-generated summary of the summarized branch
 * - firstKeptEntryId: ID of the first entry kept after compaction
 * - tokensBefore: total tokens before compaction
 * - details: { readFiles, modifiedFiles } from file operations tracking
 */
export async function compact(
  entries: SessionEntry[],
  options: CompactOptions
): Promise<CompactionEntry> {
  const { model, apiKey, headers, signal, reserveTokens = 16384, maxSummaryTokens = 4096 } = options;

  // 1. Prepare compaction: decide what to keep and what to summarize
  const maxTokensForSummarized = reserveTokens - 2000; // leave room for system prompt + summary
  const prep: PrepareCompactionResult = prepareCompaction(entries, {
    maxTokens: maxTokensForSummarized,
  });

  if (prep.entriesToSummarize.length === 0) {
    throw new Error('No entries to summarize - context already within limits');
  }

  // 2. Build LLM request
  const { readFiles, modifiedFiles } = computeFileLists(prep.fileOps);
  const fileOpsText = formatFileOperations(prep.fileOps);

  const systemPrompt = SUMMARIZATION_SYSTEM_PROMPT + (fileOpsText ? `\n\nFiles accessed during this branch:\n${fileOpsText}` : '');

  const conversation = serializeConversation(prep.entriesToSummarize);
  const userPrompt = `Please provide a concise but comprehensive summary of the following conversation branch. Include:\n- Key information and decisions\n- Important code snippets or file paths\n- Any errors or issues encountered\n- Outcome of the branch\n\nConversation:\n${conversation}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ] as any[];

  // 3. Call LLM
  const llmResult = await complete(
    model,
    { messages },
    { maxTokens: maxSummaryTokens, temperature: 0.3, signal, apiKey }
  );

  const summary = (llmResult.content?.[0]?.text || llmResult.content || '').trim();

  if (!summary) {
    throw new Error('LLM returned empty summary');
  }

  // 4. Create compaction entry
  const entryId = crypto.randomUUID();
  const firstKeptEntry = prep.entriesToKeep[0];
  if (!firstKeptEntry) {
    throw new Error('Compaction resulted in no entries to keep');
  }
  const now = new Date().toISOString();

  const compactionEntry: CompactionEntry = {
    type: 'compaction',
    id: entryId,
    parentId: firstKeptEntry.parentId || null,
    timestamp: now,
    summary,
    firstKeptEntryId: firstKeptEntry.id,
    tokensBefore: prep.totalTokens,
    details: {
      readFiles,
      modifiedFiles,
    },
  };

  return compactionEntry;
}

/**
 * Serialize entries to conversation string.
 */
function serializeConversation(entries: SessionEntry[]): string {
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.type === 'message') {
      const turn = entry.message as any;
      const role = turn.role.toUpperCase();
      const content = extractTextContent(turn.content);
      lines.push(`[${role}]: ${content}`);
    } else if (entry.type === 'custom_message') {
      lines.push(`[USER]: ${JSON.stringify(entry.content)}`);
    } else if (entry.type === 'branch_summary') {
      lines.push(`[BRANCH SUMMARY]: ${entry.summary}`);
    }
  }

  return lines.join('\n');
}

/**
 * Extract plain text from content blocks.
 */
function extractTextContent(content: any[]): string {
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
