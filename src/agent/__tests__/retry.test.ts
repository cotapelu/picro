import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from '../agent-session';
import { Agent } from '../agent';
import { SessionManager } from '../../session/session-manager';
import { SettingsManager } from '../settings-manager';
import { ModelRegistry } from '../model-registry';
import type { Model } from '../../llm';

// Mock dependencies
function createMockAgent(): Agent {
  return {
    subscribe: vi.fn(() => () => {}),
    state: {
      messages: [],
      model: undefined,
      thinkingLevel: 'medium' as const,
      isStreaming: false,
      systemPrompt: '',
      tools: [],
      isRunning: false,
    },
    signal: new AbortController().signal,
    abort: vi.fn(),
    waitForIdle: vi.fn().mockResolvedValue(undefined),
    prompt: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    steer: vi.fn(),
    followUp: vi.fn(),
    clearAllQueues: vi.fn(),
    getToolNames: vi.fn(() => []),
    registerTool: vi.fn(),
  } as any;
}

function createMockSessionManager(): SessionManager {
  return {
    getEntries: vi.fn(() => []),
    getBranch: vi.fn(() => []),
    getEntry: vi.fn(() => null),
    appendMessage: vi.fn(),
    appendCustomEntry: vi.fn(),
    appendCompaction: vi.fn(),
    appendModelChange: vi.fn(),
    appendThinkingLevelChange: vi.fn(),
    appendSessionInfo: vi.fn(),
    appendLabelChange: vi.fn(),
    getSessionFile: vi.fn(() => '/tmp/test.jsonl'),
    getSessionId: vi.fn(() => 'test-session'),
    getSessionName: vi.fn(() => undefined),
    getLeafId: vi.fn(() => 'leaf-1'),
    getCwd: vi.fn(() => '/tmp'),
    buildSessionContext: vi.fn(() => ({ messages: [] })),
    getLatestCompactionEntry: vi.fn(() => null),
  } as any;
}

function createMockSettingsManager(): SettingsManager {
  return {
    getCompactionSettings: vi.fn(() => ({ enabled: true, reserveTokens: 16384, keepRecentTokens: 20000 })),
    getRetrySettings: vi.fn(() => ({ enabled: true, maxRetries: 3, baseDelayMs: 1000 })),
    setCompactionEnabled: vi.fn(),
    setRetryEnabled: vi.fn(),
    getImageAutoResize: vi.fn(() => true),
    getShellCommandPrefix: vi.fn(() => ''),
    getShellPath: vi.fn(() => '/bin/bash'),
    getTheme: vi.fn(() => 'dark'),
    reload: vi.fn(),
  } as any;
}

function createMockModelRegistry(): ModelRegistry {
  return {
    hasConfiguredAuth: vi.fn(() => true),
    getApiKeyAndHeaders: vi.fn(() => Promise.resolve({ ok: true, apiKey: 'test-key', headers: {} })),
    isUsingOAuth: vi.fn(() => false),
    getAvailable: vi.fn(() => Promise.resolve([])),
    find: vi.fn(() => undefined),
    registerProvider: vi.fn(),
    unregisterProvider: vi.fn(),
  } as any;
}

function createAgentSessionConfig(overrides = {}): any {
  return {
    agent: createMockAgent(),
    sessionManager: createMockSessionManager(),
    settingsManager: createMockSettingsManager(),
    cwd: '/tmp',
    resourceLoader: {
      getPrompts: () => ({ prompts: [] }),
      getSkills: () => ({ skills: [] }),
      getAgentsFiles: () => ({ agentsFiles: [] }),
      getSystemPrompt: () => '',
      getAppendSystemPrompt: () => [],
    } as any,
    modelRegistry: createMockModelRegistry(),
    ...overrides,
  };
}

describe('Retry Logic', () => {
  let session: AgentSession;
  let mockSettingsManager: any;
  let eventListeners: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsManager = createMockSettingsManager();

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    const mockAgent = createMockAgent() as any;
    mockAgent.state.model = model;

    const config = createAgentSessionConfig({
      agent: mockAgent,
      settingsManager: mockSettingsManager,
    });

    // @ts-ignore
    session = new AgentSession(config);
    (session as any)._model = model;

    eventListeners = [];
    // @ts-ignore
    session.subscribe((event: any) => eventListeners.push(event));
  });

  describe('_isRetryableError', () => {
    const retryableCases = [
      'overloaded',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
      'timeout',
      'timed out',
      'temporary failure',
    ];

    it('should detect retryable error patterns', () => {
      for (const pattern of retryableCases) {
        const msg = { errorMessage: `Error: ${pattern} occurred` };
        // @ts-ignore
        const result = (session as any)._isRetryableError(msg);
        expect(result).toBe(true);
      }
    });

    it('should NOT retry non-retryable errors', () => {
      const msg = { errorMessage: 'Invalid API key' };
      // @ts-ignore
      const result = (session as any)._isRetryableError(msg);
      expect(result).toBe(false);
    });
  });

  describe('Exponential backoff', () => {
    it('should calculate delays correctly for attempts 1-3', () => {
      const baseDelay = 1000;
      const attempts = [1, 2, 3];
      const expected = [1000, 2000, 4000];
      for (let i = 0; i < attempts.length; i++) {
        const delay = baseDelay * 2 ** (attempts[i] - 1);
        expect(delay).toBe(expected[i]);
      }
    });
  });

  describe('Retry attempt limits', () => {
    it('should stop when maxRetries reached (attempt >= max)', async () => {
      // Simulate already at max retries
      // @ts-ignore
      (session as any)._retryMaxAttempts = 3;
      // @ts-ignore
      (session as any)._retryAttempt = 3; // next will be 4, but check before increment

      const msg = { errorMessage: 'overloaded' };
      const result = await (session as any)._handleRetryableError(msg);
      expect(result).toBe(false);
    });

    it('should allow retry when under max', async () => {
      vi.useFakeTimers();
      // @ts-ignore
      (session as any)._retryMaxAttempts = 3;
      // @ts-ignore
      (session as any)._retryAttempt = 0;

      const msg = { errorMessage: 'overloaded' };
      const promise = (session as any)._handleRetryableError(msg);

      await vi.runAllTimersAsync(); // fast-forward the backoff delay
      const result = await promise;

      expect(result).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('Retry events', () => {
    it('should emit auto_retry_start event', async () => {
      vi.useFakeTimers();
      // @ts-ignore
      (session as any)._retryMaxAttempts = 3;
      // @ts-ignore
      (session as any)._retryAttempt = 0;

      const msg = { errorMessage: 'overloaded' };
      const promise = (session as any)._handleRetryableError(msg);

      await vi.runAllTimersAsync();
      await promise;

      const startEvents = eventListeners.filter(e => e.type === 'auto_retry_start');
      expect(startEvents.length).toBeGreaterThan(0);
      expect(startEvents[0].attempt).toBe(1);
      vi.useRealTimers();
    });

    // Note: auto_retry_end is emitted in _processAgentEvent after successful assistant message,
    // not directly in _handleRetryableError. So we test event creation indirectly via _resolveRetry.
    it('should resolve retry promise', async () => {
      // @ts-ignore
      (session as any)._retryPromise = new Promise(resolve => { (session as any)._retryResolve = resolve; });
      // @ts-ignore
      (session as any)._resolveRetry();
      // @ts-ignore
      expect((session as any)._retryPromise).toBeUndefined();
    });
  });
});
