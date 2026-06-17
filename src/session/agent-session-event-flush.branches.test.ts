// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for AgentSession private methods:
 * - _convertAgentEventToExtensionEvent
 * - _flushPendingBashMessages
 * - _getUserMessageText
 * - _handleRetryableError
 * - _resolveRetry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from './agent-session.js';
import type { Agent } from '../agent/types.js';
import type { Model } from '../llm/index.js';

// Minimal helper to construct AgentSession with mocked dependencies
function buildSession(overrides: any = {}) {
  const agent: Agent = {
    subscribe: vi.fn().mockReturnValue(() => {}),
    registerTool: vi.fn(),
    setModel: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockReturnValue({}),
    // other agent methods not needed for tests
  } as any;

  const sessionManager = {
    appendMessage: vi.fn(),
    // other methods can be undefined unless used
  } as any;

  const settingsManager = {
    getCompactionSettings: vi.fn().mockReturnValue({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 }),
    getRetrySettings: vi.fn().mockReturnValue({ enabled: true, maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 60000 }),
  } as any;

  const resourceLoader = {
    getAgentsFiles: vi.fn().mockReturnValue({ agentsFiles: [] }),
    getSkills: vi.fn().mockReturnValue({ skills: [] }),
    getAppendSystemPrompt: vi.fn().mockReturnValue([]),
  } as any;

  const modelRegistry = {
    hasConfiguredAuth: vi.fn().mockReturnValue(true),
    getApiKeyAndHeaders: vi.fn().mockResolvedValue({ ok: true, apiKey: 'key', headers: {} }),
  } as any;

  const config = {
    agent,
    sessionManager,
    settingsManager,
    resourceLoader,
    modelRegistry,
    cwd: '/tmp',
    ...overrides.configOverrides,
  };

  const session = new AgentSession(config);

  // Apply direct state overrides
  if (overrides._model) (session as any)._model = overrides._model;
  if (overrides._agentState) (session as any)._agentState = overrides._agentState;
  if (overrides._eventListeners) (session as any)._eventListeners = overrides._eventListeners;
  if (overrides._pendingBashMessages !== undefined) (session as any)._pendingBashMessages = overrides._pendingBashMessages;
  if (overrides._retryAttempt !== undefined) (session as any)._retryAttempt = overrides._retryAttempt;
  if (overrides._retryAbortController !== undefined) (session as any)._retryAbortController = overrides._retryAbortController;
  if (overrides._retryPromise !== undefined) (session as any)._retryPromise = overrides._retryPromise;
  if (overrides._retryResolve !== undefined) (session as any)._retryResolve = overrides._retryResolve;

  return session;
}

// Helper to access private conversion method
function convertEvent(session: AgentSession, event: any) {
  return (session as any)._convertAgentEventToExtensionEvent(event);
}

describe('AgentSession._convertAgentEventToExtensionEvent', () => {
  let session: AgentSession;
  beforeEach(() => {
    session = buildSession();
    (session as any)._agentState = { history: [] };
    (session as any)._model = { id: 'gpt-4', provider: 'openai' } as Model;
  });

  it('converts agent:start', () => {
    const event = { type: 'agent:start', initialPrompt: 'prompt' };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'agent_start', prompt: 'prompt', model: (session as any)._model });
  });

  it('converts agent:end with success', () => {
    (session as any)._agentState = { history: [{ role: 'user', content: 'hi' }] };
    const event = { type: 'agent:end', result: { success: true } };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'agent_end', messages: (session as any)._agentState.history, success: true });
  });

  it('converts agent:end without result', () => {
    (session as any)._agentState = { history: [{ role: 'assistant', content: 'ok' }] };
    const event = { type: 'agent:end' };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'agent_end', messages: (session as any)._agentState.history, success: undefined });
  });

  it('converts turn:start', () => {
    const event = { type: 'turn:start', round: 2, promptLength: 123 };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'turn_start', round: 2, promptLength: 123 });
  });

  it('converts turn:end', () => {
    const event = { type: 'turn:end', round: 3, toolCallsExecuted: 2 };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'turn_end', round: 3, toolCallsExecuted: 2 });
  });

  it('converts message:start', () => {
    const turn = { role: 'user', content: 'hello' };
    const event = { type: 'message:start', turn };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'message_start', turn });
  });

  it('converts message:end', () => {
    const turn = { role: 'assistant', content: [{ type: 'text', text: 'ok' }] };
    const event = { type: 'message:end', turn };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'message_end', turn });
  });

  it('converts tool:call:start', () => {
    const event = { type: 'tool:call:start', toolName: 'bash', toolCallId: 'c1', arguments: { cmd: 'ls' } };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'tool_call', toolName: 'bash', toolCallId: 'c1', input: { cmd: 'ls' } });
  });

  it('converts tool:call:end with result', () => {
    const result = { toolName: 'bash', toolCallId: 'c1', result: 'file1', isError: false };
    const event = { type: 'tool:call:end', result };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'tool_result', toolName: 'bash', toolCallId: 'c1', result: 'file1', isError: false });
  });

  it('converts tool:call:end with error', () => {
    const result = { toolName: 'bash', toolCallId: 'c1', error: 'fail', isError: true };
    const event = { type: 'tool:call:end', result };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'tool_result', toolName: 'bash', toolCallId: 'c1', result: 'fail', isError: true });
  });

  it('converts memory:retrieve', () => {
    const event = { type: 'memory:retrieve', query: 'test', memoriesRetrieved: [{ content: 'mem' }] };
    const out = convertEvent(session, event);
    expect(out).toEqual({ type: 'memory_retrieve', query: 'test', memoriesRetrieved: [{ content: 'mem' }] });
  });

  it('returns undefined for unknown event type', () => {
    const out = convertEvent(session, { type: 'unknown' });
    expect(out).toBeUndefined();
  });
});

describe('AgentSession._flushPendingBashMessages', () => {
  let session: AgentSession;
  beforeEach(() => {
    session = buildSession();
    (session as any)._agentState = { history: [] };
    (session as any).sessionManager = { appendMessage: vi.fn() } as any;
  });

  it('early returns when no pending messages', () => {
    (session as any)._pendingBashMessages = [];
    (session as any)._flushPendingBashMessages();
    expect((session as any).sessionManager.appendMessage).not.toHaveBeenCalled();
  });

  it('appends each pending message and clears array', () => {
    const pending = [
      { role: 'toolResult', content: [{ type: 'text', text: 'out1' }], toolCallId: 'c1' },
      { role: 'toolResult', content: [{ type: 'text', text: 'out2' }], toolCallId: 'c2' },
    ] as any[];
    (session as any)._pendingBashMessages = pending;
    (session as any)._flushPendingBashMessages();
    expect((session as any).sessionManager.appendMessage).toHaveBeenCalledTimes(2);
    expect((session as any)._pendingBashMessages).toEqual([]);
  });
});

describe('AgentSession._getUserMessageText', () => {
  let session: AgentSession;
  beforeEach(() => {
    session = buildSession();
  });

  it('returns empty string for non-user role', () => {
    const msg = { role: 'assistant', content: 'hi' };
    expect((session as any)._getUserMessageText(msg)).toBe('');
  });

  it('returns string content directly', () => {
    const msg = { role: 'user', content: 'hello world' };
    expect((session as any)._getUserMessageText(msg)).toBe('hello world');
  });

  it('extracts and concatenates text blocks from content array', () => {
    const msg = {
      role: 'user',
      content: [
        { type: 'text', text: 'part1' },
        { type: 'image', image: 'abc' },
        { type: 'text', text: 'part2' },
      ],
    };
    expect((session as any)._getUserMessageText(msg)).toBe('part1part2');
  });

  it('handles empty content array', () => {
    const msg = { role: 'user', content: [] };
    expect((session as any)._getUserMessageText(msg)).toBe('');
  });
});

describe('AgentSession._handleRetryableError', () => {
  let session: AgentSession;
  beforeEach(() => {
    session = buildSession();
    (session as any)._retryAttempt = 0;
    (session as any)._retryAbortController = undefined;
    (session as any)._emit = vi.fn();
    (session as any).settingsManager = {
      getRetrySettings: () => ({ enabled: true, maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 60000 }),
    } as any;
  });

  it('returns false if retry disabled', async () => {
    (session as any).settingsManager.getRetrySettings = () => ({ enabled: false, maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 60000 });
    const didRetry = await (session as any)._handleRetryableError({ errorMessage: 'overloaded' });
    expect(didRetry).toBe(false);
  });

  it('returns false when max retries reached', async () => {
    (session as any)._retryAttempt = 3;
    const didRetry = await (session as any)._handleRetryableError({ errorMessage: 'overloaded' });
    expect(didRetry).toBe(false);
  });

  it('performs a retry and returns true', async () => {
    vi.useFakeTimers();
    const retryPromise = (session as any)._handleRetryableError({ errorMessage: 'overloaded' });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await retryPromise;
    vi.useRealTimers();
    expect(result).toBe(true);
    expect((session as any)._retryAttempt).toBe(1);
    expect((session as any)._emit).toHaveBeenCalledWith({
      type: 'auto_retry_start',
      attempt: 1,
      maxAttempts: 3,
      delayMs: 1000,
      errorMessage: 'overloaded',
    });
  });

  // Note: abort scenario requires interacting with abortRetry(); omitted for now.
});

describe('AgentSession._resolveRetry', () => {
  let session: AgentSession;
  beforeEach(() => {
    session = buildSession();
    (session as any)._retryPromise = undefined;
    (session as any)._retryResolve = undefined;
  });

  it('resolves the pending retry promise and clears fields', () => {
    const resolveMock = vi.fn();
    (session as any)._retryPromise = Promise.resolve();
    (session as any)._retryResolve = resolveMock;
    (session as any)._resolveRetry();
    expect(resolveMock).toHaveBeenCalled();
    expect((session as any)._retryPromise).toBeUndefined();
    expect((session as any)._retryResolve).toBeUndefined();
  });

  it('noop when no retry in progress', () => {
    (session as any)._retryPromise = undefined;
    (session as any)._retryResolve = undefined;
    expect(() => { (session as any)._resolveRetry(); }).not.toThrow();
  });
});
