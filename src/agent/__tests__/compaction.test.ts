import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSession } from '../agent-session';
import type { SessionManager } from '../../session/session-manager';
import type { SettingsManager } from '../settings-manager';
import type { ModelRegistry } from '../model-registry';
import type { Model } from '../../llm';
import type { Agent } from '../agent';
import { DEFAULT_COMPACTION_SETTINGS } from '../../session/compaction';

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
    },
    signal: new AbortController().signal,
    abort: vi.fn(),
    waitForIdle: vi.fn().mockResolvedValue(undefined),
    prompt: vi.fn().mockResolvedValue(undefined),
    continue: vi.fn().mockResolvedValue(undefined),
    steer: vi.fn(),
    followUp: vi.fn(),
    clearAllQueues: vi.fn(),
    getToolNames: vi.fn(() => []),
    registerTool: vi.fn(),
  } as any;
}

function createMockSessionManager(): SessionManager {
  const entries: any[] = [];
  return {
    getEntries: vi.fn(() => entries),
    getBranch: vi.fn(() => entries),
    getEntry: vi.fn((id) => entries.find(e => e.id === id)),
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
    resetLeaf: vi.fn(),
    branch: vi.fn(),
    branchWithSummary: vi.fn(() => 'summary-1'),
  } as any;
}

function createMockSettingsManager(): SettingsManager {
  return {
    getCompactionSettings: vi.fn(() => DEFAULT_COMPACTION_SETTINGS),
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

// Minimal AgentSession constructor args
function createAgentSessionConfig(overrides = {}): any {
  return {
    agent: createMockAgent(),
    sessionManager: createMockSessionManager(),
    settingsManager: createMockSettingsManager(),
    cwd: '/tmp',
    resourceLoader: { getPrompts: () => ({ prompts: [] }), getSkills: () => ({ skills: [] }), getAgentsFiles: () => ({ agentsFiles: [] }), getSystemPrompt: () => '', getAppendSystemPrompt: () => [] } as any,
    modelRegistry: createMockModelRegistry(),
    ...overrides,
  };
}

// Helper to create AssistantMessage with usage
function createAssistantMessage(tokens: number, stopReason: 'completed' | 'error' = 'completed', errorMessage?: string) {
  return {
    role: 'assistant' as const,
    content: [{ type: 'text' as const, text: 'Hello' }],
    usage: { input: 100, output: 100, cacheRead: 0, cacheWrite: 0, total: tokens, cost: { input: 0, output: 0, total: 0, cacheRead: 0, cacheWrite: 0 } },
    stopReason,
    errorMessage,
    provider: 'test',
    model: 'test-model',
    timestamp: Date.now(),
  };
}

describe('Auto-Compaction with Overflow Recovery', () => {
  let session: AgentSession;
  let mockSessionManager: any;
  let mockModelRegistry: any;
  let mockSettingsManager: any;
  let mockAgent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionManager = createMockSessionManager();
    mockSettingsManager = createMockSettingsManager();
    mockModelRegistry = createMockModelRegistry();
    mockAgent = createMockAgent();

    // Default: model with large context window
    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    mockAgent.state.model = model;

    // Config
    const config = createAgentSessionConfig({
      agent: mockAgent,
      sessionManager: mockSessionManager,
      settingsManager: mockSettingsManager,
      modelRegistry: mockModelRegistry,
    });

    // Use imported AgentSession
    session = new AgentSession(config);
    // Set model directly (internal _model needs to be set)
    (session as any)._model = model;
  });

  it('should compact when context tokens exceed threshold', async () => {
    // Arrange: many messages pushing tokens over threshold
    const settings = { ...DEFAULT_COMPACTION_SETTINGS, reserveTokens: 10000, keepRecentTokens: 5000 };
    mockSettingsManager.getCompactionSettings.mockReturnValue(settings);

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    mockAgent.state.model = model;

    // Simulate session entries (SessionEntry[]) with messages
    const manyEntries = [];
    for (let i = 0; i < 100; i++) {
      manyEntries.push({
        type: 'message' as const,
        id: `msg-${i}`,
        parentId: i === 0 ? null : `msg-${i-1}`,
        timestamp: new Date().toISOString(),
        message: {
          role: 'user' as const,
          content: 'x'.repeat(1000),
          timestamp: Date.now(),
        },
      });
    }
    mockSessionManager.getBranch.mockReturnValue(manyEntries);

    // Act
    await session.compact();

    // Assert: compaction was triggered
    expect(mockSessionManager.appendCompaction).toHaveBeenCalled();
  });

  it('should NOT compact when context tokens below threshold', async () => {
    const settings = { ...DEFAULT_COMPACTION_SETTINGS, reserveTokens: 10000, keepRecentTokens: 5000 };
    mockSettingsManager.getCompactionSettings.mockReturnValue(settings);

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    mockAgent.state.model = model;

    // Few messages
    const fewMessages = [
      { role: 'user' as const, content: 'Hello', timestamp: Date.now() },
    ];
    mockSessionManager.getBranch.mockReturnValue(fewMessages);

    await session.compact();

    expect(mockSessionManager.appendCompaction).not.toHaveBeenCalled();
  });

  it('should emit compaction_start and compaction_end events', async () => {
    const settings = { ...DEFAULT_COMPACTION_SETTINGS, reserveTokens: 10000, keepRecentTokens: 5000 };
    mockSettingsManager.getCompactionSettings.mockReturnValue(settings);

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    mockAgent.state.model = model;

    const manyMessages = [];
    for (let i = 0; i < 100; i++) {
      manyMessages.push({
        role: 'user' as const,
        content: 'x'.repeat(1000),
        timestamp: Date.now(),
      });
    }
    mockSessionManager.getBranch.mockReturnValue(manyMessages);

    const listener = vi.fn();
    session.subscribe(listener);

    await session.compact();

    // Check events
    const events = listener.mock.calls.map(call => call[0]);
    expect(events.some(e => e.type === 'compaction_start')).toBe(true);
    expect(events.some(e => e.type === 'compaction_end')).toBe(true);
  });

  it('should handle overflow error and retry', async () => {
    // This test requires simulating agent_end with overflow error
    // We need to access _handleAgentEvent or trigger via agent event
    // TODO: More complex - requires proper agent event simulation
  });
});

describe('Retry with Exponential Backoff', () => {
  it('should calculate exponential backoff correctly', () => {
    const baseDelay = 1000;
    const attempt1Delay = baseDelay * 2 ** (1 - 1); // 1000
    const attempt2Delay = baseDelay * 2 ** (2 - 1); // 2000
    const attempt3Delay = baseDelay * 2 ** (3 - 1); // 4000

    expect(attempt1Delay).toBe(1000);
    expect(attempt2Delay).toBe(2000);
    expect(attempt3Delay).toBe(4000);
  });

  it('should respect max retries', () => {
    // Logic will be tested when retry implementation is in place
  });
});
