import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRuntime } from './useRuntime';

// Mock message converter to produce predictable UI messages
vi.mock('../utils/message-converter.js', () => ({
  agentMessageToUiMessage: vi.fn((msg: any) => {
    if (!msg) return null;
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      const textBlocks = msg.content.filter((c: any) => c.type === 'text');
      content = textBlocks.map((c: any) => c.text).join('');
    }
    const base: any = {
      id: msg.id || `msg-${Date.now()}`,
      role: msg.role,
      content,
      timestamp: msg.timestamp || Date.now(),
    };
    if (msg.role === 'assistant') {
      if (Array.isArray(msg.content)) {
        const thinking: string[] = [];
        msg.content.forEach((c: any) => {
          if (c.type === 'thinking') thinking.push(c.thinking);
        });
        if (thinking.length) base.thinkingBlocks = thinking;
        const toolCallBlocks = msg.content.filter((c: any) => c.type === 'toolCall');
        if (toolCallBlocks.length) {
          base.toolCalls = toolCallBlocks.map((c: any) => ({
            id: c.id,
            name: c.name,
            arguments: c.arguments,
            status: 'pending',
          }));
        }
      }
      if (msg.toolCalls) base.toolCalls = msg.toolCalls;
      if (msg.thinkingBlocks) base.thinkingBlocks = msg.thinkingBlocks;
      base.streaming = msg.streaming ?? false;
    }
    return base;
  }),
}));

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

describe('useRuntime event handling', () => {
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
  });

  it('handles agent_start event', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'agent_start' });
    });

    expect(result.current.isStreaming).toBe(true);
    expect(result.current.status).toBe('Running...');
  });

  it('handles agent_end event', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'agent_start' });
    });
    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'agent_end' });
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.status).toBe('Ready');
  });

  it('handles message_start for assistant with tool calls', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Thinking' },
        { type: 'toolCall', id: 'tc1', name: 'read', arguments: { path: '/a' } },
      ],
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });

    expect(result.current.messages).toHaveLength(1);
    const msg = result.current.messages[0];
    expect(msg.role).toBe('assistant');
    expect(msg.streaming).toBe(true);
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0].name).toBe('read');
  });

  it('handles message_update for assistant', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello' }],
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });
    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_update', message: { ...turn, content: [{ type: 'text', text: 'Hello World' }] } });
    });

    const msg = result.current.messages[0];
    expect(msg.content).toBe('Hello World');
    expect(msg.streaming).toBe(true);
  });

  it('handles message_end for assistant', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Done' }],
      stopReason: 'done',
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });
    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_end', message: turn });
    });

    const msg = result.current.messages[0];
    expect(msg.streaming).toBe(false);
    expect(msg.error).toBeUndefined();
  });

  it('handles message_end with aborted stopReason', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Aborted' }],
      stopReason: 'aborted',
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });
    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_end', message: turn });
    });

    const msg = result.current.messages[0];
    expect(msg.error).toBe('aborted');
  });

  it('handles tool_execution_start adding tool call', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Response' }],
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });

    const toolCallId = 'tool123';
    act(() => {
      session.subscribe.mock.calls[0][0]({
        type: 'tool_execution_start',
        toolCallId,
        toolName: 'read',
        args: { path: '/a' },
      });
    });

    const msg = result.current.messages[0];
    expect(msg.toolCalls).toHaveLength(1);
    expect(msg.toolCalls[0].id).toBe(toolCallId);
    expect(msg.toolCalls[0].status).toBe('running');
  });

  it('handles tool_execution_end updating tool call status', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    const turn = {
      id: 'turn1',
      role: 'assistant',
      content: [{ type: 'text', text: 'Response' }],
    };

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'message_start', message: turn });
    });
    const toolCallId = 'tool123';
    act(() => {
      session.subscribe.mock.calls[0][0]({
        type: 'tool_execution_start',
        toolCallId,
        toolName: 'read',
        args: { path: '/a' },
      });
    });
    act(() => {
      session.subscribe.mock.calls[0][0]({
        type: 'tool_execution_end',
        toolCallId,
        result: 'file content',
        isError: false,
      });
    });

    const msg = result.current.messages[0];
    const tc = msg.toolCalls.find((t: any) => t.id === toolCallId);
    expect(tc.status).toBe('done');
    expect(tc.result).toBe('file content');
  });

  it('handles session_tree event rebuilding messages', () => {
    const { result } = renderHook(() => useRuntime(runtime));
    const session = runtime.session as any;

    // Initial messages are empty
    expect(result.current.messages).toEqual([]);

    // Simulate session manager returning entries that convert to messages
    session.messages = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
    ];

    act(() => {
      session.subscribe.mock.calls[0][0]({ type: 'session_tree' });
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
  });
});
