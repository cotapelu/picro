import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';

describe('AgentSession methods', () => {
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

  it('getSessionStats computes correct counts', () => {
    const history = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi' }], usage: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0, cost: { total: 0.01 } } },
      { role: 'toolResult', content: 'result' },
    ];
    const agent = { subscribe: () => () => {}, state: { history } };
    const agentSession = new AgentSession({
      agent,
      sessionManager: {
        getLeafId: vi.fn(),
        getSessionFile: vi.fn().mockReturnValue({}),
        getSessionId: vi.fn().mockReturnValue('sid'),
      },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    const stats = agentSession.getSessionStats();
    expect(stats.userMessages).toBe(1);
    expect(stats.assistantMessages).toBe(1);
    expect(stats.toolResults).toBe(1);
    expect(stats.toolCalls).toBe(0);
    expect(stats.tokens.input).toBe(10);
    expect(stats.tokens.output).toBe(20);
    expect(stats.cost).toBeCloseTo(0.01);
  });

  it('getContextUsage returns correct usage when model available', () => {
    const history = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'World' }] },
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
    (agentSession as any)._model = { contextWindow: 1000 };
    const usage = agentSession.getContextUsage();
    expect(usage).not.toBeUndefined();
    expect(usage!.contextWindow).toBe(1000);
    expect(usage!.tokens).toBeGreaterThan(0);
    expect(usage!.percent).toBeCloseTo(usage!.tokens / 1000 * 100, 1);
  });

  it('getContextUsage returns undefined when no model', () => {
    const agent = { subscribe: () => () => {}, state: { history: [] } };
    const agentSession = new AgentSession({
      agent,
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getContextUsage()).toBeUndefined();
  });

  it('model getter returns _model', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._model = { id: 'test-model', provider: 'test' };
    expect(agentSession.model).toEqual({ id: 'test-model', provider: 'test' });
  });

  it('getSteeringMessages returns _steeringMessages', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._steeringMessages = ['m1', 'm2'];
    expect(agentSession.getSteeringMessages()).toEqual(['m1', 'm2']);
  });

  it('getFollowUpMessages returns _followUpMessages', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._followUpMessages = ['f1', 'f2'];
    expect(agentSession.getFollowUpMessages()).toEqual(['f1', 'f2']);
  });

  it('clearQueue returns copies and clears queues, calls agent.clearAllQueues', () => {
    const agent = {
      subscribe: () => () => {},
      clearAllQueues: vi.fn(),
    } as any;
    const agentSession = new AgentSession({
      agent,
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._steeringMessages = ['s'];
    (agentSession as any)._followUpMessages = ['f'];
    const result = agentSession.clearQueue();
    expect(result).toEqual({ steering: ['s'], followUp: ['f'] });
    expect((agentSession as any)._steeringMessages).toEqual([]);
    expect((agentSession as any)._followUpMessages).toEqual([]);
    expect(agent.clearAllQueues).toHaveBeenCalled();
  });

  it('getToolDefinition returns from _toolDefinitions map', () => {
    const def = { name: 'test', description: 'desc' };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._toolDefinitions.set('test', def);
    expect(agentSession.getToolDefinition('test')).toBe(def);
    expect(agentSession.getToolDefinition('other')).toBeUndefined();
  });

  it('setModel updates _model and settings, emits event', async () => {
    const model = { id: 'm1', provider: 'p1', contextWindow: 1000 };
    const sessionManager = {
      getLeafId: vi.fn(),
      appendModelChange: vi.fn(),
    };
    const settingsManager = {
      getCompactionEnabled: vi.fn(),
      setCompactionEnabled: vi.fn(),
      setDefaultProvider: vi.fn(),
      setDefaultModel: vi.fn(),
    };
    const agent = { setModel: vi.fn(), subscribe: () => () => {} } as any;
    const modelRegistry = {
      hasConfiguredAuth: vi.fn().mockReturnValue(true),
    } as any;
    const agentSession = new AgentSession({
      agent,
      sessionManager,
      settingsManager,
      cwd: '/test',
      resourceLoader: {},
      modelRegistry,
    });
    await agentSession.setModel(model);
    expect((agentSession as any)._model).toBe(model);
    expect(agent.setModel).toHaveBeenCalledWith(model);
    expect(sessionManager.appendModelChange).toHaveBeenCalledWith('p1', 'm1');
    expect(settingsManager.setDefaultProvider).toHaveBeenCalledWith('p1');
    expect(settingsManager.setDefaultModel).toHaveBeenCalledWith('m1');
  });

  // Additional tests for thinking level and tool info

  it('getActiveToolNames returns agent.getToolNames()', () => {
    const agent = { getToolNames: vi.fn().mockReturnValue(['tool1', 'tool2']), subscribe: () => () => {} } as any;
    const agentSession = new AgentSession({
      agent,
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    expect(agentSession.getActiveToolNames()).toEqual(['tool1', 'tool2']);
  });

  it('getAllTools returns mapped _toolDefinitions', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._toolDefinitions.set('t1', { name: 't1', description: 'desc1' } as any);
    (agentSession as any)._toolDefinitions.set('t2', { name: 't2', description: 'desc2', parameters: {} } as any);
    const tools = agentSession.getAllTools();
    expect(tools).toHaveLength(2);
    expect(tools[0]).toEqual({ name: 't1', description: 'desc1' });
    expect(tools[1]).toEqual({ name: 't2', description: 'desc2', parameters: {} });
  });

  it('getAvailableThinkingLevels includes xhigh when model has reasoning', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._model = { reasoning: true };
    const levels = agentSession.getAvailableThinkingLevels();
    expect(levels).toContain('xhigh');
  });

  it('getAvailableThinkingLevels excludes xhigh when model lacks reasoning', () => {
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager: { getLeafId: vi.fn() },
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    (agentSession as any)._model = { reasoning: false };
    const levels = agentSession.getAvailableThinkingLevels();
    expect(levels).not.toContain('xhigh');
  });

  it('setThinkingLevel updates _thinkingLevel and appends entry', () => {
    const sessionManager = {
      getLeafId: vi.fn(),
      appendThinkingLevelChange: vi.fn(),
    };
    const agentSession = new AgentSession({
      agent: { subscribe: () => () => {} },
      sessionManager,
      settingsManager: { getCompactionEnabled: vi.fn(), setCompactionEnabled: vi.fn() },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    });
    agentSession.setThinkingLevel('low');
    expect((agentSession as any)._thinkingLevel).toBe('low');
    expect(sessionManager.appendThinkingLevelChange).toHaveBeenCalledWith('low');
  });
});
