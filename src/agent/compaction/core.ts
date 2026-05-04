// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction core logic - token-based context management.
 * Clean-room implementation inspired by reference.
 */

import type { SessionEntry, BranchSummaryEntry, CompactionEntry } from '../session-manager';
import type { ConversationTurn } from '../types';
import {
  createFileOps,
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
  estimateTokens,
  serializeConversation,
  calculateContextTokens,
  SUMMARIZATION_SYSTEM_PROMPT,
  type FileOperations,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}

export interface CutPointResult {
  cutIndex: number; // Index in entries array (entries[0..cutIndex-1] kept)
  tokensBefore: number;
  tokensAfter: number;
}

export interface PrepareCompactionResult {
  entriesToKeep: SessionEntry[];
  entriesToSummarize: SessionEntry[];
  cutPoint: CutPointResult;
  fileOps: FileOperations;
  totalTokens: number;
}

// ============================================================================
// Should Compact?
// ============================================================================

/**
 * Compaction thresholds configuration.
 */
export interface CompactionThresholds {
  /** Tokens at which compaction is recommended (default: 100k) */
  tokenThreshold: number;
  /** Minimum tokens to even consider compaction (default: 50k) */
  minTokens: number;
  /** Maximum tokens after compaction (default: 50k) */
  maxAfterCompaction: number;
}

export const DEFAULT_COMPACTION_THRESHOLDS: CompactionThresholds = {
  tokenThreshold: 100_000,
  minTokens: 50_000,
  maxAfterCompaction: 50_000,
};

/**
 * Determine if compaction should be performed.
 * Checks current token count against threshold.
 */
export function shouldCompact(
  totalTokens: number,
  thresholds: CompactionThresholds = DEFAULT_COMPACTION_THRESHOLDS
): boolean {
  if (totalTokens < thresholds.minTokens) {
    return false;
  }
  return totalTokens >= thresholds.tokenThreshold;
}

// ============================================================================
// Find Cut Point
// ============================================================================

/**
 * Find the cut point in an entry list where we can truncate.
 * Uses binary search to find maximum prefix that fits within maxTokens.
 */
export function findCutPoint(
  entries: SessionEntry[],
  maxTokens: number,
  estimateFn: (entries: SessionEntry[]) => number = calculateContextTokens
): CutPointResult {
  if (entries.length === 0) {
    return { cutIndex: 0, tokensBefore: 0, tokensAfter: 0 };
  }

  const totalTokens = estimateFn(entries);
  if (totalTokens <= maxTokens) {
    return { cutIndex: entries.length, tokensBefore: totalTokens, tokensAfter: 0 };
  }

  // Binary search for cut point
  let low = 0;
  let high = entries.length;
  let bestCut = 0;
  let bestTokens = 0;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const prefix = entries.slice(0, mid);
    const tokens = estimateFn(prefix);

    if (tokens <= maxTokens) {
      bestCut = mid;
      bestTokens = tokens;
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return {
    cutIndex: bestCut,
    tokensBefore: bestTokens,
    tokensAfter: totalTokens - bestTokens,
  };
}

// ============================================================================
// Prepare Compaction
// ============================================================================

/**
 * Prepare compaction: determine what to keep, what to summarize.
 * Also collects file operations across the session.
 */
export function prepareCompaction(
  entries: SessionEntry[],
  options: {
    maxTokens: number;
    keepRecentTurns?: number;
  } = { maxTokens: DEFAULT_COMPACTION_THRESHOLDS.maxAfterCompaction }
): PrepareCompactionResult {
  const { maxTokens, keepRecentTurns = 5 } = options;

  // 1. Collect file operations across entire session
  const fileOps = createFileOps();
  for (const entry of entries) {
    if (entry.type === 'message') {
      const turn = entry.message as ConversationTurn;
      // Extract from tool calls in assistant turns
      if (turn.role === 'assistant' && turn.content) {
        // Convert turn to message format for extraction
        const agentMsg: any = {
          role: 'assistant',
          content: turn.content as any[],
          timestamp: turn.timestamp,
          toolCalls: (turn.content as any[]).filter((c: any) => c.type === 'toolCall').map((c: any) => ({
            id: c.id,
            name: c.name,
            arguments: c.arguments,
          })),
        };
        extractFileOpsFromMessage(agentMsg, fileOps);
      }
    } else if (entry.type === 'custom_message') {
      // Could have tool calls in custom content? Skip for now.
    }
  }

  // 2. Find cut point: we want to keep recent entries + system entries
  // First, separate system entries (should always be kept)
  const systemEntries: SessionEntry[] = [];
  const nonSystem: SessionEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'message' && (entry.message as ConversationTurn).role === 'system') {
      systemEntries.push(entry);
    } else {
      nonSystem.push(entry);
    }
  }

  // Keep at least keepRecentTurns from the end
  const keepCount = Math.min(keepRecentTurns, nonSystem.length);
  const recent = nonSystem.slice(-keepCount);
  const older = nonSystem.slice(0, -keepCount);

  // Start with system + recent, see tokens
  let candidate = [...systemEntries, ...recent];
  let candidateTokens = estimateTokens(serializeConversation(candidate, { includeCompaction: true }));

  // Try to add older entries from newest to oldest until we hit near maxTokens
  const olderReversed = [...older].reverse();
  for (const entry of olderReversed) {
    const testCandidate = [entry, ...candidate];
    const tokens = estimateTokens(serializeConversation(testCandidate, { includeCompaction: true }));
    if (tokens <= maxTokens) {
      candidate = [entry, ...candidate];
      candidateTokens = tokens;
    } else {
      break;
    }
  }

  // Everything in older not included will be summarized
  const entriesToKeep = candidate;
  const keptIds = new Set(entriesToKeep.map(e => e.id));
  const entriesToSummarize = older.filter(e => !keptIds.has(e.id));

  return {
    entriesToKeep,
    entriesToSummarize,
    cutPoint: {
      cutIndex: entriesToKeep.length,
      tokensBefore: candidateTokens,
      tokensAfter: estimateTokens(serializeConversation(entriesToSummarize)),
    },
    fileOps,
    totalTokens: estimateTokens(serializeConversation(entries)),
  };
}

// ============================================================================
// Extract File Operations from Session
// ============================================================================

/**
 * Extract file operations from entries (messages + previous compaction details).
 */
export function extractFileOperations(
  entries: SessionEntry[],
  prevCompactionIndex: number
): FileOperations {
  const fileOps = createFileOps();

  // If there's a previous compaction, its details may contain file operations
  if (prevCompactionIndex >= 0 && prevCompactionIndex < entries.length) {
    const prevEntry = entries[prevCompactionIndex];
    if (prevEntry.type === 'compaction') {
      const details = prevEntry.details as CompactionDetails | undefined;
      if (details) {
        for (const f of details.readFiles || []) fileOps.read.add(f);
        for (const f of details.modifiedFiles || []) fileOps.edited.add(f);
      }
    }
  }

  // Extract from all messages
  for (const entry of entries) {
    if (entry.type === 'message') {
      const turn = entry.message as ConversationTurn;
      if (turn.role === 'assistant') {
        const agentMsg: any = {
          role: 'assistant',
          content: turn.content as any[],
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

  return fileOps;
}
