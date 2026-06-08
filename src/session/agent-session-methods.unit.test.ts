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
});
