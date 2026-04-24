import { describe, it, expect } from 'vitest';
import { estimateContextTokens, truncateContext, smartTruncate } from '../src/overflow';
import type { Message, Context } from '../src/types';

describe('estimateContextTokens', () => {
  it('should estimate tokens for empty context', () => {
    const context: Context = { messages: [] };
    const tokens = estimateContextTokens(context);
    expect(tokens).toBe(0);
  });

  it('should estimate tokens for system prompt', () => {
    const context: Context = {
      systemPrompt: 'You are a helpful assistant.',
      messages: [],
    };
    const tokens = estimateContextTokens(context);
    expect(tokens).toBeGreaterThan(0);
  });

  it('should estimate tokens for user messages', () => {
    const context: Context = {
      messages: [
        { role: 'user', content: 'Hello, how are you?', timestamp: Date.now() },
      ],
    };
    const tokens = estimateContextTokens(context);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('truncateContext', () => {
  it('should return unchanged context if within limit', () => {
    const context: Context = {
      systemPrompt: 'You are helpful.',
      messages: [
        { role: 'user', content: 'Hi', timestamp: Date.now() },
      ],
    };
    
    const result = truncateContext(context, 10000, 1000);
    expect(result.systemPrompt).toBe('You are helpful.');
    expect(result.messages.length).toBe(1);
  });

  it('should always keep at least one message', () => {
    const messages = [
      { role: 'user', content: 'Message 1', timestamp: Date.now() },
      { role: 'user', content: 'Message 2', timestamp: Date.now() },
    ] as Message[];
    
    const context: Context = { messages };
    const result = truncateContext(context, 10, 5);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should preserve tools when provided', () => {
    const context: Context = {
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ],
      tools: [
        { name: 'get_weather', description: 'Get weather', parameters: { type: 'object', properties: {} } },
      ],
    };
    
    const result = truncateContext(context, 10000, 1000);
    expect(result.tools).toBeDefined();
    expect(result.tools?.length).toBe(1);
  });
});

describe('smartTruncate', () => {
  it('should return truncated context', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'x'.repeat(10000), timestamp: Date.now() }],
    };
    
    const result = smartTruncate(context, 1000, 500);
    expect(result).toBeDefined();
  });

  it('should return context as-is if within limits', () => {
    const context: Context = {
      messages: [{ role: 'user', content: 'Short message', timestamp: Date.now() }],
    };
    
    const result = smartTruncate(context, 10000, 1000);
    expect(result.messages.length).toBe(1);
  });
});