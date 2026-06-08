import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRuntime } from './useRuntime';

function createMockRuntime(): any {
  const session: any = {
    messages: [],
    isStreaming: false,
    thinkingLevel: 'medium',
    model: { id: 'test-model', provider: 'test' },
    subscribe: vi.fn().mockReturnValue(() => {}),
    getSteeringMessages: vi.fn().mockReturnValue([]),
    getFollowUpMessages: vi.fn().mockReturnValue([]),
    getToolDefinition: vi.fn(),
    cycleThinkingLevel: vi.fn().mockReturnValue('high'),
    setModel: vi.fn().mockResolvedValue(undefined),
    sessionManager: {
      getSessionName: vi.fn().mockReturnValue('Test Session'),
      getEntries: vi.fn().mockReturnValue([]),
      getCwd: vi.fn().mockReturnValue('/test/cwd'),
    },
    resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) },
    getPerformanceStats: vi.fn().mockReturnValue({ sampleCount: 10, avgCpuUserMS: 2.5, avgRSSMB: 100 }),
    getSessionStats: vi.fn().mockReturnValue({ sessionFile: '/tmp/session.jsonl', userMessages: 1, assistantMessages: 1, toolCalls: 0, toolResults: 0, tokens: { input: 10, output: 5, total: 15 }, cost: 0.001 }),
  };

  const runtime: any = {
    cwd: '/test/cwd',
    thinkingLevel: 'medium',
    session,
    settings: {
      get: vi.fn((key: string) => {
        if (key === 'defaultThinkingLevel') return 'medium';
        return undefined;
      }),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    },
    setThinkingLevel: vi.fn(),
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(undefined),
    newSession: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
  };

  return runtime;
}

describe('useRuntime setters and state', () => {
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
  });

  it('setToolOutputExpanded toggles state', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    expect(result.current.toolOutputExpanded).toBe(false);
    act(() => {
      result.current.setToolOutputExpanded(true);
    });
    expect(result.current.toolOutputExpanded).toBe(true);
    act(() => {
      result.current.setToolOutputExpanded(false);
    });
    expect(result.current.toolOutputExpanded).toBe(false);
  });

  it('setHideThinkingBlock toggles state', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    expect(result.current.hideThinkingBlock).toBe(false);
    act(() => {
      result.current.setHideThinkingBlock(true);
    });
    expect(result.current.hideThinkingBlock).toBe(true);
  });

  it('setHiddenThinkingLabel updates label', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    expect(result.current.hiddenThinkingLabel).toBe('Thinking...');
    act(() => {
      result.current.setHiddenThinkingLabel('Processing...');
    });
    expect(result.current.hiddenThinkingLabel).toBe('Processing...');
  });

  it('setMessages allows direct message mutation', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    expect(result.current.messages).toEqual([]);
    const newMsg = { id: 'm1', role: 'user', content: 'Hello', timestamp: Date.now() };
    act(() => {
      result.current.setMessages([newMsg]);
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('m1');
  });
});
