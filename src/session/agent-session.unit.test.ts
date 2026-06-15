import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';
import type { Model } from '../llm/index.js';
import { SettingsManager } from '../runtime/settings-manager.js';
import { DefaultModelRegistry } from './model-registry.js';
import { SessionManager } from './session-manager.js';
import * as compaction from './compaction.js';

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

  describe('queue methods', () => {
    it('_queueSteer evicts oldest when exceeding maxSteeringQueueSize', async () => {
      const session = buildSession({ maxSteeringQueueSize: 2 });
      await (session as any)._queueSteer('a');
      await (session as any)._queueSteer('b');
      await (session as any)._queueSteer('c');
      expect(session.getSteeringMessages()).toEqual(['b', 'c']);
    });

    it('_queueFollowUp evicts oldest when exceeding maxFollowUpQueueSize', async () => {
      const session = buildSession({ maxFollowUpQueueSize: 2 });
      await (session as any)._queueFollowUp('1');
      await (session as any)._queueFollowUp('2');
      await (session as any)._queueFollowUp('3');
      expect(session.getFollowUpMessages()).toEqual(['2', '3']);
    });
  });

  describe('_isRetryableError', () => {
    const isRetryable = (session: any, msg: any) => session._isRetryableError(msg);

    it('detects rate limit 429 and variations', () => {
      const session = buildSession();
      expect(isRetryable(session, { errorMessage: 'Rate limit exceeded' })).toBe(true);
      expect(isRetryable(session, { errorMessage: '429 Too Many Requests' })).toBe(true);
    });

    it('detects 5xx server errors', () => {
      const session = buildSession();
      expect(isRetryable(session, { errorMessage: '500 Internal Server Error' })).toBe(true);
      expect(isRetryable(session, { errorMessage: '502 Bad Gateway' })).toBe(true);
      expect(isRetryable(session, { errorMessage: '503 Service Unavailable' })).toBe(true);
      expect(isRetryable(session, { errorMessage: '504 Gateway Timeout' })).toBe(true);
    });

    it('detects overload and timeout errors', () => {
      const session = buildSession();
      expect(isRetryable(session, { errorMessage: 'Service overloaded' })).toBe(true);
      expect(isRetryable(session, { errorMessage: 'Request timed out' })).toBe(true);
    });

    it('rejects non-retryable errors', () => {
      const session = buildSession();
      expect(isRetryable(session, { errorMessage: 'Invalid API key' })).toBe(false);
      expect(isRetryable(session, { errorMessage: 'Model not found' })).toBe(false);
      expect(isRetryable(session, {})).toBe(false);
    });
  });

  describe('_buildSystemPrompt', () => {
    it('includes skills and custom append prompt', () => {
      const session = buildSession({
        resourceLoader: {
          getAgentsFiles: () => ({ agentsFiles: [] }),
          getSkills: () => ({
            skills: [{ id: 's1', name: 'Skill1', description: 'A skill', hooks: [] as any[] }],
          }),
          getAppendSystemPrompt: () => ['Additional instructions'],
        } as any,
      });
      const prompt = (session as any)._buildSystemPrompt();
      expect(prompt).toContain('Skill1');
      expect(prompt).toContain('Additional instructions');
    });

    it('uses default when no skills and no agents files', () => {
      const session = buildSession({
        resourceLoader: {
          getAgentsFiles: () => ({ agentsFiles: [] }),
          getSkills: () => ({ skills: [] }),
          getAppendSystemPrompt: () => [],
        } as any,
      });
      const prompt = (session as any)._buildSystemPrompt();
      expect(prompt).toContain('You are an expert coding assistant');
    });
  });

  describe('_checkCompaction', () => {
    let session: any;
    beforeEach(() => {
      session = buildSession();
      (session as any)._model = { provider: 'openai', id: 'gpt-4', contextWindow: 8000 };
      (session as any)._agentState = { history: [] };
      (session as any)._runAutoCompaction = vi.fn().mockResolvedValue(undefined);
      (session as any)._performAutoCompaction = vi.fn().mockResolvedValue(undefined);
      (session as any)._emit = vi.fn();
      (session.sessionManager as any).getLatestCompactionEntry = vi.fn().mockReturnValue(null);
    });

    it('returns early when compaction disabled', async () => {
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: false, reserveTokens: 1000, keepRecentTokens: 2000 });
      const asstMsg = { role: 'assistant', content: [{ type: 'text', text: 'ok' }], stopReason: 'stop', provider: 'openai', model: 'gpt-4' };
      await (session as any)._checkCompaction(asstMsg);
      expect(session._performAutoCompaction).not.toHaveBeenCalled();
      expect(session._runAutoCompaction).not.toHaveBeenCalled();
    });

    it('returns early when stopReason is aborted', async () => {
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      const asstMsg = { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: 'aborted', provider: 'openai', model: 'gpt-4' };
      await (session as any)._checkCompaction(asstMsg);
      expect(session._performAutoCompaction).not.toHaveBeenCalled();
      expect(session._runAutoCompaction).not.toHaveBeenCalled();
    });

    it('triggers overflow compaction on context_overflow', async () => {
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      const asstMsg = { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: 'context_overflow', provider: 'openai', model: 'gpt-4', timestamp: Date.now() };
      await (session as any)._checkCompaction(asstMsg);
      expect(session._runAutoCompaction).toHaveBeenCalledWith('overflow', true);
      expect((session as any)._overflowRecoveryAttempted).toBe(true);
    });

    it('emits compaction_end event on second overflow attempt', async () => {
      (session as any)._overflowRecoveryAttempted = true;
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      const asstMsg = { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: 'context_overflow', provider: 'openai', model: 'gpt-4', timestamp: Date.now() };
      await (session as any)._checkCompaction(asstMsg);
      expect(session._emit).toHaveBeenCalledWith({
        type: 'compaction_end',
        reason: 'overflow',
        result: undefined,
        aborted: false,
        willRetry: false,
        errorMessage: expect.stringContaining('Context overflow'),
      });
      expect(session._runAutoCompaction).not.toHaveBeenCalled();
    });

    it('returns early if assistant message is older than latest compaction entry', async () => {
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      const now = Date.now();
      (session.sessionManager as any).getLatestCompactionEntry = vi.fn().mockReturnValue({ timestamp: now });
      const oldTime = now - 3600000; // 1 hour ago
      const asstMsg = { role: 'assistant', content: [{ type: 'text', text: '' }], stopReason: 'stop', provider: 'openai', model: 'gpt-4', timestamp: oldTime };
      await (session as any)._checkCompaction(asstMsg);
      expect(session._runAutoCompaction).not.toHaveBeenCalled();
      expect((session as any)._performAutoCompaction).not.toHaveBeenCalled();
    });
  });

  describe('_runAutoCompaction', () => {
    let session: any;
    beforeEach(() => {
      session = buildSession();
      (session as any)._model = { id: 'gpt-4', provider: 'openai', contextWindow: 8000 };
      (session as any)._agentState = { history: [] };
      (session as any)._emit = vi.fn();
      (session as any)._autoCompactionAbortController = undefined;
      (session.sessionManager as any).getBranch = vi.fn().mockReturnValue([]);
      (session.settingsManager as any).getCompactionSettings = () => ({ enabled: true, reserveTokens: 1000, keepRecentTokens: 2000 });
      (session.modelRegistry as any).getApiKeyAndHeaders = vi.fn().mockResolvedValue({ ok: true, apiKey: 'key', headers: {} });
      // Default mocks for appendCompaction and buildSessionContext
      (session.sessionManager as any).appendCompaction = vi.fn();
      (session.sessionManager as any).buildSessionContext = vi.fn().mockReturnValue({ messages: [] });
      (session as any)._agentState.history = []; // ensure exists
    });

    it('returns early if already compacting', async () => {
      (session as any)._autoCompactionAbortController = { abort: vi.fn() };
      await (session as any)._runAutoCompaction('overflow', false);
      expect(session._emit).not.toHaveBeenCalled();
    });

    it('emits compaction_end when model missing', async () => {
      (session as any)._model = undefined;
      await (session as any)._runAutoCompaction('overflow', false);
      expect(session._emit).toHaveBeenCalledWith({
        type: 'compaction_end',
        reason: 'overflow',
        result: undefined,
        aborted: false,
        willRetry: false,
      });
    });

    it('emits compaction_end when auth missing', async () => {
      (session.modelRegistry as any).getApiKeyAndHeaders = vi.fn().mockResolvedValue({ ok: false });
      await (session as any)._runAutoCompaction('overflow', false);
      expect(session._emit).toHaveBeenCalledWith({
        type: 'compaction_end',
        reason: 'overflow',
        result: undefined,
        aborted: false,
        willRetry: false,
      });
    });

    it('emits compaction_end when prepareCompaction returns null', async () => {
      vi.spyOn(compaction, 'prepareCompaction').mockReturnValue(null);
      await (session as any)._runAutoCompaction('overflow', false);
      expect(session._emit).toHaveBeenCalledWith({
        type: 'compaction_end',
        reason: 'overflow',
        result: undefined,
        aborted: false,
        willRetry: false,
      });
    });

    it('performs successful compaction flow', async () => {
      const prep = { firstKeptEntryId: 'e1', messagesToSummarize: [], tokensBefore: 0 } as any;
      vi.spyOn(compaction, 'prepareCompaction').mockReturnValue(prep);
      const compactResult = { summary: 'sum', details: {}, firstKeptEntryId: 'e1', tokensBefore: 0 };
      vi.spyOn(compaction, 'compact').mockResolvedValue(compactResult);
      (session.sessionManager as any).appendCompaction = vi.fn();
      (session.sessionManager as any).buildSessionContext = vi.fn().mockReturnValue({ messages: [] });

      await (session as any)._runAutoCompaction('threshold', false);

      expect(compaction.prepareCompaction).toHaveBeenCalled();
      expect(compaction.compact).toHaveBeenCalled();
      expect(session.sessionManager.appendCompaction).toHaveBeenCalledWith(
        'sum',
        'e1',
        0,
        expect.any(Object),
        false
      );
      expect(session.sessionManager.buildSessionContext).toHaveBeenCalled();
      expect(session._emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'compaction_end',
          reason: 'threshold',
          result: expect.objectContaining({
            summary: 'sum',
            tokensBefore: 0,
            entriesAdded: 1,
          }),
          aborted: false,
          willRetry: false,
        })
      );
      expect(session._autoCompactionAbortController).toBeUndefined();
    });

    it('handles error during compaction and emits compaction_end with error', async () => {
      vi.spyOn(compaction, 'prepareCompaction').mockReturnValue({ firstKeptEntryId: 'e1', messagesToSummarize: [], tokensBefore: 0 } as any);
      vi.spyOn(compaction, 'compact').mockRejectedValue(new Error('fail'));

      await (session as any)._runAutoCompaction('overflow', false);

      expect(session._emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'compaction_end',
          reason: 'overflow',
          result: undefined,
          aborted: false,
          willRetry: false,
          errorMessage: 'Context overflow recovery failed: fail',
        })
      );
      expect(session._autoCompactionAbortController).toBeUndefined();
    });
  });
});
