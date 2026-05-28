// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for convertSessionMessagesToLlm.
 *
 * Tests all message type conversions: standard pass-through, bashExecution, branchSummary,
 * compactionSummary, custom, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { convertSessionMessagesToLlm } from './convert-to-llm.js';

describe('convertSessionMessagesToLlm', () => {
  it('passes through standard user messages', () => {
    const msgs = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: 123 },
    ];
    const result = convertSessionMessagesToLlm(msgs);
    expect(result).toEqual(msgs);
  });

  it('passes through standard assistant messages', () => {
    const msgs = [
      { role: 'assistant', content: [{ type: 'text', text: 'Hi' }], timestamp: 123 },
    ];
    const result = convertSessionMessagesToLlm(msgs);
    expect(result).toEqual(msgs);
  });

  it('passes through toolResult messages', () => {
    const msgs = [
      { role: 'toolResult', content: [{ type: 'text', text: 'Result' }], timestamp: 123 },
    ];
    const result = convertSessionMessagesToLlm(msgs);
    expect(result).toEqual(msgs);
  });

  it('converts bashExecution to user message', () => {
    const bashMsg = {
      role: 'bashExecution',
      command: 'ls -la',
      output: 'file1\nfile2',
      exitCode: 0,
      cancelled: false,
      truncated: false,
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([bashMsg]);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toEqual([{ type: 'text', text: expect.stringContaining('Ran `ls -la`') }]);
    expect(result[0].content[0].text).toContain('file1');
  });

  it('excludes bashExecution when excludeFromContext is true', () => {
    const bashMsg = {
      role: 'bashExecution',
      command: 'rm -rf',
      output: '',
      exitCode: 0,
      cancelled: false,
      truncated: false,
      excludeFromContext: true,
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([bashMsg]);
    expect(result.length).toBe(0);
  });

  it('converts branchSummary to user message with prefix', () => {
    const branchMsg = {
      role: 'branchSummary',
      summary: 'We explored option A',
      fromId: 'abc123',
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([branchMsg]);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('user');
    const text = result[0].content[0].text;
    expect(text).toContain('The following is a summary of a branch');
    expect(text).toContain('<summary>');
    expect(text).toContain('We explored option A');
    expect(text).toContain('</summary>');
  });

  it('converts compactionSummary to user message with prefix', () => {
    const compMsg = {
      role: 'compactionSummary',
      summary: 'Compacted 20 messages',
      tokensBefore: 1500,
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([compMsg]);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('user');
    const text = result[0].content[0].text;
    expect(text).toContain('The conversation history before this point was compacted');
    expect(text).toContain('<summary>');
    expect(text).toContain('Compacted 20 messages');
    expect(text).toContain('</summary>');
  });

  it('converts custom message with string content', () => {
    const customMsg = {
      role: 'custom',
      customType: 'note',
      content: 'Important note',
      display: true,
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([customMsg]);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toEqual([{ type: 'text', text: 'Important note' }]);
  });

  it('converts custom message with TextContent[]', () => {
    const customMsg = {
      role: 'custom',
      customType: 'rich',
      content: [
        { type: 'text', text: 'Part1' },
        { type: 'code', text: 'code', language: 'ts' },
      ],
      display: false,
      timestamp: 123,
    };
    const result = convertSessionMessagesToLlm([customMsg]);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toEqual(customMsg.content);
  });

  it('filters out unknown roles', () => {
    const unknownMsg = { role: 'unknown' as any, timestamp: 123 };
    const result = convertSessionMessagesToLlm([unknownMsg]);
    expect(result.length).toBe(0);
  });

  it('handles mixed message types', () => {
    const msgs = [
      { role: 'user', content: 'hi', timestamp: 1 },
      { role: 'bashExecution', command: 'pwd', output: '/home', exitCode: 0, cancelled: false, truncated: false, timestamp: 2 },
      { role: 'assistant', content: 'ok', timestamp: 3 },
      { role: 'compactionSummary', summary: 'compaction', tokensBefore: 100, timestamp: 4 },
      { role: 'toolResult', content: 'done', timestamp: 5 },
    ];
    const result = convertSessionMessagesToLlm(msgs);
    // All 5 are valid roles (bashExecution and compactionSummary are converted to user)
    expect(result.length).toBe(5);
    const roles = result.map(r => r.role);
    expect(roles).toContain('user');
    expect(roles).toContain('assistant');
    expect(roles).toContain('toolResult');
  });

  it('preserves timestamp on conversion', () => {
    const now = Date.now();
    const bashMsg = {
      role: 'bashExecution',
      command: 'date',
      output: now.toString(),
      exitCode: 0,
      cancelled: false,
      truncated: false,
      timestamp: now,
    };
    const result = convertSessionMessagesToLlm([bashMsg]);
    expect(result[0].timestamp).toBe(now);
  });
});