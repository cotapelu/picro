// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests: session resume must keep tool results in the LLM context.
 *
 * AgentSession persists ConversationTurn-shaped tool turns (role: 'tool').
 * convertSessionMessagesToLlm() used to drop them, so resuming a session
 * produced a context with assistant toolCall blocks but no matching
 * toolResult: the model lost every tool output from the previous turns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager } from './session-manager.js';
import { convertSessionMessagesToLlm } from './convert-to-llm.js';

describe('convertSessionMessagesToLlm - tool turns', () => {
  it('keeps tool turns as toolResult messages', () => {
    const converted = convertSessionMessagesToLlm([
      { role: 'tool', toolCallId: 'c1', toolName: 'ls', content: [{ type: 'text', text: 'file1.txt' }], isError: false, timestamp: 1 },
    ] as any);

    expect(converted).toHaveLength(1);
    expect(converted[0].role).toBe('toolResult');
    expect((converted[0] as any).toolCallId).toBe('c1');
    expect((converted[0] as any).toolName).toBe('ls');
    expect((converted[0] as any).isError).toBe(false);
    expect((converted[0] as any).content).toEqual([{ type: 'text', text: 'file1.txt' }]);
  });

  it('normalizes string content and default error flag', () => {
    const converted = convertSessionMessagesToLlm([
      { role: 'tool', toolCallId: 'c2', toolName: 'bash', content: 'raw output', timestamp: 2 },
    ] as any);

    expect((converted[0] as any).content).toEqual([{ type: 'text', text: 'raw output' }]);
    expect((converted[0] as any).isError).toBe(false);
  });

  it('passes through messages that already use the LLM toolResult shape', () => {
    const existing = {
      role: 'toolResult',
      toolCallId: 'c3',
      toolName: 'read',
      content: [{ type: 'text', text: 'ok' }],
      isError: false,
      timestamp: 3,
    };
    const converted = convertSessionMessagesToLlm([existing] as any);

    expect(converted[0]).toBe(existing);
  });
});

describe('buildSessionContext - tool results survive a reload', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'picro-session-toolturn-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps tool results when a session is reopened from disk', () => {
    const sm = SessionManager.create('/tmp', dir);

    sm.appendMessage({
      role: 'user',
      content: [{ type: 'text', text: 'list files' }],
      timestamp: Date.now(),
    } as any);
    sm.appendMessage({
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'c1', name: 'ls', arguments: {} }],
      stopReason: 'toolUse',
      timestamp: Date.now(),
    } as any);
    sm.appendMessage({
      role: 'tool',
      toolCallId: 'c1',
      toolName: 'ls',
      content: [{ type: 'text', text: 'file1.txt' }],
      isError: false,
      timestamp: Date.now(),
    } as any);

    const reopened = SessionManager.open(sm.getSessionFile()!, dir);
    const context = reopened.buildSessionContext();
    const roles = context.messages.map((m: any) => m.role);

    expect(roles).toEqual(['user', 'assistant', 'toolResult']);
  });
});
