/**
 * Context Window Overflow Handler
 *
 * Automatically truncates conversation history to fit within model's context window.
 * Preserves system prompt and most recent messages.
 */
import type { Message, Tool } from './types.js';
/**
 * Estimate total tokens in context
 */
export declare function estimateContextTokens(context: {
    systemPrompt?: string;
    messages: Message[];
}): number;
/**
 * Truncate context to fit within maxTokens
 *
 * Strategy:
 * 1. Keep system prompt intact (if any)
 * 2. Remove oldest messages first (FIFO)
 * 3. Always keep the most recent user message
 * 4. If even single message is too large, truncate it
 *
 * @returns Truncated context (or original if already fits)
 */
export declare function truncateContext(context: {
    systemPrompt?: string;
    messages: Message[];
    tools?: Tool[];
}, maxTokens: number, reservedOutputTokens?: number): {
    systemPrompt?: string;
    messages: Message[];
    tools?: Tool[];
};
/**
 * Smart truncation that tries to preserve conversation structure
 */
export declare function smartTruncate(context: {
    systemPrompt?: string;
    messages: Message[];
}, maxTokens: number, reservedOutputTokens?: number): {
    systemPrompt?: string;
    messages: Message[];
};
//# sourceMappingURL=overflow.d.ts.map