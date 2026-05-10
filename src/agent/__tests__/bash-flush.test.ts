import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from '../../session/agent-session';
import type { Agent } from '../agent';
import type { SessionManager } from '../../session/session-manager';
import type { SettingsManager } from '../settings-manager';
import type { ModelRegistry } from '../model-registry';
import type { Model } from '../../llm';

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
    run: vi.fn().mockResolvedValue(undefined),
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

describe('Bash Message Flushing', () => {
  let session: AgentSession;
  let mockAgent: any;
  let mockSessionManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent = createMockAgent();
    mockSessionManager = createMockSessionManager();

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    mockAgent.state.model = model;

    const config = createAgentSessionConfig({
      agent: mockAgent,
      sessionManager: mockSessionManager,
    });

    // @ts-ignore
    session = new AgentSession(config);
    (session as any)._model = model;
  });

  it('should add bash message directly when not streaming', () => {
    expect(mockAgent.state.isStreaming).toBe(false);
    (session as any).recordBashResult('ls', 'output', 0, false, false);
    expect(mockAgent.state.messages).toHaveLength(1);
    expect(mockAgent.state.messages[0].role).toBe('bashExecution');
  });

  it('should queue bash messages when streaming', () => {
    mockAgent.state.isStreaming = true;
    (session as any).recordBashResult('cmd1', 'out1', 0, false, false);
    (session as any).recordBashResult('cmd2', 'out2', 0, false, false);
    const pending = (session as any)._pendingBashMessages;
    expect(pending.length).toBe(2);
    expect(mockAgent.state.messages.length).toBe(0);
  });

  it('should flush pending bash messages before new turn', async () => {
    mockAgent.state.isStreaming = true;
    (session as any).recordBashResult('pending', 'out', 0, false, false);
    await (session as any).prompt('test');
    expect(mockAgent.state.messages).toHaveLength(1);
    expect(mockSessionManager.appendMessage).toHaveBeenCalled();
  });

  it('should flush pending bash messages on agent_end', async () => {
    mockAgent.state.isStreaming = true;
    (session as any).recordBashResult('queued', 'out', 0, false, false);
    // Set last assistant to trigger flush block
    (session as any)._lastAssistantMessage = { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'completed' } as any;
    const event = { type: 'agent:end', result: {}, messages: [] };
    await (session as any)._processAgentEvent(event);
    expect(mockAgent.state.messages).toHaveLength(1);
    expect(mockSessionManager.appendMessage).toHaveBeenCalled();
  });
});
