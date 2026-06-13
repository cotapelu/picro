import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';
import type { Model } from '../llm/index.js';
import { SettingsManager } from '../runtime/settings-manager.js';
import { DefaultModelRegistry } from './model-registry.js';
import { SessionManager } from './session-manager.js';

describe('AgentSession unit', () => {
  it('getLeafId returns sessionManager.getLeafId()', () => {
    const sessionManager = {
      getLeafId: vi.fn().mockReturnValue('leaf-123'),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getLeafId()).toBe('leaf-123');
  });

  it('autoCompactionEnabled getter/setter works', () => {
    const settingsManager = {
      getCompactionEnabled: vi.fn().mockReturnValue(true),
      setCompactionEnabled: vi.fn(),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager,
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.autoCompactionEnabled).toBe(true);
    agentSession.setAutoCompactionEnabled(false);
    expect(settingsManager.setCompactionEnabled).toHaveBeenCalledWith(false);
  });

  it('sessionName returns sessionManager.getSessionName()', () => {
    const sessionManager = {
      getLeafId: vi.fn(),
      getSessionName: vi.fn().mockReturnValue('My Session'),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.sessionName).toBe('My Session');
  });

  it('getTree returns sessionManager.getTree()', () => {
    const tree = [{ id: 'root', children: [] }];
    const sessionManager = {
      getLeafId: vi.fn(),
      getTree: vi.fn().mockReturnValue(tree),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getTree()).toBe(tree);
  });

  it('getUserMessagesForForking returns correct user message entries', () => {
    const entries = [
      { id: 'e1', type: 'message', message: { role: 'user', content: 'Hello' } },
      { id: 'e2', type: 'message', message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] } },
      { id: 'e3', type: 'message', message: { role: 'user', content: [{ type: 'text', text: 'How are you?' }] } },
    ];
    const sessionManager = {
      getLeafId: vi.fn(),
      getEntries: vi.fn().mockReturnValue(entries),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    const result = agentSession.getUserMessagesForForking();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ entryId: 'e1', text: 'Hello' });
    expect(result[1]).toEqual({ entryId: 'e3', text: 'How are you?' });
  });

  it('getLastAssistantText returns last non-aborted assistant message text', () => {
    const history = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'First' }], stopReason: 'done' },
      { role: 'assistant', content: [{ type: 'text', text: 'Second' }], stopReason: 'aborted' },
      { role: 'assistant', content: [{ type: 'text', text: 'Third' }], stopReason: 'done' },
    ];
    const agent = { subscribe: () => () => {}, state: { history } };
    const agentSession = new AgentSession({
      agent,
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getLastAssistantText()).toBe('Third');
  });

  it('abortBranchSummary calls the abort controller if present', () => {
    const abort = vi.fn();
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._branchSummaryAbortController = { abort };
    agentSession.abortBranchSummary();
    expect(abort).toHaveBeenCalled();
  });
});

describe('AgentSession branch coverage', () => {
  const mockModel: Model = {
    id: 'gpt-4',
    provider: 'openai',
    name: 'GPT-4',
    contextWindow: 128000,
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    cost: { input: 0.03, output: 0.06, total: 0.09 },
    reasoning: true,
  } as Model;

  function buildSession(overrides: any = {}) {
    const agent = { subscribe: () => () => {}, registerTool: vi.fn(), clearAllQueues: vi.fn(), abort: vi.fn(), setModel: vi.fn(), getToolNames: () => [], steer: vi.fn(), followUp: vi.fn() };
    const sessionManager = {
      getLeafId: vi.fn().mockReturnValue('leaf'),
      getSessionFile: vi.fn().mockReturnValue(undefined),
      getSessionId: vi.fn().mockReturnValue('sid'),
      appendMessage: vi.fn(),
      appendModelChange: vi.fn(),
      appendThinkingLevelChange: vi.fn(),
      getBranch: vi.fn().mockReturnValue([]),
      buildSessionContext: vi.fn().mockReturnValue({ messages: [] }),
    } as any;
    const settingsManager = SettingsManager.inMemory({});
    const modelRegistry = new DefaultModelRegistry();
    return new AgentSession({
      agent,
      sessionManager,
      settingsManager,
      cwd: '/test',
      resourceLoader: {
        getAgentsFiles: () => undefined,
        getSkills: () => undefined,
        getAppendSystemPrompt: () => [],
        getExtensions: () => ({ runtime: { flagValues: new Map() }, extensions: [], errors: [] }),
      },
      modelRegistry,
      ...overrides,
    });
  }

  describe('setModel', () => {
    it('throws when no API key configured', async () => {
      const session = buildSession({ modelRegistry: new DefaultModelRegistry() });
      const modelNoAuth = { ...mockModel, provider: 'anthropic', id: 'claude-3' } as Model;
      await expect(session.setModel(modelNoAuth)).rejects.toThrow(/No API key/);
    });

    it('accepts model when hasConfiguredAuth returns true', async () => {
      const session = buildSession();
      vi.spyOn(session.modelRegistry, 'hasConfiguredAuth').mockReturnValue(true);
      await expect(session.setModel(mockModel)).resolves.not.toThrow();
    });
  });

  describe('cycleModel', () => {
    it('returns undefined when only one scoped model', async () => {
      const session = buildSession({ scopedModels: [{ model: mockModel }] });
      const result = await session.cycleModel('forward');
      expect(result).toBeUndefined();
    });

    it('returns undefined when no scoped models and no available models', async () => {
      const session = buildSession();
      vi.spyOn(session.modelRegistry, 'getAvailable').mockResolvedValue([]);
      const result = await session.cycleModel('forward');
      expect(result).toBeUndefined();
    });
  });

  describe('queue management', () => {
    it('evicts oldest steering when exceeding maxSteeringQueueSize', async () => {
      const session = buildSession({ maxSteeringQueueSize: 2 });
      await (session as any)._queueSteer('a');
      await (session as any)._queueSteer('b');
      await (session as any)._queueSteer('c');
      expect(session.getSteeringMessages()).toEqual(['b', 'c']);
    });

    it('evicts oldest follow-up when exceeding maxFollowUpQueueSize', async () => {
      const session = buildSession({ maxFollowUpQueueSize: 2 });
      await (session as any)._queueFollowUp('1');
      await (session as any)._queueFollowUp('2');
      await (session as any)._queueFollowUp('3');
      expect(session.getFollowUpMessages()).toEqual(['2', '3']);
    });
  });

  describe('isRetryableError detection', () => {
    const session = buildSession();
    const isRetryable = (msg: any) => (session as any)._isRetryableError(msg);

    it('detects rate limit errors', () => {
      expect(isRetryable({ errorMessage: 'Rate limit exceeded' })).toBe(true);
      expect(isRetryable({ errorMessage: '429 Too Many Requests' })).toBe(true);
    });
    it('detects overload errors', () => {
      expect(isRetryable({ errorMessage: 'Service overloaded' })).toBe(true);
    });
    it('detects timeout errors', () => {
      expect(isRetryable({ errorMessage: 'Request timed out' })).toBe(true);
    });
    it('detects 5xx errors', () => {
      expect(isRetryable({ errorMessage: '500 Internal Server Error' })).toBe(true);
      expect(isRetryable({ errorMessage: '503 Service Unavailable' })).toBe(true);
    });
    it('rejects non-retryable errors', () => {
      expect(isRetryable({ errorMessage: 'Invalid API key' })).toBe(false);
      expect(isRetryable({})).toBe(false);
    });
  });

  describe('dispose', () => {
    it('can be called multiple times safely', () => {
      const session = buildSession();
      expect(() => session.dispose()).not.toThrow();
      expect(() => session.dispose()).not.toThrow();
    });
  });

  describe('_buildSystemPrompt', () => {
    it('includes skills from resourceLoader', () => {
      const session = buildSession({
        resourceLoader: {
          getAgentsFiles: () => ({ agentsFiles: [] }),
          getSkills: () => ({ skills: [{ id: 's1', name: 'Skill1', description: 'A skill', hooks: [] }] }),
          getAppendSystemPrompt: () => ['Custom'],
        } as any,
      });
      const prompt = (session as any)._buildSystemPrompt();
      expect(prompt).toContain('Skill1');
      expect(prompt).toContain('Custom');
    });
  });

  describe('sendCustomMessage', () => {
    it('adds to history when deliverAs nextTurn', () => {
      const session = buildSession();
      (session as any)._agentState = { history: [] };
      session.sendCustomMessage({ customType: 't', content: 'data' }, { deliverAs: 'nextTurn' });
      expect((session as any)._pendingNextTurnMessages.length).toBe(1);
    });

    it('adds to history when not streaming and no triggerTurn', () => {
      const session = buildSession();
      (session as any)._agentState = { history: [] };
      session.sendCustomMessage({ customType: 't', content: {} });
      expect((session as any)._agentState.history.length).toBe(1);
    });
  });

  describe('abort methods', () => {
    it('abortRetry clears state', () => {
      const session = buildSession();
      (session as any)._retryPromise = Promise.resolve();
      (session as any)._retryResolve = vi.fn();
      session.abortRetry();
      expect((session as any)._retryAborted).toBe(true);
      expect((session as any)._retryPromise).toBeUndefined();
    });
  });
});
