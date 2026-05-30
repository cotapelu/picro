// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { convertSessionMessagesToLlm } from './convert-to-llm.js';
import type { Message } from '../llm/index.js';

describe('convertSessionMessagesToLlm', () => {
  describe('standard messages pass through', () => {
    it('passes through user messages', () => {
      const userMsg: Message = {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([userMsg]);
      expect(result).toEqual([userMsg]);
    });

    it('passes through assistant messages', () => {
      const assistantMsg: Message = {
        role: 'assistant',
        content: 'Hi there',
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([assistantMsg]);
      expect(result).toEqual([assistantMsg]);
    });

    it('passes through toolResult messages', () => {
      const toolMsg: Message = {
        role: 'toolResult',
        content: 'Tool output',
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([toolMsg]);
      expect(result).toEqual([toolMsg]);
    });
  });

  describe('bashExecution conversion', () => {
    it('converts basic bash execution', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: 'ls -la',
        output: 'file1\nfile2',
        exitCode: 0,
        cancelled: false,
        truncated: false,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toEqual([
        { type: 'text', text: 'Ran `ls -la`\n```\nfile1\nfile2\n```' },
      ]);
    });

    it('handles no output', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: 'echo test',
        output: '',
        exitCode: 0,
        cancelled: false,
        truncated: false,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result[0].content[0].text).toContain('(no output)');
    });

    it('appends cancelled message when cancelled', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: 'sleep 10',
        output: '',
        exitCode: undefined,
        cancelled: true,
        truncated: false,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result[0].content[0].text).toContain('(command cancelled)');
    });

    it('appends exit code when non-zero', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: 'false',
        output: '',
        exitCode: 1,
        cancelled: false,
        truncated: false,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result[0].content[0].text).toContain('exited with code 1');
    });

    it('skips when excludeFromContext is true', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: '!!cmd',
        output: 'output',
        exitCode: 0,
        cancelled: false,
        truncated: false,
        excludeFromContext: true,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result).toHaveLength(0);
    });

    it('includes truncation notice with fullOutputPath', () => {
      const bashMsg = {
        role: 'bashExecution' as const,
        command: 'cat largefile',
        output: 'partial',
        exitCode: 0,
        cancelled: false,
        truncated: true,
        fullOutputPath: '/tmp/full.log',
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([bashMsg]);
      expect(result[0].content[0].text).toContain('Full output: /tmp/full.log');
    });
  });

  describe('branchSummary conversion', () => {
    it('converts branch summary with prefix and suffix', () => {
      const branchMsg = {
        role: 'branchSummary' as const,
        summary: 'User asked about weather',
        fromId: 'msg-123',
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([branchMsg]);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      const text = result[0].content[0].text;
      expect(text).toContain('summary of a branch');
      expect(text).toContain('User asked about weather');
    });
  });

  describe('compactionSummary conversion', () => {
    it('converts compaction summary with prefix and suffix', () => {
      const compactionMsg = {
        role: 'compactionSummary' as const,
        summary: 'Discussed project goals',
        tokensBefore: 1500,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([compactionMsg]);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      const text = result[0].content[0].text;
      expect(text).toContain('conversation history before this point was compacted');
      expect(text).toContain('Discussed project goals');
    });
  });

  describe('custom message conversion', () => {
    it('converts string content', () => {
      const customMsg = {
        role: 'custom' as const,
        customType: 'note',
        content: 'This is a custom note',
        display: true,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([customMsg]);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toEqual([{ type: 'text', text: 'This is a custom note' }]);
    });

    it('converts TextContent[] array', () => {
      const customMsg = {
        role: 'custom' as const,
        customType: 'rich',
        content: [
          { type: 'text' as const, text: 'Part 1' },
          { type: 'text' as const, text: 'Part 2' },
        ],
        display: true,
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([customMsg]);
      expect(result[0].content).toEqual([
        { type: 'text', text: 'Part 1' },
        { type: 'text', text: 'Part 2' },
      ]);
    });
  });

  describe('mixed messages', () => {
    it('preserves order and filters correctly', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: 1 },
        { role: 'bashExecution', command: 'ls', output: 'files', exitCode: 0, cancelled: false, truncated: false, timestamp: 2 },
        { role: 'assistant', content: 'Hi', timestamp: 3 },
        { role: 'branchSummary', summary: 'Branch summary', fromId: 'x', timestamp: 4 },
        { role: 'custom', customType: 'test', content: 'custom', display: true, timestamp: 5 },
        { role: 'unknown', timestamp: 6 }, // should be filtered
      ];
      const result = convertSessionMessagesToLlm(messages);
      expect(result).toHaveLength(5);
      expect(result[0].role).toBe('user'); // original user
      expect(result[1].role).toBe('user'); // bash converted
      expect(result[2].role).toBe('assistant'); // original assistant
      expect(result[3].role).toBe('user'); // branch converted
      expect(result[4].role).toBe('user'); // custom converted
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      const result = convertSessionMessagesToLlm([]);
      expect(result).toEqual([]);
    });

    it('handles messages with missing optional fields gracefully', () => {
      const customMsg = {
        role: 'custom' as const,
        customType: 'test',
        content: 'text',
        // display missing (optional)
        timestamp: Date.now(),
      };
      const result = convertSessionMessagesToLlm([customMsg]);
      expect(result[0].role).toBe('user');
    });
  });
});
