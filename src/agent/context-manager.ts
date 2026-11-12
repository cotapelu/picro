// SPDX-License-Identifier: Apache-2.0
/**
 * Context builder for preparing LLM prompts.
 * Different design: functional approach, no stateful memory injection.
 */

import type {
  ConversationTurn,
  ContextBuilderConfig,
} from "./types.js";

/** Upper bound on prompt-rebuild retries (see buildWithDepth). */
const MAX_BUILD_DEPTH = 3;

/**
 * Builds LLM prompt from conversation history.
 * Handles token limiting and memory injection.
 */
export class ContextBuilder {
  private config: Required<ContextBuilderConfig>;

  constructor(config?: Partial<ContextBuilderConfig>) {
    this.config = {
      maxTokens: config?.maxTokens ?? 128000,
      reservedTokens: config?.reservedTokens ?? 4096,
      minMessages: config?.minMessages ?? 5,
    };
  }
  /**
   * Build full prompt for LLM.
   * Returns prompt string and estimated token count.
   */
  build(
    basePrompt: string,
    history: ConversationTurn[]
  ): { prompt: string; tokenCount: number } {
    return this.buildWithDepth(basePrompt, history, 0);
  }

  /**
   * Depth-limited build.
   *
   * The retry passes the already-truncated history back in, but truncateHistory()
   * always keeps the system turns plus `minMessages` recent turns. When that
   * mandatory tail alone is larger than maxTokens, every retry produced the very
   * same oversized prompt and recursed until the stack overflowed.
   */
  private buildWithDepth(
    basePrompt: string,
    history: ConversationTurn[],
    depth: number,
  ): { prompt: string; tokenCount: number } {
    const maxTokens = this.config.maxTokens;
    const reservedTokens = this.config.reservedTokens;

    // Estimate base prompt tokens
    const baseTokens = this.estimateTokenCount(basePrompt);

    // Compute remaining tokens for history
    const availableForHistory = maxTokens - reservedTokens - baseTokens;

    // Truncate history to fit remaining space (or empty if negative)
    const truncatedHistory = availableForHistory > 0 ? this.truncateHistory(history, availableForHistory) : [];
    const historyText = this.formatHistory(truncatedHistory);

    // Build full prompt
    let fullPrompt = basePrompt;
    if (historyText) {
      fullPrompt += `\n\n[Conversation History]\n${historyText}`;
    }

    // Estimate final token count
    const tokenCount = this.estimateTokenCount(fullPrompt);

    // Safety: if still over limit, rebuild with the already truncated history so
    // a long system prompt can shrink on the next pass. Guarded by a depth limit:
    // if there is nothing left to drop (system prompt or the mandatory recent
    // tail alone exceeds maxTokens) retrying cannot help and used to recurse
    // until "Maximum call stack size exceeded".
    if (tokenCount > maxTokens && truncatedHistory.length > 0 && depth < MAX_BUILD_DEPTH) {
      return this.buildWithDepth(basePrompt, truncatedHistory, depth + 1);
    }

    return { prompt: fullPrompt, tokenCount };
  }

  /**
   * Estimate token count for text (approximate: chars / 4).
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate total tokens in a set of turns.
   */
  estimateHistoryTokens(turns: ConversationTurn[]): number {
    let total = 0;
    for (const turn of turns) {
      total += this.estimateTokenCount(this.serializeTurn(turn));
    }
    return total;
  }

  /**
   * Serialize a turn to string representation.
   */
  private serializeTurn(turn: ConversationTurn): string {
    const role = turn.role.toUpperCase();
    const content = this.extractTextContent(turn.content);
    return `[${role}]: ${content}`;
  }

  /**
   * Extract plain text from content blocks.
   */
  private extractTextContent(content: any[]): string {
    return content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }
        if (block.type === "thinking") {
          return `[Thinking: ${block.thinking}]`;
        }
        if (block.type === "toolCall") {
          return `[Tool Call: ${block.name}(${JSON.stringify(block.arguments)})]`;
        }
        return "";
      })
      .join(" ");
  }

  /**
   * Format history as conversation string.
   */
  private formatHistory(history: ConversationTurn[]): string {
    return history.map((turn) => this.serializeTurn(turn)).join("\n\n");
  }



  /**
   * Truncate history to fit token limit.
   * Keeps system messages, recent messages, and respects minMessages.
   */
  private truncateHistory(
    history: ConversationTurn[],
    maxTokens: number,
  ): ConversationTurn[] {
    if (history.length === 0) {
      return [];
    }

    const currentTokens = this.estimateHistoryTokens(history);
    if (currentTokens <= maxTokens) {
      return history;
    }

    // Separate system messages
    const systemMessages = history.filter((turn) => turn.role === "system");
    const nonSystem = history.filter((turn) => turn.role !== "system");

    // Keep at least minMessages from recent
    const minKeep = Math.min(this.config.minMessages, nonSystem.length);
    const recent = nonSystem.slice(-minKeep);
    const older = nonSystem.slice(0, -minKeep);

    // Start with system + recent
    let candidate = [...systemMessages, ...recent];
    let candidateTokens = this.estimateHistoryTokens(candidate);

    // Try to add older messages from newest to oldest
    for (const turn of older.reverse()) {
      const turnTokens = this.estimateHistoryTokens([turn]);
      if (candidateTokens + turnTokens <= maxTokens) {
        candidate = [turn, ...candidate];
        candidateTokens += turnTokens;
      } else {
        break;
      }
    }

    return candidate;
  }

  /**
   * Get configuration stats.
   */
  getConfig(): Readonly<Required<ContextBuilderConfig>> {
    return { ...this.config };
  }

  /**
   * Check if history is near capacity.
   */
  isNearCapacity(turns: ConversationTurn[], threshold: number = 0.9): boolean {
    const tokens = this.estimateHistoryTokens(turns);
    const limit = this.config.maxTokens - this.config.reservedTokens;
    return tokens >= limit * threshold;
  }
}
