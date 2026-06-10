import { describe, it, expect } from 'vitest';
import { estimateContextTokens, truncateContext } from './overflow.js';
import type { Message } from './types.js';

function createUserMessage(text: string): Message {
  return { role: 'user', content: text, timestamp: Date.now() };
}

function createAssistantMessageWithBlocks(blocks: any[]): Message {
  return { role: 'assistant', content: blocks, timestamp: Date.now() };
}

describe('overflow edge cases', () => {
  it('handles message with both image and text blocks', () => {
    const msg: Message = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Look at this: ' },
        { type: 'image', data: 'abc123', mimeType: 'image/png' },
        { type: 'text', text: ' and that.' },
      ],
      timestamp: Date.now(),
    };
    const tokens = estimateContextTokens({ messages: [msg] });
    // text "Look at this: " (15) + image (85) + text " and that." (9) => base 92, plus 5 overhead => 97
    expect(tokens).toBe(97);
  });

  it('truncates when only one message remains and it is too large', () => {
    const hugeText = 'A'.repeat(5000);
    const context = {
      systemPrompt: '',
      messages: [createUserMessage(hugeText)],
    };
    const result = truncateContext(context, 10, 0); // 10 tokens ~40 chars
    expect(result.messages.length).toBe(1);
    const truncatedContent = result.messages[0].content;
    // No partial truncation: single large message is kept as-is
    if (typeof truncatedContent === 'string') {
      expect(truncatedContent.length).toBe(5000);
    }
  });

  it('handles empty messages array', () => {
    const tokens = estimateContextTokens({ messages: [] });
    expect(tokens).toBe(0);
  });

  it('handles messages with toolResult role containing string content', () => {
    const msg: Message = {
      role: 'toolResult',
      toolCallId: 'call123',
      toolName: 'test',
      content: 'Tool output',
      timestamp: Date.now(),
    };
    const tokens = estimateContextTokens({ messages: [msg] });
    // "Tool output" length 12 -> ceil(12/4)=3, plus 5 overhead => 8
    expect(tokens).toBe(8);
  });

  it('handles messages with toolResult content array', () => {
    const msg: Message = {
      role: 'toolResult',
      toolCallId: 'call123',
      toolName: 'test',
      content: [{ type: 'text', text: 'Line1' }, { type: 'text', text: 'Line2' }],
      timestamp: Date.now(),
    };
    const tokens = estimateContextTokens({ messages: [msg] });
    // "Line1" length 5 -> 2, "Line2" length 5 -> 2, total 4 plus 5 overhead => 9
    expect(tokens).toBe(9);
  });
});
