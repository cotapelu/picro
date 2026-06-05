import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformMessages, transformAssistantMessages } from './transform-messages.js';

function createUser(content: string | Array<{ type: string; text?: string }>): any {
  return { role: 'user', content: typeof content === 'string' ? [{ type: 'text', text: content }] : content };
}

function createAssistant(content: Array<{ type: string; text?: string; thinking?: string; id?: string; name?: string; arguments?: any }>, stopReason?: string): any {
  return { role: 'assistant', content, stopReason };
}

function createToolCall(id: string, name: string, args?: any): any {
  return { type: 'toolCall', id, name, arguments: args };
}

function createToolResult(toolCallId: string, toolName: string, text: string = 'result', isError = false): any {
  return { role: 'toolResult', toolCallId, toolName, content: [{ type: 'text', text }], isError, timestamp: Date.now() };
}

describe('transformMessages', () => {
  beforeEach(() => {
    // no global mocks needed
  });

  it('passes through user and assistant without tool calls', () => {
    const messages = [
      createUser('Hello'),
      createAssistant([{ type: 'text', text: 'Hi' }]),
    ];
    const result = transformMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(createUser('Hello'));
    expect(result[1]).toEqual(createAssistant([{ type: 'text', text: 'Hi' }]));
  });

  describe('synthetic tool result insertion', () => {
    it('inserts synthetic toolResult for missing result after assistant tool call before next user', () => {
      const messages = [
        createUser('Call tool'),
        createAssistant([createToolCall('call_1', 'test_tool', { arg: 1 })]),
        createUser('Thanks'),
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(messages[0]);
      expect(result[1]).toEqual(messages[1]); // assistant content unchanged
      expect(result[2].role).toBe('toolResult');
      expect(result[2].toolCallId).toBe('call_1');
      expect(result[2].toolName).toBe('test_tool');
      expect(result[2].content).toEqual([{ type: 'text', text: 'No result provided' }]);
      expect(result[3]).toEqual(messages[2]);
    });

    it('does not duplicate toolResult if real result already present', () => {
      const realToolResult = createToolResult('call_1', 'test_tool', 'real result');
      const messages = [
        createUser('Call tool'),
        createAssistant([createToolCall('call_1', 'test_tool')]),
        realToolResult,
        createUser('Next'),
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(4);
      const synthetic = result.find(r => r.role === 'toolResult' && r.toolCallId === 'call_1' && r.content[0].text === 'No result provided');
      expect(synthetic).toBeUndefined();
      // The original toolResult should appear unchanged (same reference)
      expect(result[2]).toBe(realToolResult);
    });

    it('handles multiple pending tool calls', () => {
      const messages = [
        createUser('Do both'),
        createAssistant([
          createToolCall('call_1', 'toolA'),
          createToolCall('call_2', 'toolB'),
        ]),
        createUser('After'),
      ];
      const result = transformMessages(messages);
      const toolResults = result.filter(r => r.role === 'toolResult');
      expect(toolResults).toHaveLength(2);
      expect(toolResults[0].toolCallId).toBe('call_1');
      expect(toolResults[1].toolCallId).toBe('call_2');
    });

    it('inserts pending tool results at end of conversation', () => {
      const messages = [
        createUser('Start'),
        createAssistant([createToolCall('call_end', 'last_tool')]),
      ];
      const result = transformMessages(messages);
      const toolResults = result.filter(r => r.role === 'toolResult');
      expect(toolResults).toHaveLength(1);
      expect(toolResults[0].toolCallId).toBe('call_end');
      expect(toolResults[0].timestamp).toBeDefined();
    });
  });

  describe('tool ID normalization', () => {
    it('normalizes tool call ID containing pipe', () => {
      const messages = [
        createAssistant([{ type: 'toolCall', id: 'call_abc|extra', name: 'toolX', arguments: {} }]),
      ];
      const result = transformMessages(messages);
      const asst = result[0];
      const toolCall = asst.content.find((b: any) => b.type === 'toolCall');
      expect(toolCall.id).toBe('call_abc'); // normalized (split on |)
    });

    it('preserves already clean tool IDs', () => {
      const messages = [
        createAssistant([{ type: 'toolCall', id: 'clean_id_123', name: 'tool', arguments: {} }]),
      ];
      const result = transformMessages(messages);
      const asst = result[0];
      const toolCall = asst.content.find((b: any) => b.type === 'toolCall');
      expect(toolCall.id).toBe('clean_id_123');
    });
  });

  describe('thinking block conversion', () => {
    it('converts thinking block to truncated text block', () => {
      const longThought = 'a'.repeat(500);
      const messages = [
        createAssistant([{ type: 'thinking', thinking: longThought }]),
      ];
      const result = transformMessages(messages);
      const asst = result[0];
      const textBlock = asst.content.find((b: any) => b.type === 'text');
      expect(textBlock).toBeDefined();
      expect(textBlock.text).toBe(`[Thinking: ${longThought.slice(0, 200)}...]`);
    });
  });

  describe('skip assistant with error/aborted', () => {
    it('skips assistant with stopReason error', () => {
      const messages = [
        createAssistant([{ type: 'text', text: 'Oops' }], 'error'),
        createUser('Continue'),
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(createUser('Continue'));
    });

    it('skips assistant with stopReason aborted', () => {
      const messages = [
        createAssistant([{ type: 'text', text: 'Stopped' }], 'aborted'),
        createUser('Next'),
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });

    it('clears pending tool calls when skipping assistant', () => {
      const messages = [
        createAssistant([createToolCall('call_skip', 'tool')], 'error'),
        createUser('After'),
      ];
      const result = transformMessages(messages);
      expect(result.filter(r => r.role === 'toolResult')).toHaveLength(0);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });
  });

  describe('complex sequences', () => {
    it('handles interleaved tool calls and results', () => {
      const real1 = createToolResult('c1', 't1', 'res1');
      const messages = [
        createUser('A'),
        createAssistant([createToolCall('c1', 't1')]),
        real1,
        createUser('B'),
        createAssistant([createToolCall('c2', 't2')]),
        createUser('C'),
      ];
      const result = transformMessages(messages);
      const toolResults = result.filter(r => r.role === 'toolResult');
      // real result for c1 and synthetic for c2
      expect(toolResults).toHaveLength(2);
      expect(toolResults[0]).toBe(real1);
      expect(toolResults[1].toolCallId).toBe('c2');
      expect(toolResults[1].content[0].text).toBe('No result provided');
    });

    it('handles multiple assistant without tool calls', () => {
      const messages = [
        createAssistant([{ type: 'text', text: 'Hello' }]),
        createUser('Hi'),
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(2);
    });
  });

  describe('timestamp assignment', () => {
    it('assigns a timestamp to synthetic toolResult messages', () => {
      const fixed = 123456789;
      vi.spyOn(Date, 'now').mockReturnValue(fixed);
      const messages = [
        createUser('x'),
        createAssistant([createToolCall('id1', 't1')]),
        createUser('y'),
      ];
      const result = transformMessages(messages);
      const synth = result.find(r => r.role === 'toolResult');
      expect(synth.timestamp).toBe(fixed);
      vi.restoreAllMocks();
    });
  });
});

describe('transformAssistantMessages', () => {
  it('filters out assistant messages with no meaningful content', () => {
    const messages = [
      createUser('Hello'),
      createAssistant([{ type: 'text', text: '' }]),
      createAssistant([{ type: 'text', text: '   ' }]),
      createAssistant([]),
      createAssistant([{ type: 'thinking', thinking: '   ' }]),
      createUser('World'),
    ];
    const result = transformAssistantMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(messages[0]);
    expect(result[1]).toBe(messages[5]);
  });

  it('keeps assistant messages with meaningful text or other blocks', () => {
    const messages = [
      createAssistant([{ type: 'text', text: 'Ok' }]),
      createAssistant([{ type: 'thinking', thinking: 'Reasoning' }]),
      createAssistant([createToolCall('c', 't', {})]),
    ];
    const result = transformAssistantMessages(messages);
    expect(result).toHaveLength(3);
  });
});
