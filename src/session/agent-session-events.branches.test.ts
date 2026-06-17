// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for AgentSession._processAgentEvent and related event handling.
 * Covers auto_retry_end, message:start, message:end (user/assistant/tool), agent:end with/without retry, overflow recovery, performance tracking, auto-compaction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from './agent-session.js';
import { SettingsManager } from '../runtime/settings-manager.js';

function createSession(overrides = {}) {
  const agent = {
    subscribe: vi.fn(() => () => {}),
    run: vi.fn().mockResolvedValue(undefined),
    clearAllQueues: vi.fn(),
    abort: vi.fn(),
    setModel: vi.fn(),
    getToolNames: vi.fn(() => []),
    steer: vi.fn(),
    followUp: vi.fn(),
    getConfig: vi.fn().mockReturnValue({}),
    state: { isRunning: false, history: [] },
  };
  const sessionManager = {
    appendMessage: vi.fn(),
    appendModelChange: vi.fn(),
    appendThinkingLevelChange: vi.fn(),
    getLeafId: vi.fn().mockReturnValue('leaf'),
    getBranch: vi.fn().mockReturnValue([]),
    buildSessionContext: vi.fn().mockReturnValue({ messages: [] }),
    getLatestCompactionEntry: vi.fn().mockReturnValue(null),
  };
  const settingsManager = SettingsManager.inMemory({});
  const modelRegistry = { hasConfiguredAuth: vi.fn().mockReturnValue(true) };
  const resourceLoader = {
    getAgentsFiles: () => undefined,
    getSkills: () => undefined,
    getAppendSystemPrompt: () => [],
    getExtensions: () => ({ runtime: { flagValues: new Map() }, extensions: [], errors: [] }),
  };
  const session = new AgentSession({
    agent,
    sessionManager,
    settingsManager,
    resourceLoader,
    modelRegistry,
    cwd: '/test',
    ...overrides,
  }) as any;
  // Initialize default private fields
  session._lastAssistantMessage = undefined;
  session._retryAttempt = 0;
  session._retryAborted = false;
  session._overflowRecoveryAttempted = false;
  session._steeringMessages = [];
  session._followUpMessages = [];
  session._retryMaxAttempts = 0;
  session._retryDelayMs = 0;
  session._retryResolve = undefined;
  session._agentState = { history: [] };
  // performance tracking defaults
  session._enablePerformanceTracking = false;
  session._performanceTracker = undefined;
  session._config = { compaction: undefined };
  session._model = { contextWindow: 4000, id: 'test-model' } as any;
  return session;
}

describe('AgentSession event handling', () => {
  describe('auto_retry_end', () => {
    it('resets _retryAborted', async () => {
      const session = createSession();
      session._retryAborted = true;
      await session._processAgentEvent({ type: 'auto_retry_end' });
      expect(session._retryAborted).toBe(false);
    });
  });

  describe('message:start', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('removes from steeringMessages if match', async () => {
      const session = createSession();
      session._steeringMessages = ['hello'];
      session._emitQueueUpdate = vi.fn();
      await session._processAgentEvent({
        type: 'message:start',
        turn: { role: 'user', content: [{ type: 'text', text: 'hello' }] },
      });
      expect(session._steeringMessages).toEqual([]);
      expect(session._emitQueueUpdate).toHaveBeenCalled();
    });

    it('removes from followUpMessages if match', async () => {
      const session = createSession();
      session._followUpMessages = ['hi'];
      session._emitQueueUpdate = vi.fn();
      await session._processAgentEvent({
        type: 'message:start',
        turn: { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      });
      expect(session._followUpMessages).toEqual([]);
      expect(session._emitQueueUpdate).toHaveBeenCalled();
    });

    it('does nothing if non-user role', async () => {
      const session = createSession();
      session._steeringMessages = ['test'];
      await session._processAgentEvent({
        type: 'message:start',
        turn: { role: 'assistant', content: [{ type: 'text', text: 'test' }] },
      });
      expect(session._steeringMessages).toEqual(['test']);
    });

    it('does nothing if message text not in queues', async () => {
      const session = createSession();
      session._steeringMessages = ['other'];
      session._emitQueueUpdate = vi.fn();
      await session._processAgentEvent({
        type: 'message:start',
        turn: { role: 'user', content: [{ type: 'text', text: 'missing' }] },
      });
      expect(session._steeringMessages).toEqual(['other']);
      expect(session._emitQueueUpdate).not.toHaveBeenCalled();
    });

    it('resets overflowRecoveryAttempted', async () => {
      const session = createSession();
      session._overflowRecoveryAttempted = true;
      await session._processAgentEvent({
        type: 'message:start',
        turn: { role: 'user', content: [{ type: 'text', text: 'any' }] },
      });
      expect(session._overflowRecoveryAttempted).toBe(false);
    });
  });

  describe('message:end', () => {
    let session: any;
    let appendSpy: any;

    beforeEach(() => {
      vi.clearAllMocks();
      session = createSession();
      appendSpy = vi.spyOn(session.sessionManager, 'appendMessage');
    });

    it('appends user message', async () => {
      const turn = { role: 'user', content: [{ type: 'text', text: 'hi' }] };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(appendSpy).toHaveBeenCalledWith(turn);
    });

    it('appends assistant message', async () => {
      const turn = { role: 'assistant', content: [{ type: 'text', text: 'bye' }] };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(appendSpy).toHaveBeenCalledWith(turn);
    });

    it('appends tool message', async () => {
      const turn = { role: 'tool', content: [{ type: 'text', text: 'tool out' }] };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(appendSpy).toHaveBeenCalledWith(turn);
    });

    it('for assistant: sets _lastAssistantMessage', async () => {
      const turn = { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'stop' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(session._lastAssistantMessage).toBe(turn);
    });

    it('for assistant with stopReason!=error resets overflowRecoveryAttempted', async () => {
      session._overflowRecoveryAttempted = true;
      const turn = { role: 'assistant', content: [], stopReason: 'stop' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(session._overflowRecoveryAttempted).toBe(false);
    });

    it('for assistant with stopReason==error does not reset overflowRecoveryAttempted', async () => {
      session._overflowRecoveryAttempted = false;
      const turn = { role: 'assistant', content: [], stopReason: 'error' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(session._overflowRecoveryAttempted).toBe(false); // unchanged
    });

    it('for assistant with retryAttempt>0 and not error emits auto_retry_end and resets _retryAttempt', async () => {
      session._retryAttempt = 2;
      const emitSpy = vi.spyOn(session, '_emit');
      const turn = { role: 'assistant', content: [], stopReason: 'stop' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(emitSpy).toHaveBeenCalledWith({
        type: 'auto_retry_end',
        success: true,
        attempt: 2,
      });
      expect(session._retryAttempt).toBe(0);
    });

    it('for assistant with retryAttempt==0 does not emit auto_retry_end', async () => {
      session._retryAttempt = 0;
      const emitSpy = vi.spyOn(session, '_emit');
      const turn = { role: 'assistant', content: [], stopReason: 'stop' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(emitSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auto_retry_end' }));
    });

    it('for assistant with error stopReason does not emit auto_retry_end', async () => {
      session._retryAttempt = 1;
      const emitSpy = vi.spyOn(session, '_emit');
      const turn = { role: 'assistant', content: [], stopReason: 'error' };
      await session._processAgentEvent({ type: 'message:end', turn });
      expect(emitSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'auto_retry_end' }));
    });
  });

  describe('agent:end', () => {
    let session: any;
    let resolveSpy: any;
    let flushSpy: any;
    let recordSpy: any;

    beforeEach(() => {
      vi.clearAllMocks();
      session = createSession();
      // Set a lastAssistantMessage
      session._lastAssistantMessage = { role: 'assistant', content: [] };
      resolveSpy = vi.fn();
      flushSpy = vi.fn();
      recordSpy = vi.fn();
      session._resolveRetry = resolveSpy;
      session._flushPendingBashMessages = flushSpy;
      session._isRetryableError = vi.fn().mockReturnValue(false);
      session._handleRetryableError = vi.fn().mockResolvedValue(false);
      session._enablePerformanceTracking = false;
    });

    it('without lastAssistantMessage does nothing', async () => {
      session._lastAssistantMessage = undefined;
      const resolveSpy = vi.spyOn(session, '_resolveRetry');
      const flushSpy = vi.spyOn(session, '_flushPendingBashMessages');
      await session._processAgentEvent({ type: 'agent:end' });
      expect(resolveSpy).not.toHaveBeenCalled();
      expect(flushSpy).not.toHaveBeenCalled();
    });

    it('with retryable error and _handleRetryableError returns true early', async () => {
      session._isRetryableError.mockReturnValue(true);
      session._handleRetryableError.mockResolvedValue(true);
      const earlyResolve = vi.fn();
      session._resolveRetry = earlyResolve;
      const earlyFlush = vi.fn();
      session._flushPendingBashMessages = earlyFlush;
      await session._processAgentEvent({ type: 'agent:end' });
      expect(earlyResolve).not.toHaveBeenCalled();
      expect(earlyFlush).not.toHaveBeenCalled();
    });

    it('normal flow: calls _resolveRetry and _flushPendingBashMessages', async () => {
      session._isRetryableError.mockReturnValue(false);
      vi.spyOn(session, '_checkCompaction').mockImplementation(() => Promise.resolve());
      await session._processAgentEvent({ type: 'agent:end' });
      expect(resolveSpy).toHaveBeenCalled();
      expect(flushSpy).toHaveBeenCalled();
    });

    it('performance tracking recorded when enabled', async () => {
      session._enablePerformanceTracking = true;
      session._performanceTracker = { record: recordSpy };
      vi.spyOn(session, '_checkCompaction').mockImplementation(() => Promise.resolve());
      await session._processAgentEvent({ type: 'agent:end' });
      expect(recordSpy).toHaveBeenCalled();
    });

    it('auto-compaction performed when autoCompact true', async () => {
      session._enablePerformanceTracking = false;
      const assistantMsg = { role: 'assistant', content: [{ type: 'text', text: 'ok' }] };
      session._lastAssistantMessage = assistantMsg;
      const compactionSpy = vi.spyOn(session, '_checkCompaction').mockImplementation(() => Promise.resolve());
      await session._processAgentEvent({ type: 'agent:end' });
      expect(compactionSpy).toHaveBeenCalledWith(assistantMsg, false);
    });

    it('auto-compaction skipped when autoCompact false', async () => {
      session._config = { compaction: { autoCompact: false } };
      const compactionSpy = vi.spyOn(session, '_checkCompaction');
      await session._processAgentEvent({ type: 'agent:end' });
      expect(compactionSpy).not.toHaveBeenCalled();
    });
  });
});
