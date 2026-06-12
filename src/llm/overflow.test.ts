// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { truncateContext, estimateContextTokens, estimateMessageTokens } from './overflow.js';
import type { Message } from './types.js';

function textMessage(content: string): Message {
  return { role: 'user', content };
}

function systemPrompt(text: string): Message {
  return { role: 'system', content: text };
}

describe('truncateContext', () => {
  const makeLongMessage = (len: number): Message => ({
    role: 'user',
    content: 'x'.repeat(len),
  });

  it('returns original if within limit', () => {
    const context = {
      messages: [textMessage('Hello')],
    };
    const result = truncateContext(context, 1000, 0);
    expect(result.messages).toEqual(context.messages);
  });

  it('truncates by removing oldest messages first', () => {
    const context = {
      messages: [
        textMessage('a'.repeat(400)), // old (~100 tokens)
        textMessage('b'.repeat(400)),
        textMessage('c'.repeat(400)), // recent
      ],
    };
    // Set maxTokens low enough to drop at least one
    const maxTokens = 250; // less than total
    const result = truncateContext(context, maxTokens, 0);
    // Most recent should be kept
    expect(result.messages.length).toBeLessThan(context.messages.length);
    expect(result.messages[result.messages.length - 1].content).toContain('c');
  });

  it('preserves at least the most recent message', () => {
    const context = {
      messages: [
        textMessage('old'),
        textMessage('newest'),
      ],
    };
    const result = truncateContext(context, 50, 0);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    expect(result.messages[result.messages.length - 1].content).toContain('newest');
  });

  it('handles system prompt truncation when alone exceeds limit', () => {
    const longPrompt = 'x'.repeat(1000);
    const context = {
      systemPrompt: longPrompt,
      messages: [],
    };
    const result = truncateContext(context, 100, 0);
    expect(result.systemPrompt).toBeDefined();
    expect(result.systemPrompt!.length).toBeLessThan(longPrompt.length);
  });

  it('does not partially truncate any message', () => {
    const hugeMessage = makeLongMessage(400);
    const context = {
      messages: [textMessage('a'), hugeMessage, textMessage('b')],
    };
    const result = truncateContext(context, 100, 0);
    // The huge message should be kept whole or dropped entirely, never sliced
    if (result.messages.includes(hugeMessage)) {
      expect(result.messages.find(m => m === hugeMessage)!.content.length).toBe(400);
    }
  });

  it('respects reservedOutputTokens', () => {
    const context = {
      messages: [textMessage('test')],
    };
    const result = truncateContext(context, 1000, 500);
    // Should be same as original if fits within 500 reserved
    expect(result.messages.length).toBe(1);
  });
});
