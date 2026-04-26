// SPDX-License-Identifier: Apache-2.0
/**
 * Compaction - Session context compaction
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Token estimation
 * - Cut point detection
 * - Session summarization
 */

import type { AgentMessage } from "./agent-types.js";

// ============================================================================
// Types
// ============================================================================

export interface CompactionSettings {
  enabled: boolean;
  reserveTokens: number;
  keepRecentTokens: number;
}

export const DEFAULT_COMPACTION_SETTINGS: CompactionSettings = {
  enabled: true,
  reserveTokens: 16384,
  keepRecentTokens: 20000,
};

// ============================================================================
// Token Estimation
// ============================================================================

export function estimateTokens(message: AgentMessage): number {
  let chars = 0;

  switch (message.role) {
    case "user": {
      const content = message.content;
      if (typeof content === "string") {
        chars = content.length;
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text" && block.text) {
            chars += block.text.length;
          }
        }
      }
      return Math.ceil(chars / 4);
    }
    case "assistant": {
      const content = message.content as any[];
      for (const block of content) {
        if (block.type === "text") {
          chars += block.text?.length || 0;
        } else if (block.type === "thinking") {
          chars += block.thinking?.length || 0;
        } else if (block.type === "toolCall") {
          chars += (block.name?.length || 0) + JSON.stringify(block.arguments || {}).length;
        }
      }
      return Math.ceil(chars / 4);
    }
    case "tool": {
      const content = message.content as any;
      if (typeof content === "string") {
        chars = content.length;
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text" && block.text) {
            chars += block.text.length;
          }
        }
      }
      return Math.ceil(chars / 4);
    }
  }

  return 0;
}

export function estimateContextTokens(messages: AgentMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg);
  }
  return total;
}

// ============================================================================
// Cut Point Detection
// ============================================================================

export interface CutPointResult {
  firstKeptIndex: number;
  isSplitTurn: boolean;
}

export function findCutPoint(
  messages: AgentMessage[],
  keepRecentTokens: number
): CutPointResult {
  let accumulatedTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i]);
    accumulatedTokens += msgTokens;

    if (accumulatedTokens >= keepRecentTokens) {
      // Found cut point
      const isUserMessage = messages[i].role === "user";
      return {
        firstKeptIndex: i,
        isSplitTurn: !isUserMessage,
      };
    }
  }

  return {
    firstKeptIndex: 0,
    isSplitTurn: false,
  };
}

// ============================================================================
// Compaction Check
// ============================================================================

export function shouldCompact(
  contextTokens: number,
  contextWindow: number,
  settings: CompactionSettings
): boolean {
  if (!settings.enabled) return false;
  return contextTokens > contextWindow - settings.reserveTokens;
}

// ============================================================================
// Summarization (Stub - requires LLM)
// ============================================================================

export interface CompactionResult {
  summary: string;
  keptMessages: AgentMessage[];
  discardedMessages: AgentMessage[];
}

export async function compactSession(
  messages: AgentMessage[],
  settings: CompactionSettings = DEFAULT_COMPACTION_SETTINGS,
  _llmSummarize?: (text: string) => Promise<string>
): Promise<CompactionResult> {
  const totalTokens = estimateContextTokens(messages);

  if (!shouldCompact(totalTokens, 128000, settings)) {
    return {
      summary: "",
      keptMessages: messages,
      discardedMessages: [],
    };
  }

  const cutPoint = findCutPoint(messages, settings.keepRecentTokens);
  const keptMessages = messages.slice(cutPoint.firstKeptIndex);
  const discardedMessages = messages.slice(0, cutPoint.firstKeptIndex);

  // For now, return simple placeholder summary
  // In real implementation, this would call LLM to summarize
  const summary = `[Compacted ${discardedMessages.length} messages, kept ${keptMessages.length} recent messages]`;

  return {
    summary,
    keptMessages,
    discardedMessages,
  };
}
