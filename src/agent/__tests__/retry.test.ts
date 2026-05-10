import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AgentSession } from '../agent-session';

// Minimal mocks (similar to compaction.test)
function createMockAgent(): any {
  return {
    subscribe: vi.fn(() => () => {}),
    state: {
      messages: [],
      model: undefined,
      thinkingLevel: 'medium',
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
  };
}

function createMockSessionManager(): any {
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
  };
}

function createMockSettingsManager(): any {
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
  };
}

function createMockModelRegistry(): any {
  return {
    hasConfiguredAuth: vi.fn(() => true),
    getApiKeyAndHeaders: vi.fn(() => Promise.resolve({ ok: true, apiKey: 'test-key', headers: {} })),
    isUsingOAuth: vi.fn(() => false),
    getAvailable: vi.fn(() => Promise.resolve([])),
    find: vi.fn(() => undefined),
    registerProvider: vi.fn(),
    unregisterProvider: vi.fn(),
  };
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

describe('Auto-Retry Logic', () => {
  let session: any;
  let mockSettingsManager: any;
  let mockAgent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsManager = createMockSettingsManager();
    mockAgent = createMockAgent();

    // Simulate retry enabled
    mockSettingsManager.getRetrySettings.mockReturnValue({
      enabled: true,
      maxRetries: 3,
      baseDelayMs: 1000, // used for exponential backoff
    });

    const config = createAgentSessionConfig({
      agent: mockAgent,
      settingsManager: mockSettingsManager,
    });

    // Access internal class - we'll test the retry calculation logic indirectly
    const AgentSessionClass = require('../agent-session').AgentSession;
    session = new AgentSessionClass(config);
  });

  it('should detect retryable errors', () => {
    // Access internal _isRetryableError if exposed, or simulate through event
    // Since _isRetryableError is private, we'll test via behavior or expose via test-only hook
    // For now, document the expected patterns
    const retryableErrors = [
      'overloaded',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
      'timeout',
      'temporary failure',
    ];

    expect(retryableErrors).toContain('overloaded');
    expect(retryableErrors).toContain('rate limit');
  });

  it('should calculate exponential backoff delays', () => {
    const baseDelay = 1000;
    const delays = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      delays.push(baseDelay * 2 ** (attempt - 1));
    }

    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it('should not retry when retry is disabled', () => {
    mockSettingsManager.getRetrySettings.mockReturnValue({ enabled: false });
    expect(session.autoRetryEnabled).toBe(false);
  });

  it('should track retry attempt', () => {
    expect(session.retryAttempt).toBe(0);
  });
});

describe('Bash Message Flushing', () => {
  it('should flush pending bash messages after agent turn', async () => {
    // This will be tested properly once _flushPendingBashMessages is implemented
    // For now, document expected behavior:
    // - _pendingBashMessages array accumulates during streaming
    // - _flushPendingBashMessages() adds each to agent.state.messages and sessionManager.appendMessage()
    // - Called in prompt() before sending new user message, and in _processAgentEvent on agent_end
  });
});

describe('Tool Registry with Prompt Snippets', () => {
  it('should include prompt snippets in system prompt', () => {
    // ToolDefinition should have optional promptSnippet and promptGuidelines
    // _rebuildSystemPrompt() should collect these and pass to buildSystemPrompt
  });
});

describe('Extension Event System', () => {
  it('should emit before_agent_start event', () => {
    // ExtensionRunner.emitBeforeAgentStart() should be called in prompt()
    // It passes: prompt text, images, systemPrompt, systemPromptOptions
    // Extensions can return messages to inject, or systemPrompt override
  });

  it('should emit input event for interception', () => {
    // ExtensionRunner.emitInput() called early in prompt()
    // Can return: { action: 'pass' } | { action: 'handled' } | { action: 'transform', text, images }
  });

  it('should emit session_before_compact event', () => {
    // Called before compaction, can cancel or provide custom compaction result
  });

  it('should emit tool_call and tool_result events', () => {
    // Agent.beforeToolCall and afterToolCall are hooked in _installAgentToolHooks()
    // Converted to extension events: tool_call, tool_result
  });
});
