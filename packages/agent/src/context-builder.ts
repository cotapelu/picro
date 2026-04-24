// SPDX-License-Identifier: Apache-2.0
/**
 * Context builder for preparing LLM prompts.
 * Different design: functional approach, no stateful memory injection.
 */

import type { ConversationTurn, MemoryEntry, ContextBuilderConfig } from './types.js';

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
      enableMemoryInjection: config?.enableMemoryInjection ?? true,
    };
  }

  /**
   * Build full prompt for LLM.
   * Returns prompt string and estimated token count.
   */
  build(
    basePrompt: string,
    history: ConversationTurn[],
    memories?: MemoryEntry[]
  ): { prompt: string; tokenCount: number } {
    // Step 1: Truncate history to fit context window
    const availableTokens = this.config.maxTokens - this.config.reservedTokens;
    const truncatedHistory = this.truncateHistory(history, availableTokens);

    // Step 2: Build history text
    const historyText = this.formatHistory(truncatedHistory);

    // Step 3: Inject memories if provided
    let fullPrompt = basePrompt;
    if (this.config.enableMemoryInjection && memories && memories.length > 0) {
      const memoryText = this.formatMemories(memories);
      fullPrompt += `\n\n${memoryText}`;
    }

    // Step 4: Append history
    if (historyText) {
      fullPrompt += `\n\n[Conversation History]\n${historyText}`;
    }

    // Step 5: Estimate tokens
    const tokenCount = this.estimateTokenCount(fullPrompt);

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
        if (block.type === 'text') {
          return block.text;
        }
        if (block.type === 'thinking') {
          return `[Thinking: ${block.thinking}]`;
        }
        if (block.type === 'toolCall') {
          return `[Tool Call: ${block.name}(${JSON.stringify(block.arguments)})]`;
        }
        return '';
      })
      .join(' ');
  }

  /**
   * Format history as conversation string.
   */
  private formatHistory(history: ConversationTurn[]): string {
    return history.map((turn) => this.serializeTurn(turn)).join('\n\n');
  }

  /**
   * Format memories for injection.
   */
  private formatMemories(memories: MemoryEntry[]): string {
    const topMemories = memories
      .filter((m) => m.relevance !== undefined ? m.relevance > 0.1 : true)
      .slice(0, 5)
      .map((m, i) => `[Memory ${i + 1}] ${m.content}`)
      .join('\n');

    return `[Relevant Memories]\n${topMemories}`;
  }

  /**
   * Truncate history to fit token limit.
   * Keeps system messages, recent messages, and respects minMessages.
   */
  private truncateHistory(
    history: ConversationTurn[],
    maxTokens: number
  ): ConversationTurn[] {
    if (history.length === 0) {
      return [];
    }

    const currentTokens = this.estimateHistoryTokens(history);
    if (currentTokens <= maxTokens) {
      return history;
    }

    // Separate system messages
    const systemMessages = history.filter((turn) => turn.role === 'system');
    const nonSystem = history.filter((turn) => turn.role !== 'system');

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
