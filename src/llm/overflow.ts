/**
 * Context Window Overflow Handler
 *
 * Automatically truncates conversation history to fit within model's context window.
 * Strategy: remove oldest messages entirely (no partial truncation) to preserve structure.
 */

import type { Message, Tool } from './types.js';

/**
 * Rough token estimation: 1 token ≈ 4 characters (English)
 * For more accurate estimation, use tiktoken or similar (but that's heavy)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a single message
 */
function estimateMessageTokens(msg: Message): number {
  let tokens = 0;
  if (typeof msg.content === 'string') {
    tokens += estimateTokens(msg.content);
  } else {
    for (const block of msg.content) {
      if (block.type === 'text') {
        tokens += estimateTokens(block.text);
      } else if (block.type === 'image') {
        tokens += 85; // Approx base64 image token cost
      } else if (block.type === 'thinking') {
        tokens += estimateTokens(block.thinking);
      }
    }
  }
  // Add overhead for role and formatting (roughly 5 tokens)
  tokens += 5;
  return tokens;
}

/**
 * Estimate total tokens in context
 */
export function estimateContextTokens(context: {
  systemPrompt?: string;
  messages: Message[];
}): number {
  let total = 0;
  if (context.systemPrompt) total += estimateTokens(context.systemPrompt);
  for (const msg of context.messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

/**
 * Truncate context to fit within maxTokens
 *
 * Strategy:
 * 1. Keep system prompt intact
 * 2. Remove oldest messages one by one (FIFO) until we fit
 * 3. Always keep at least the most recent user message
 * 4. Never partially truncate a message (to preserve structure for transformMessages)
 * 5. If a single message is too large, we still keep it (caller must handle)
 *
 * @returns Truncated context (or original if already fits)
 */
export function truncateContext(
  context: { systemPrompt?: string; messages: Message[]; tools?: Tool[] },
  maxTokens: number,
  reservedOutputTokens: number = 4096
): { systemPrompt?: string; messages: Message[]; tools?: Tool[] } {
  const availableTokens = maxTokens - reservedOutputTokens;
  let currentTokens = estimateContextTokens(context);

  if (currentTokens <= availableTokens) {
    return context; // No truncation needed
  }

  // Clone to avoid mutating original
  const messages = [...context.messages];

  // Calculate system prompt tokens
  const systemPromptTokens = context.systemPrompt ? estimateTokens(context.systemPrompt) : 0;
  let availableForMessages = availableTokens - systemPromptTokens;

  if (availableForMessages <= 0) {
    // System prompt alone exceeds context - must truncate it to a snippet
    const maxChars = Math.max(0, availableTokens * 4);
    const truncated = context.systemPrompt?.slice(-maxChars) || '';
    return {
      systemPrompt: truncated,
      messages: [],
      tools: context.tools,
    };
  }

  // Build array of token counts for each message for quick recalc
  const messageTokens = messages.map(estimateMessageTokens);

  // Remove oldest messages until we fit, but keep at least 1 message (the most recent)
  let startIdx = 0;
  while (startIdx < messages.length - 1) {
    const tokensIfRemoved = currentTokens - messageTokens[startIdx];
    if (tokensIfRemoved <= availableForMessages) {
      // Removing this message gets us under limit
      currentTokens = tokensIfRemoved;
      startIdx++;
    } else {
      break;
    }
  }

  // If still too large, we need to drop more messages even if it leaves only one
  while (startIdx < messages.length && currentTokens > availableForMessages) {
    if (messages.length - startIdx <= 1) break; // Keep at least one message
    currentTokens -= messageTokens[startIdx];
    startIdx++;
  }

  // Final check: if the remaining message(s) still exceed limit, we have to keep them anyway
  // (can't partially truncate). In practice, models have large context windows so this is rare.

  const truncatedMessages = messages.slice(startIdx);

  return {
    systemPrompt: context.systemPrompt,
    messages: truncatedMessages,
    tools: context.tools,
  };
}

/**
 * Smart truncation that preserves conversation structure.
 * This is a thin wrapper; complex preservation is handled by transformMessages.
 */
export function smartTruncate(
  context: { systemPrompt?: string; messages: Message[]; tools?: Tool[] },
  maxTokens: number,
  reservedOutputTokens: number = 4096
): { systemPrompt?: string; messages: Message[]; tools?: Tool[] } {
  return truncateContext(context, maxTokens, reservedOutputTokens);
}
