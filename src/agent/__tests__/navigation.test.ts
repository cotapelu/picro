import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from '../agent-session';
import type { Agent } from '../agent';
import type { SessionManager } from '../../session/session-manager';
import type { SettingsManager } from '../settings-manager';
import type { ModelRegistry } from '../model-registry';
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
  const entries: any[] = [];
  const byId = new Map<string, any>();
  let leafId: string | null = null;

  const sm: any = {
    _entries: entries,
    _byId: byId,
    getEntries: vi.fn(() => entries),
    getBranch: vi.fn((fromId?: string) => {
      const start = fromId ?? leafId;
      if (!start) return [];
      const branch: any[] = [];
      let current = byId.get(start);
      while (current) {
        branch.unshift(current);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return branch;
    }),
    getEntry: vi.fn((id) => byId.get(id)),
    getLeafId: vi.fn(() => leafId),
    setLeafId: vi.fn((id) => { leafId = id; }),
    appendEntry: vi.fn((entry) => {
      entries.push(entry);
      byId.set(entry.id, entry);
      leafId = entry.id;
    }),
    branch: vi.fn((newLeafId) => { leafId = newLeafId; }),
    branchWithSummary: vi.fn((targetId, summary, details, fromExtension) => {
      const id = 'summary-' + Math.random().toString(36).substr(2, 8);
      const entry = {
        type: 'branch_summary' as const,
        id,
        parentId: targetId,
        timestamp: new Date().toISOString(),
        summary,
        details,
        fromExtension,
      };
      entries.push(entry);
      byId.set(id, entry);
      leafId = id;
      return id;
    }),
    resetLeaf: vi.fn(() => { leafId = null; }),
    appendLabelChange: vi.fn(),
    appendSessionInfo: vi.fn(),
    buildSessionContext: vi.fn(() => ({ messages: [] })),
    getLatestCompactionEntry: vi.fn(() => null),
    getSessionFile: vi.fn(() => '/tmp/test.jsonl'),
    getSessionId: vi.fn(() => 'test-session'),
    getSessionName: vi.fn(() => undefined),
    getCwd: vi.fn(() => '/tmp'),
  };
  return sm as any;
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

describe('Branch Navigation', () => {
  let session: AgentSession;
  let mockSessionManager: any;
  let eventListeners: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionManager = createMockSessionManager();

    const model: Model = { id: 'test', provider: 'test', contextWindow: 128000, reasoning: false } as any;
    const mockAgent = createMockAgent() as any;
    mockAgent.state.model = model;

    const config = createAgentSessionConfig({
      agent: mockAgent,
      sessionManager: mockSessionManager,
    });

    // @ts-ignore
    session = new AgentSession(config);
    (session as any)._model = model;
    (session as any)._extensionRunner = undefined; // ensure no extension

    eventListeners = [];
    // @ts-ignore
    session.subscribe((event: any) => eventListeners.push(event));

    // Create a small tree: user1 -> asst1 -> asst2 (leaf)
    const user1 = {
      type: 'message' as const,
      id: 'msg-1',
      parentId: null,
      timestamp: new Date().toISOString(),
      message: { role: 'user', content: [{ type: 'text', text: 'First user' }], timestamp: Date.now() },
    };
    const asst1 = {
      type: 'message' as const,
      id: 'msg-2',
      parentId: 'msg-1',
      timestamp: new Date().toISOString(),
      message: { role: 'assistant', content: [{ type: 'text', text: 'Assistant reply 1' }], timestamp: Date.now() },
    };
    const asst2 = {
      type: 'message' as const,
      id: 'msg-3',
      parentId: 'msg-2',
      timestamp: new Date().toISOString(),
      message: { role: 'assistant', content: [{ type: 'text', text: 'Assistant reply 2' }], timestamp: Date.now() },
    };
    [user1, asst1, asst2].forEach(e => {
      mockSessionManager._byId.set(e.id, e);
      mockSessionManager._entries.push(e);
    });
    mockSessionManager.setLeafId('msg-3');
  });

  it('should navigate to user message and return editor text', async () => {
    const result = await (session as any).navigateTree('msg-1');
    expect(result.cancelled).toBe(false);
    expect(result.editorText).toBe('First user');
    expect(mockSessionManager.getLeafId()).toBe(null);
  });

  it('should emit session_tree event', async () => {
    await (session as any).navigateTree('msg-1');
    const treeEvents = eventListeners.filter(e => e.type === 'session_tree');
    expect(treeEvents.length).toBeGreaterThan(0);
    expect(treeEvents[0].newLeafId).toBe(null);
    expect(treeEvents[0].oldLeafId).toBe('msg-3');
  });

  it('should create branch summary when summarize=true', async () => {
    await (session as any).navigateTree('msg-2', { summarize: true });
    expect(mockSessionManager.branchWithSummary).toHaveBeenCalled();
    const hasSummary = mockSessionManager._entries.some((e: any) => e.type === 'branch_summary');
    expect(hasSummary).toBe(true);
  });

  it('should not summarize without model', async () => {
    (session as any)._model = undefined;
    await expect((session as any).navigateTree('msg-2', { summarize: true }))
      .rejects.toThrow('No model available for summarization');
  });

  it('should handle non-existent target', async () => {
    await expect((session as any).navigateTree('nonexistent')).rejects.toThrow('not found');
  });
});
