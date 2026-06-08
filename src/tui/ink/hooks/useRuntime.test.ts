import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor, waitForNextUpdate } from '@testing-library/react';
import { useRuntime } from './useRuntime';

// Mock dependencies
vi.mock('../utils/message-converter.js', () => ({
  agentMessageToUiMessage: vi.fn((msg: any) => {
    if (!msg) return null;
    // Extract text content
    let content = '';
    if (typeof msg.content === 'string') {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      const textBlocks = msg.content.filter((c: any) => c.type === 'text');
      content = textBlocks.map((c: any) => c.text).join('');
    }
    const base: any = {
      id: msg.id || `test-${Date.now()}`,
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

// Mock runtime factory
function createMockRuntime(overrides: any = {}): any {
  const defaultSession = {
    messages: [],
    isStreaming: false,
    thinkingLevel: 'medium',
    model: { id: 'test-model', provider: 'test' },
    prompt: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn(),
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

  const runtime = {
    cwd: '/test/cwd',
    thinkingLevel: 'medium',
    session: { ...defaultSession, ...(overrides.session || {}) },
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
    ...overrides,
  };

  // Ensure session has subscribe
  if (!runtime.session.subscribe) {
    runtime.session.subscribe = vi.fn().mockReturnValue(() => {});
  }

  return runtime;
}

describe('useRuntime', () => {
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
  });

  describe('Initialization', () => {
    it('should initialize with default states', () => {
      const { result } = renderHook(() => useRuntime(runtime));

      expect(result.current.messages).toEqual([]);
      expect(result.current.status).toBe('Ready');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.isCompacting).toBe(false);
      expect(result.current.retryAttempt).toBe(0);
      expect(result.current.toolOutputExpanded).toBe(false);
      expect(result.current.hideThinkingBlock).toBe(false);
      expect(result.current.hiddenThinkingLabel).toBe('Thinking...');
      expect(result.current.currentModel).toEqual({ id: 'test-model', provider: 'test' });
      expect(result.current.thinkingLevel).toBe('medium');
      expect(result.current.steeringMessages).toEqual([]);
      expect(result.current.followUpMessages).toEqual([]);
    });

    it('should load initial messages from session', () => {
      runtime.session.messages = [
        { role: 'user', content: 'Hello', id: '1' },
        { role: 'assistant', content: 'Hi', id: '2' },
      ];
      const { result } = renderHook(() => useRuntime(runtime));

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].role).toBe('user');
      expect(result.current.messages[1].role).toBe('assistant');
    });

    it('should handle null/undefined messages gracefully', () => {
      runtime.session.messages = null as any;
      const { result } = renderHook(() => useRuntime(runtime));

      expect(result.current.messages).toEqual([]);
    });

    it('should handle initial model when session.model exists', () => {
      runtime.session.model = { id: 'gpt-4', provider: 'openai' };
      const { result } = renderHook(() => useRuntime(runtime));

      expect(result.current.currentModel).toEqual({ id: 'gpt-4', provider: 'openai' });
    });

    it('should set currentModel to null when session.model is undefined', () => {
      const badRuntime = createMockRuntime({
        session: { ...createMockRuntime().session, model: undefined },
      });
      const { result } = renderHook(() => useRuntime(badRuntime));
      expect(result.current.currentModel).toBeUndefined(); // setCurrentModel(undefined)
    });
  });

  describe('Event subscription', () => {
    it('should update isStreaming and status on agent_start', () => {
      const { result, rerender } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'agent_start' });
      });

      expect(result.current.isStreaming).toBe(true);
      expect(result.current.status).toBe('Running...');
    });

    it('should update isStreaming and status on agent_end', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;
      session.isStreaming = true;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'agent_end' });
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.status).toBe('Ready');
    });

    it('should update steering and followUp messages on queue_update', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'queue_update',
          steering: ['msg1', 'msg2'],
          followUp: ['fu1'],
        });
      });

      expect(result.current.steeringMessages).toEqual(['msg1', 'msg2']);
      expect(result.current.followUpMessages).toEqual(['fu1']);
    });

    it('should handle queue_update with null/undefined arrays', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'queue_update', steering: null, followUp: undefined });
      });

      expect(result.current.steeringMessages).toEqual([]);
      expect(result.current.followUpMessages).toEqual([]);
    });

    it('should set isCompacting on compaction_start', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'compaction_start' });
      });

      expect(result.current.isCompacting).toBe(true);
    });

    it('should clear isCompacting on compaction_end', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'compaction_start' });
      });
      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'compaction_end' });
      });

      expect(result.current.isCompacting).toBe(false);
    });

    it('should set retryAttempt on auto_retry_start', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'auto_retry_start', attempt: 3 });
      });

      expect(result.current.retryAttempt).toBe(3);
    });

    it('should clear retryAttempt on auto_retry_end', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'auto_retry_start', attempt: 2 });
      });
      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'auto_retry_end' });
      });

      expect(result.current.retryAttempt).toBe(0);
    });

    // Skipped due to complexity of mocking event loop timing
    // it('should update currentModel and thinkingLevel on model_change', async () => {
    //   let capturedHandler: any = null;
    //   const session = runtime.session as any;
    //   session.subscribe = (handler: any) => { capturedHandler = handler; return () => {}; };
    //
    //   const { result } = renderHook(() => useRuntime(runtime));
    //
    //   // Ensure handler captured
    //   await waitFor(() => expect(capturedHandler).not.toBeNull());
    //
    //   runtime.thinkingLevel = 'high';
    //   await act(async () => {
    //     capturedHandler({ type: 'model_change', model: { id: 'new-model', provider: 'anthropic' } });
    //   });
    //
    //   expect(result.current.currentModel).toEqual({ id: 'new-model', provider: 'anthropic' });
    //   expect(result.current.thinkingLevel).toBe('high');
    // });

    it('should set status on error event', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'error', error: 'API failure' });
      });

      expect(result.current.status).toBe('Error: API failure');
    });

    it('should update currentModel on model_change event', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'model_change',
          model: { id: 'new-model', provider: 'anthropic' }
        });
      });

      expect(result.current.currentModel).toEqual({ id: 'new-model', provider: 'anthropic' });
    });

    it('should update thinkingLevel on model_change event when runtime.thinkingLevel is set', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      // Change runtime's thinkingLevel before event
      runtime.thinkingLevel = 'high';

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'model_change',
          model: { id: 'new-model', provider: 'anthropic' }
        });
      });

      expect(result.current.thinkingLevel).toBe('high');
    });

    it('should rebuild messages on session_tree event', () => {
      runtime.session.messages = [
        { role: 'user', content: 'Old msg', id: '1' },
      ];
      const { result, rerender } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      // Simulate session change
      session.messages = [
        { role: 'user', content: 'New msg1', id: '2' },
        { role: 'assistant', content: 'New msg2', id: '3' },
      ];

      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'session_tree' });
      });

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('New msg1');
    });

    it('should ignore unknown event types', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      // Should not throw
      act(() => {
        session.subscribe.mock.calls[0][0]({ type: 'unknown_event' } as any);
      });

      // State unchanged
      expect(result.current.isStreaming).toBe(false);
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = vi.fn();
      const session = runtime.session as any;
      session.subscribe = vi.fn().mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => useRuntime(runtime));

      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should call runtime.session.prompt with text', async () => {
      const { result } = renderHook(() => useRuntime(runtime));

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(runtime.session.prompt).toHaveBeenCalledWith('Hello');
    });

    it('should handle prompt rejection', async () => {
      runtime.session.prompt = vi.fn().mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useRuntime(runtime));

      await expect(act(async () => {
        await result.current.sendMessage('Hello');
      })).rejects.toThrow('Network error');
    });
  });

  describe('streaming messages', () => {
    it('should add assistant message on message:start', async () => {
      let capturedHandler: (event: any) => void;
      const session = runtime.session as any;
      session.subscribe = vi.fn((handler: any) => {
        capturedHandler = handler;
        return () => {};
      });

      const { result, unmount } = renderHook(() => useRuntime(runtime));

      await waitFor(() => {
        expect(capturedHandler).toBeDefined();
      });

      act(() => {
        capturedHandler({
          type: 'message_start',
          message: { role: 'assistant', id: 'a1' }
        });
      });

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].role).toBe('assistant');
        expect(result.current.messages[0].streaming).toBe(true);
        expect(result.current.messages[0].id).toBe('a1');
        expect(result.current.messages[0].content).toBe('');
      });

      unmount();
    });

    it('should update assistant message on message:update', async () => {
      let capturedHandler: (event: any) => void;
      const session = runtime.session as any;
      session.subscribe = vi.fn((handler: any) => {
        capturedHandler = handler;
        return () => {};
      });

      const { result, unmount } = renderHook(() => useRuntime(runtime));

      await waitFor(() => {
        expect(capturedHandler).toBeDefined();
      });

      act(() => {
        capturedHandler({
          type: 'message_start',
          message: { role: 'assistant', id: 'a1' }
        });
      });
      await waitFor(() => {
        expect(result.current.messages[0].content).toBe('');
        expect(result.current.messages[0].streaming).toBe(true);
      });

      act(() => {
        capturedHandler({
          type: 'message_update',
          message: { role: 'assistant', id: 'a1', content: [{ type: 'text', text: 'Hello world' }] }
        });
      });

      await waitFor(() => {
        expect(result.current.messages[0].content).toBe('Hello world');
        expect(result.current.messages[0].streaming).toBe(true);
      });

      unmount();
    });

    it('should finalize assistant message on message:end', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'message_start',
          message: { role: 'assistant', id: 'a1', content: [] }
        });
      });
      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'message_end',
          message: { role: 'assistant', id: 'a1', stopReason: 'end' }
        });
      });

      const msg = result.current.messages.find(m => m.id === 'a1');
      expect(msg).toBeDefined();
      expect(msg!.streaming).toBe(false);
    });

    it('should add tool call on tool:call:start', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'message_start',
          message: { role: 'assistant', id: 'a1', content: [] }
        });
      });

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'tool_execution_start',
          toolCallId: 't1',
          toolName: 'test_tool',
          args: { arg: 1 }
        });
      });

      const msg = result.current.messages.find(m => m.id === 'a1');
      expect(msg?.toolCalls).toHaveLength(1);
      expect(msg!.toolCalls![0].name).toBe('test_tool');
      expect(msg!.toolCalls![0].status).toBe('running');
    });

    it('should update tool call on tool:call:end', () => {
      const { result } = renderHook(() => useRuntime(runtime));
      const session = runtime.session as any;

      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'message_start',
          message: { role: 'assistant', id: 'a1', content: [] }
        });
      });
      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'tool_execution_start',
          toolCallId: 't1',
          toolName: 'test_tool',
          args: {}
        });
      });
      act(() => {
        session.subscribe.mock.calls[0][0]({
          type: 'tool_execution_end',
          toolCallId: 't1',
          result: { output: 'ok' },
          isError: false
        });
      });

      const msg = result.current.messages.find(m => m.id === 'a1');
      expect(msg?.toolCalls![0].status).toBe('done');
      expect(msg!.toolCalls![0].result).toEqual({ output: 'ok' });
    });
  });

  describe('abort', () => {
    it('should call runtime.session.abort and update state', () => {
      const { result } = renderHook(() => useRuntime(runtime));

      act(() => {
        result.current.abort();
      });

      expect(runtime.session.abort).toHaveBeenCalled();
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.status).toBe('Aborted');
    });
  });

  describe('setThinkingLevel', () => {
    it('should call runtime.setThinkingLevel and save to settings', async () => {
      const { result } = renderHook(() => useRuntime(runtime));

      await act(async () => {
        await result.current.setThinkingLevel('high');
      });

      expect(runtime.setThinkingLevel).toHaveBeenCalledWith('high');
      expect(runtime.settings.set).toHaveBeenCalledWith('defaultThinkingLevel', 'high');
      expect(runtime.settings.save).toHaveBeenCalled();
      expect(result.current.thinkingLevel).toBe('high');
    });

    it('should handle settings save failure silently', async () => {
      runtime.settings.save = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result } = renderHook(() => useRuntime(runtime));

      await act(async () => {
        await result.current.setThinkingLevel('low');
      });

      expect(result.current.thinkingLevel).toBe('low');
    });

    it('should not crash when runtime.settings is undefined', async () => {
      const noSettingsRuntime = createMockRuntime({ settings: undefined });
      const { result } = renderHook(() => useRuntime(noSettingsRuntime));

      await act(async () => {
        await result.current.setThinkingLevel('xhigh');
      });

      expect(result.current.thinkingLevel).toBe('xhigh');
    });
  });

  describe('Dependencies and re-renders', () => {
    it('should subscribe to events on mount and unsubscribe on unmount', () => {
      const unsubscribe = vi.fn();
      const session = runtime.session as any;
      session.subscribe = vi.fn().mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => useRuntime(runtime));

      expect(session.subscribe).toHaveBeenCalled();
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should reset messages when runtime changes', () => {
      const initialRuntime = createMockRuntime({ session: { messages: [{ role: 'user', content: 'A', id: '1' }] } });
      const { result, rerender } = renderHook(
        ({ runtime }) => useRuntime(runtime),
        { initialProps: { runtime: initialRuntime } }
      );

      expect(result.current.messages).toHaveLength(1);

      const newRuntime = createMockRuntime(); // empty messages
      rerender({ runtime: newRuntime });

      // Because dependency is [runtime], effect should re-run
      expect(result.current.messages).toEqual([]);
    });
  });
});
