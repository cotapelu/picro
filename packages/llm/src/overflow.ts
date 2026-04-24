/**
 * Context Window Overflow Handler
 *
 * Automatically truncates conversation history to fit within model's context window.
 * Preserves system prompt and most recent messages.
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
 * Estimate total tokens in context
 */
export function estimateContextTokens(context: {
  systemPrompt?: string;
  messages: Message[];
}): number {
  let total = 0;

  if (context.systemPrompt) {
    total += estimateTokens(context.systemPrompt);
  }

  for (const msg of context.messages) {
    if (typeof msg.content === 'string') {
      total += estimateTokens(msg.content);
    } else {
      for (const block of msg.content) {
        if (block.type === 'text') {
          total += estimateTokens(block.text);
        } else if (block.type === 'image') {
          // Image: roughly 85 tokens per image (base64 overhead)
          total += 85;
        } else if (block.type === 'thinking') {
          total += estimateTokens(block.thinking);
        }
      }
    }
  }

  return total;
}

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
    // System prompt alone exceeds context - must truncate it
    const truncated = context.systemPrompt?.slice(-availableTokens * 4) || '';
    return {
      systemPrompt: truncated,
      messages: [],
    };
  }

  // Remove oldest messages until we fit
  // Keep at least 1 message (the most recent user message)
  while (messages.length > 1 && estimateContextTokens({ messages }) > availableForMessages) {
    // Don't remove the last message
    if (messages.length === 1) break;
    messages.shift(); // Remove oldest
  }

  // If still too large, truncate the oldest remaining message content
  while (messages.length > 0 && estimateContextTokens({ messages }) > availableForMessages) {
    const oldest = messages[0];
    if (typeof oldest.content === 'string') {
      const maxChars = (availableForMessages - (messages.length - 1) * 100) * 4; // rough
      if (oldest.content.length > maxChars) {
        oldest.content = oldest.content.slice(-maxChars);
      }
    }
    // Re-check
    if (estimateContextTokens({ messages }) <= availableForMessages) break;

    // Still too big? Remove this message
    if (messages.length > 1) {
      messages.shift();
    } else {
      // Last message, must truncate content significantly
      if (typeof oldest.content === 'string') {
        oldest.content = oldest.content.slice(-Math.floor(availableForMessages * 2));
      }
      break;
    }
  }

  return {
    systemPrompt: context.systemPrompt,
    messages,
    tools: context.tools,
  };
}

/**
 * Smart truncation that tries to preserve conversation structure
 */
export function smartTruncate(
  context: { systemPrompt?: string; messages: Message[] },
  maxTokens: number,
  reservedOutputTokens: number = 4096
): { systemPrompt?: string; messages: Message[] } {
  const result = truncateContext(context, maxTokens, reservedOutputTokens);

  // Additional logic could:
  // - Preserve tool call/result pairs
  // - Keep conversation turns intact
  // - Summarize old messages (future)

  return result;
}
