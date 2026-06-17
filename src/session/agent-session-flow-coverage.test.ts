import { describe, it, expect, vi } from 'vitest';
import { AgentSession, parseSkillBlock } from './agent-session.js';

function agentWithState(history: any[] = []) {
  return { subscribe: () => () => {}, state: { history }, getToolNames: () => [], registerTool: vi.fn(), clearAllQueues: vi.fn(), abort: vi.fn(), setModel: vi.fn(), getConfig: vi.fn().mockReturnValue({}), getState: () => ({ history }) };
}

function buildSession(agent: any, overrides: any = {}) {
  return new AgentSession({
    agent,
    sessionManager: {
      getLeafId: () => null,
      getSessionFile: () => undefined,
      getSessionId: () => 'sid',
      getSessionName: () => undefined,
      appendMessage: vi.fn(),
      appendModelChange: vi.fn(),
      appendThinkingLevelChange: vi.fn(),
      appendCompaction: vi.fn(),
      getBranch: () => [],
      getEntries: () => [],
      getTree: () => [],
      getLatestCompactionEntry: () => undefined,
      buildSessionContext: () => ({ model: undefined, messages: [] }),
      branch: vi.fn(),
      branchWithSummary: vi.fn().mockReturnValue('summaryId'),
      resetLeaf: vi.fn(),
      getEntry: () => undefined,
    },
    settingsManager: {
      getCompactionEnabled: () => true,
      setCompactionEnabled: vi.fn(),
      getCompactionSettings: () => ({ enabled: true, autoCompact: false }),
      getRetrySettings: () => ({ enabled: false, maxRetries: 3, baseDelayMs: 1000 }),
      setDefaultProvider: vi.fn(),
      setDefaultModel: vi.fn(),
    },
    cwd: '/tmp',
    resourceLoader: {
      getAgentsFiles: () => undefined,
      getSkills: () => undefined,
      getAppendSystemPrompt: () => [],
      reload: vi.fn(),
      getExtensions: () => ({ runtime: { flagValues: new Map(), pendingProviderRegistrations: [] }, extensions: [], errors: [] }),
    },
    modelRegistry: {
      hasConfiguredAuth: () => true,
      getApiKeyAndHeaders: async () => ({ ok: true, apiKey: 'key', headers: {} }),
      getAvailable: async () => [],
    },
    initialActiveToolNames: ['read'],
    ...overrides,
  });
}

describe('parseSkillBlock', () => {
  it('returns null for invalid input', () => {
    expect(parseSkillBlock('hello')).toBeNull();
  });
});

describe('AgentSession flow', () => {
  it('returns last assistant text when available', () => {
    const session = buildSession(agentWithState([
      { role: 'assistant', content: [{ type: 'text', text: 'Hello' }], stopReason: 'stop' },
    ]));
    expect(session.getLastAssistantText()).toBe('Hello');
  });

  it('returns undefined when assistant message is aborted with empty content', () => {
    const session = buildSession(agentWithState([
      { role: 'assistant', content: [], stopReason: 'aborted' },
    ]));
    expect(session.getLastAssistantText()).toBeUndefined();
  });

  it('returns undefined when there is no text content', () => {
    const session = buildSession(agentWithState([
      { role: 'assistant', content: [{ type: 'toolCall', name: 'read' }], stopReason: 'stop' },
    ]));
    expect(session.getLastAssistantText()).toBeUndefined();
  });

  it('returns usage context when model available', () => {
    const session = buildSession(agentWithState([
      { role: 'assistant', content: [], usage: { input: 1, output: 2 }, stopReason: 'stop' },
    ]));
    session._model = { contextWindow: 100 };
    const usage = session.getContextUsage();
    expect(usage?.contextWindow).toBe(100);
  });

  it('returns undefined when model contextWindow <= 0', () => {
    const session = buildSession(agentWithState([]));
    session._model = { contextWindow: 0 } as any;
    expect(session.getContextUsage()).toBeUndefined();
  });

  it('returns session stats', () => {
    const session = buildSession(agentWithState([
      { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'ok' }], usage: { input: 1, output: 2 } },
    ]));
    const stats = session.getSessionStats();
    expect(stats.userMessages).toBe(1);
    expect(stats.assistantMessages).toBe(1);
    expect(stats.tokens.input).toBe(1);
    expect(stats.tokens.output).toBe(2);
  });
});
