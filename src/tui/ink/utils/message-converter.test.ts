/** Unit tests for message-converter utility */
import { describe, it, expect } from 'vitest';
import { agentMessageToUiMessage, type UIMessage } from './message-converter';

describe('agentMessageToUiMessage', () => {
  describe('user messages', () => {
    it('should convert string content', () => {
      const msg = { role: 'user', content: 'Hello', id: 'u1', timestamp: 123 };
      const result = agentMessageToUiMessage(msg);
      expect(result).toEqual({
        id: 'u1',
        role: 'user',
        content: 'Hello',
        timestamp: 123,
      });
    });

    it('should convert array content with text blocks', () => {
      const msg = {
        role: 'user',
        content: [{ type: 'text', text: 'Part1' }, { type: 'text', text: 'Part2' }],
        id: 'u2',
        timestamp: 456,
      };
      const result = agentMessageToUiMessage(msg);
      expect(result?.content).toBe('Part1Part2');
    });

    it('should handle empty/null content', () => {
      const msg = { role: 'user', content: null, id: 'u3', timestamp: 789 };
      const result = agentMessageToUiMessage(msg);
      expect(result?.content).toBe('');
    });

    it('should return null for invalid message', () => {
      expect(agentMessageToUiMessage(null)).toBeNull();
      expect(agentMessageToUiMessage(undefined)).toBeNull();
      expect(agentMessageToUiMessage({})).toBeNull();
    });
  });

  describe('assistant messages', () => {
    it('should convert simple text content', () => {
      const msg = { role: 'assistant', content: 'Response', id: 'a1', timestamp: 100 };
      const result = agentMessageToUiMessage(msg);
      expect(result?.role).toBe('assistant');
      expect(result?.content).toBe('Response');
    });

    it('should extract thinking blocks', () => {
      const msg = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Final answer' },
          { type: 'thinking', thinking: 'I need to analyze' },
        ],
        id: 'a2',
        timestamp: 200,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.content).toBe('Final answer');
      expect(result.thinkingBlocks).toContain('I need to analyze');
    });

    it('should extract multiple thinking blocks', () => {
      const msg = {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'Thought 1' },
          { type: 'text', text: 'Answer' },
          { type: 'thinking', thinking: 'Thought 2' },
        ],
        id: 'a3',
        timestamp: 300,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.thinkingBlocks).toHaveLength(2);
      expect(result.thinkingBlocks).toContain('Thought 1');
      expect(result.thinkingBlocks).toContain('Thought 2');
    });

    it('should extract tool calls', () => {
      const msg = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Reading file' },
          { type: 'toolCall', name: 'read', arguments: { path: 'test.txt' }, id: 'call1' },
        ],
        id: 'a4',
        timestamp: 400,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].name).toBe('read');
      expect(result.toolCalls![0].arguments).toEqual({ path: 'test.txt' });
      expect(result.toolCalls![0].status).toBe('pending');
    });

    it('should handle mixed text, thinking, and tool calls', () => {
      const msg = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will read the file.' },
          { type: 'toolCall', name: 'read', arguments: { path: 'a.txt' }, id: 'c1' },
          { type: 'thinking', thinking: 'This might fail' },
        ],
        id: 'a5',
        timestamp: 500,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.content).toBe('I will read the file.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.thinkingBlocks).toContain('This might fail');
    });
  });

  describe('tool messages', () => {
    it('should convert array content to text', () => {
      const msg = {
        role: 'tool',
        content: [{ type: 'text', text: 'Tool result' }],
        id: 't1',
        timestamp: 600,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.role).toBe('tool');
      expect(result.content).toBe('Tool result');
    });

    it('should convert string content', () => {
      const msg = { role: 'tool', content: 'Simple result', id: 't2', timestamp: 700 };
      const result = agentMessageToUiMessage(msg);
      expect(result?.content).toBe('Simple result');
    });
  });

  describe('bashExecution messages', () => {
    it('should convert bashExecution with all fields', () => {
      const msg = {
        role: 'bashExecution',
        command: 'ls -la',
        output: 'file.txt',
        exitCode: 0,
        cancelled: false,
        truncated: false,
        id: 'b1',
        timestamp: 800,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.role).toBe('bashExecution');
      expect((result as any).bashCommand).toBe('ls -la');
      expect((result as any).bashOutput).toBe('file.txt');
      expect((result as any).bashExitCode).toBe(0);
      expect((result as any).bashCancelled).toBe(false);
      expect(result.content).toBe('');
    });

    it('should handle non-zero exit code', () => {
      const msg = {
        role: 'bashExecution',
        command: 'false',
        output: '',
        exitCode: 1,
        cancelled: false,
        truncated: false,
        id: 'b2',
        timestamp: 900,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect((result as any).bashExitCode).toBe(1);
    });
  });

  describe('compactionSummary messages', () => {
    it('should convert with summary and tokensBefore', () => {
      const msg = {
        role: 'compactionSummary',
        summary: 'Compacted 100 messages',
        tokensBefore: 15000,
        id: 'c1',
        timestamp: 1000,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.role).toBe('compactionSummary');
      expect(result.content).toBe('Compacted 100 messages');
      expect((result as any).tokensBefore).toBe(15000);
    });

    it('should fallback to content if no summary', () => {
      const msg = {
        role: 'compactionSummary',
        content: 'Compact info',
        id: 'c2',
        timestamp: 1100,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.content).toBe('Compact info');
    });
  });

  describe('branchSummary messages', () => {
    it('should convert with summary and fromId', () => {
      const msg = {
        role: 'branchSummary',
        summary: 'Branch created from main',
        fromId: 'branch-xyz',
        id: 'br1',
        timestamp: 1200,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.role).toBe('branchSummary');
      expect(result.content).toBe('Branch created from main');
      expect((result as any).fromId).toBe('branch-xyz');
    });
  });

  describe('custom messages', () => {
    it('should convert with customType and JSON content', () => {
      const msg = {
        role: 'custom',
        customType: 'my-extension',
        content: { key: 'value', count: 42 },
        id: 'cx1',
        timestamp: 1300,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.role).toBe('custom');
      expect(result.customType).toBe('my-extension');
      expect(result.content).toBe('{"key":"value","count":42}');
    });

    it('should convert with string content', () => {
      const msg = {
        role: 'custom',
        customType: 'simple',
        content: 'Plain text',
        id: 'cx2',
        timestamp: 1400,
      };
      const result = agentMessageToUiMessage(msg) as UIMessage;
      expect(result.content).toBe('Plain text');
    });
  });

  describe('edge cases', () => {
    it('should handle messages without id by generating one', () => {
      const msg = { role: 'user', content: 'Test', timestamp: 1500 };
      const result = agentMessageToUiMessage(msg);
      expect(result?.id).toMatch(/^msg-/);
    });

    it('should handle messages without timestamp', () => {
      const msg = { role: 'user', content: 'Test', id: 'fixed' };
      const result = agentMessageToUiMessage(msg);
      expect(result?.timestamp).toBeGreaterThan(0);
    });

    it('should ignore unknown roles', () => {
      const msg = { role: 'unknown', content: 'Test', id: 'u' };
      const result = agentMessageToUiMessage(msg);
      expect(result).toBeNull();
    });
  });
});
