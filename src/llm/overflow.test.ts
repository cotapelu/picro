import { describe, it, expect } from 'vitest';
import { estimateContextTokens, truncateContext, smartTruncate } from './overflow.js';
import type { Message } from './types.js';

// Helper to create a simple text message using array content (realistic)
function textMessage(content: string): Message {
  return {
    role: 'user',
    content: [{ type: 'text', text: content }],
    timestamp: Date.now(),
  };
}

// Message with string content (non-standard but used to test string branch)
function legacyTextMessage(content: string): Message {
  // @ts-ignore: content as string
  return { role: 'user', content, timestamp: Date.now() };
}

// Helper to create a message with image
function imageMessage(dataUri: string): Message {
  return {
    role: 'user',
    content: [{ type: 'image', data: dataUri, mimeType: 'image/png' }],
    timestamp: Date.now(),
  };
}

// Helper to create a message with thinking block
function thinkingMessage(thinking: string): Message {
  return {
    role: 'assistant',
    content: [{ type: 'thinking', thinking }],
    timestamp: Date.now(),
  };
}

describe('estimateContextTokens', () => {
  it('estimates zero for empty context', () => {
    expect(estimateContextTokens({ messages: [] })).toBe(0);
  });

  it('estimates tokens for system prompt', () => {
    // 4 chars -> 1 token, 5 chars -> 2
    expect(estimateContextTokens({ systemPrompt: 'aaaa', messages: [] })).toBe(1);
    expect(estimateContextTokens({ systemPrompt: 'aaaaa', messages: [] })).toBe(2);
  });

  it('estimates tokens for text message array content', () => {
    // 4 chars = 1 token
    const msgs: Message[] = [textMessage('aaaa')];
    expect(estimateContextTokens({ messages: msgs })).toBe(1);
    // 5 chars = 2 tokens
    expect(estimateContextTokens({ messages: [textMessage('aaaaa')] })).toBe(2);
  });

  it('estimates tokens for image', () => {
    const msg = imageMessage('data:image/png;base64,...');
    // text part none, image fixed 85 tokens
    expect(estimateContextTokens({ messages: [msg] })).toBe(85);
  });

  it('estimates tokens for thinking block', () => {
    // Use predictable length: 4 chars => 1 token
    const msg = thinkingMessage('aaaa');
    expect(estimateContextTokens({ messages: [msg] })).toBe(1);
  });

  it('sums tokens across multiple messages and systemPrompt', () => {
    const context = {
      systemPrompt: 'sys', // 3 chars => 1 token
      messages: [
        textMessage('aaaa'), // 1 token
        textMessage('aaaaa'), // 2 tokens
        thinkingMessage('bbbb'), // 1 token
      ],
    };
    // 1 + 1+2+1 = 5
    expect(estimateContextTokens(context)).toBe(5);
  });
});

describe('truncateContext', () => {
  // For truncation tests we use reservedOutputTokens=0 to have availableTokens = maxTokens
  // This isolates truncation logic from reserved offset.

  it('returns original if context fits within limit', () => {
    const context = {
      systemPrompt: 's',
      messages: [textMessage('a')], // tokens: sys ceil(1/4)=1, msg ceil(1/4)=1 => total 2
    };
    const result = truncateContext(context, 5, 0);
    expect(result.messages).toEqual(context.messages);
    expect(result.systemPrompt).toBe(context.systemPrompt);
  });

  it('removes oldest messages when exceeding token limit', () => {
    // 4 chars = 1 token each
    const messages: Message[] = [
      textMessage('aaaa'),
      textMessage('bbbb'),
      textMessage('cccc'),
    ];
    const ctx = { messages };
    // max 2 tokens
    const result = truncateContext(ctx, 2, 0);
    expect(result.messages.length).toBe(2);
    // Must keep most recent two
    expect(result.messages).toContainEqual(messages[1]);
    expect(result.messages).toContainEqual(messages[2]);
  });

  it('preserves system prompt during truncation', () => {
    const messages: Message[] = [
      textMessage('a'), // might be >4? But 1 char => ceil(1/4)=1 token
      textMessage('b'),
      textMessage('c'),
    ];
    const ctx = {
      systemPrompt: 'sys', // ceil(3/4)=1 token
      messages,
    };
    // max 3 tokens: system 1 + 2 message tokens => keep last 2 messages
    const result = truncateContext(ctx, 3, 0);
    expect(result.systemPrompt).toBe('sys');
    expect(result.messages.length).toBe(2);
    expect(result.messages).toContainEqual(messages[1]);
    expect(result.messages).toContainEqual(messages[2]);
  });

  it('handles systemPrompt alone exceeding available tokens', () => {
    const ctx = {
      systemPrompt: 'x'.repeat(100), // many tokens
      messages: [textMessage('hi')],
    };
    const result = truncateContext(ctx, 1, 0);
    // System truncated
    expect(result.systemPrompt).toBeDefined();
    expect(result.systemPrompt!.length).toBeLessThan(100);
    expect(result.messages).toEqual([]);
  });

  it('truncates string content of a message when it alone exceeds limit', () => {
    // Use legacy string content to test that branch
    const longText = 'a'.repeat(10000);
    const msg = legacyTextMessage(longText);
    const ctx = { messages: [msg] };
    const result = truncateContext(ctx, 2, 0);
    const truncated = result.messages[0].content as string;
    // Should be truncated to about maxChars = availableTokens*4 = 8 chars
    expect(truncated.length).toBeLessThan(longText.length);
    // Should be last 8 characters
    expect(truncated).toBe(longText.slice(-8));
  });

  it('keeps at least one (most recent) message even when token limit very low', () => {
    const messages: Message[] = [
      textMessage('aaaa'),
      textMessage('bbbb'),
      textMessage('cccc'),
    ];
    const ctx = { messages };
    // max 1 token
    const result = truncateContext(ctx, 1, 0);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
    // Most recent should be present
    expect(result.messages).toContainEqual(messages[2]);
  });
});

describe('smartTruncate', () => {
  it('delegates to truncateContext', () => {
    const ctx = { messages: [textMessage('Hello')] };
    const result = smartTruncate(ctx, 100, 0);
    expect(result).toEqual(truncateContext(ctx, 100, 0));
  });
});
