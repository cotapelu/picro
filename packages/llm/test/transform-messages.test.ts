import { describe, it, expect } from 'vitest';
import { transformMessages, transformAssistantMessages } from '../src/transform-messages';
import type { Message, UserMessage, AssistantMessage, ToolResultMessage } from '../src/types';

describe('transformMessages', () => {
  describe('Skip errored/aborted messages', () => {
    it('should skip errored assistant messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() } as UserMessage,
        {
          role: 'assistant', content: [{ type: 'text', text: 'Hi' }], api: 'openai', provider: 'openai', model: 'gpt-4',
          usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'error', errorMessage: 'Rate limited', timestamp: Date.now(),
        } as AssistantMessage,
        { role: 'user', content: 'How are you?', timestamp: Date.now() } as UserMessage,
      ];

      const result = transformMessages(messages);
      expect(result.length).toBe(2);
    });

    it('should skip aborted assistant messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() } as UserMessage,
        {
          role: 'assistant', content: [{ type: 'text', text: '' }], api: 'openai', provider: 'openai', model: 'gpt-4',
          usage: { input: 10, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 10, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'aborted', timestamp: Date.now(),
        } as AssistantMessage,
      ];

      const result = transformMessages(messages);
      expect(result.length).toBe(1);
    });
  });

  describe('Tool call ID normalization', () => {
    it('should normalize tool call IDs with pipe', () => {
      const messages: Message[] = [
        {
          role: 'assistant', content: [{ type: 'toolCall', id: 'call_abc123|def456', name: 'get_weather', arguments: { city: 'Tokyo' } }],
          api: 'openai', provider: 'openai', model: 'gpt-4',
          usage: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, totalTokens: 30, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
          stopReason: 'stop', timestamp: Date.now(),
        } as AssistantMessage,
      ];

      const result = transformMessages(messages);
      const toolCall = (result[0] as AssistantMessage).content.find((c: any) => c.type === 'toolCall');
      expect(toolCall?.id).not.toContain('|');
    });
  });

  describe('Preserve user messages', () => {
    it('should preserve user messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() } as UserMessage,
        { role: 'user', content: 'How are you?', timestamp: Date.now() } as UserMessage,
      ];

      const result = transformMessages(messages);
      expect(result.length).toBe(2);
    });
  });

  describe('Empty arrays', () => {
    it('should handle empty message array', () => {
      const result = transformMessages([]);
      expect(result).toEqual([]);
    });
  });
});

describe('transformAssistantMessages', () => {
  it('should remove assistant messages with no content', () => {
    const messages: Message[] = [
      { role: 'assistant', content: [], api: 'openai', provider: 'openai', model: 'gpt-4',
        usage: { input: 10, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 10, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: 'stop', timestamp: Date.now(),
      } as AssistantMessage,
      { role: 'user', content: 'Hello', timestamp: Date.now() } as UserMessage,
    ];

    const result = transformAssistantMessages(messages);
    expect(result.length).toBe(1);
  });

  it('should preserve non-assistant messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() } as UserMessage,
    ];

    const result = transformAssistantMessages(messages);
    expect(result.length).toBe(1);
  });
});