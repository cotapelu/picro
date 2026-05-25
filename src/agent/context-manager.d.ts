/**
 * Context builder for preparing LLM prompts.
 * Different design: functional approach, no stateful memory injection.
 */
import type { ConversationTurn, MemoryEntry, ContextBuilderConfig } from './types.js';
/**
 * Builds LLM prompt from conversation history.
 * Handles token limiting and memory injection.
 */
export declare class ContextBuilder {
    private config;
    constructor(config?: Partial<ContextBuilderConfig>);
    /**
     * Build full prompt for LLM.
     * Returns prompt string and estimated token count.
     */
    build(basePrompt: string, history: ConversationTurn[], memories?: MemoryEntry[]): {
        prompt: string;
        tokenCount: number;
    };
    /**
     * Estimate token count for text (approximate: chars / 4).
     */
    estimateTokenCount(text: string): number;
    /**
     * Estimate total tokens in a set of turns.
     */
    estimateHistoryTokens(turns: ConversationTurn[]): number;
    /**
     * Serialize a turn to string representation.
     */
    private serializeTurn;
    /**
     * Extract plain text from content blocks.
     */
    private extractTextContent;
    /**
     * Format history as conversation string.
     */
    private formatHistory;
    /**
     * Format memories for injection.
     */
    private formatMemories;
    /**
     * Truncate history to fit token limit.
     * Keeps system messages, recent messages, and respects minMessages.
     */
    private truncateHistory;
    /**
     * Get configuration stats.
     */
    getConfig(): Readonly<Required<ContextBuilderConfig>>;
    /**
     * Check if history is near capacity.
     */
    isNearCapacity(turns: ConversationTurn[], threshold?: number): boolean;
}
//# sourceMappingURL=context-manager.d.ts.map