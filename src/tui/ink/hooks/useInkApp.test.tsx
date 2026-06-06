/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInkApp } from './useInkApp';

// Mock dependencies
vi.mock('../../runtime/slash-commands.js', () => ({
  BUILTIN_SLASH_COMMANDS: [
    { name: 'quit' },
    { name: 'thinking' },
    { name: 'help' },
    { name: 'login' },
    { name: 'copy' },
    { name: 'resume' },
    { name: 'new' },
    { name: 'settings' },
    { name: 'model' },
    { name: 'scoped-models' },
    { name: 'tree' },
    { name: 'fork' },
    { name: 'stats' },
    { name: 'arminsayshi' },
    { name: 'dementedelves' },
    { name: 'export' },
    { name: 'import' },
    { name: 'share' },
    { name: 'name' },
    { name: 'session' },
    { name: 'changelog' },
    { name: 'hotkeys' },
    { name: 'clone' },
    { name: 'compact' },
    { name: 'reload' },
    { name: 'logout' },
    { name: 'paste' },
    { name: 'debug' },
  ],
}));

vi.mock('../../config.js', () => ({
  VERSION: '1.0.0',
}));

vi.mock('../components/Footer/FooterDataProvider.js', () => ({
  createFooterDataProvider: () => ({
    updateFromRuntime: vi.fn(),
  }),
}));

// Mock process.exit
const originalExit = process.exit;
beforeAll(() => {
  process.exit = vi.fn();
});
afterAll(() => {
  process.exit = originalExit;
});

function createMockRuntimeDeps(overrides: any = {}) {
  return {
    messages: [],
    status: 'idle',
    thinkingLevel: 'medium',
    sendMessage: vi.fn(),
    isCompacting: false,
    retryAttempt: 0,
    steeringMessages: [],
    followUpMessages: [],
    toolOutputExpanded: false,
    setToolOutputExpanded: vi.fn(),
    hideThinkingBlock: false,
    setHideThinkingBlock: vi.fn(),
    hiddenThinkingLabel: '',
    setHiddenThinkingLabel: vi.fn(),
    currentModel: { id: 'test-model' },
    isStreaming: false,
    ...overrides,
  };
}

describe('useInkApp', () => {
  const mockRuntime = {
    session: { messages: [] },
    cwd: '/tmp',
    settings: { get: vi.fn(), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined), reload: vi.fn().mockResolvedValue(undefined) },
    copyToClipboard: vi.fn(),
    newSession: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
    fork: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    setThinkingLevel: vi.fn(),
    authStorage: { getApiKey: vi.fn(), getProviders: vi.fn().mockReturnValue([]), removeApiKey: vi.fn().mockResolvedValue(undefined) },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime.session = { messages: [] };
  });

  describe('Modal state', () => {
    it('initializes with null modal', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      expect(result.current.activeModal).toBeNull();
    });

    it('openModal sets modal', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      act(() => result.current.openModal({ type: 'help' }));
      expect(result.current.activeModal).toEqual({ type: 'help' });
    });

    it('closeModal clears modal', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      act(() => result.current.openModal({ type: 'help' }));
      act(() => result.current.closeModal());
      expect(result.current.activeModal).toBeNull();
    });
  });

  describe('Toast management', () => {
    it('addToast adds toast with info by default', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      act(() => result.current.addToast('msg'));
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('msg');
      expect(result.current.toasts[0].type).toBe('info');
    });

    it('toast auto-removes after 4s', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      act(() => result.current.addToast('tmp'));
      expect(result.current.toasts).toHaveLength(1);
      act(() => vi.advanceTimersByTime(4000));
      expect(result.current.toasts).toHaveLength(0);
      vi.useRealTimers();
    });

    it('multiple toasts have unique ids', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      act(() => { result.current.addToast('a'); result.current.addToast('b'); });
      const ids = result.current.toasts.map(t => t.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe('Command handling', () => {
    it('quit exits process', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('quit'); });
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('thinking without args opens modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('thinking'); });
      expect(result.current.activeModal).toEqual({ type: 'thinking' });
    });

    it('thinking with arg sets level and success toast', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('thinking', 'low'); });
      expect(mockRuntime.setThinkingLevel).toHaveBeenCalledWith('low');
      expect(result.current.toasts[0].type).toBe('success');
    });

    it('help opens help modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('help'); });
      expect(result.current.activeModal).toEqual({ type: 'help' });
    });

    it('login opens login modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('login'); });
      expect(result.current.activeModal).toEqual({ type: 'login' });
    });

    describe('copy command', () => {
      it('copies last assistant message', async () => {
        mockRuntime.session.messages = [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ];
        mockRuntime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('copy'); });
        expect(mockRuntime.copyToClipboard).toHaveBeenCalledWith('hello');
        expect(result.current.toasts[0].type).toBe('success');
      });

      it('copies full conversation when args=all', async () => {
        mockRuntime.session.messages = [
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ];
        mockRuntime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('copy', 'all'); });
        expect(mockRuntime.copyToClipboard).toHaveBeenCalledWith('You: hi\n\nAssistant: hello');
      });

      it('shows info when no assistant message', async () => {
        mockRuntime.session.messages = [{ role: 'user', content: 'hi' }];
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('copy'); });
        expect(result.current.toasts[0].type).toBe('info');
      });

      it('shows error on copy failure', async () => {
        mockRuntime.session.messages = [{ role: 'assistant', content: 'oops' }];
        mockRuntime.copyToClipboard = vi.fn().mockRejectedValue(new Error('clipboard fail'));
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('copy'); });
        expect(result.current.toasts[0].type).toBe('error');
      });
    });

    it('resume opens session-selector modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('resume'); });
      expect(result.current.activeModal).toEqual({ type: 'session-selector' });
    });

    it('new opens confirmation modal', async () => {
      mockRuntime.newSession = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('new'); });
      expect(result.current.activeModal.type).toBe('confirmation');
      // Simulate confirm
      const modal = result.current.activeModal as any;
      await act(async () => { await modal.onConfirm(); });
      expect(mockRuntime.newSession).toHaveBeenCalled();
      expect(result.current.toasts[0].type).toBe('success');
    });

    it('settings opens settings modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('settings'); });
      expect(result.current.activeModal).toEqual({ type: 'settings' });
    });

    it('model opens model-selector modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('model'); });
      expect(result.current.activeModal).toEqual({ type: 'model-selector' });
    });

    it('scoped-models opens scoped-models modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('scoped-models'); });
      expect(result.current.activeModal).toEqual({ type: 'scoped-models' });
    });

    it('tree opens tree-selector modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('tree'); });
      expect(result.current.activeModal).toEqual({ type: 'tree-selector' });
    });

    it('fork opens user-message-selector modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('fork'); });
      expect(result.current.activeModal).toEqual({ type: 'user-message-selector' });
    });

    describe('stats command', () => {
      it('shows stats modal when available', async () => {
        const stats = { sampleCount: 1, timeSpanMS: 100, avgCpuUserMS: 1, avgCpuSystemMS: 0, avgRSSMB: 10, avgHeapUsedMB: 5, peakRSSMB: 20, peakHeapUsedMB: 10 };
        mockRuntime.session = { getPerformanceStats: vi.fn().mockReturnValue(stats) } as any;
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('stats'); });
        expect(result.current.activeModal).toEqual({ type: 'stats', stats });
      });

      it('shows info toast when stats not available', async () => {
        mockRuntime.session = {} as any;
        const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
        await act(async () => { await result.current.handleCommandSelect('stats'); });
        expect(result.current.toasts[0].type).toBe('info');
      });
    });

    it('arminsayshi opens armin modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('arminsayshi'); });
      expect(result.current.activeModal).toEqual({ type: 'armin' });
    });

    it('dementedelves opens earendil modal', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => { await result.current.handleCommandSelect('dementedelves'); });
      expect(result.current.activeModal).toEqual({ type: 'earendil' });
    });

    it('unknown command returns "insert"', async () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      await act(async () => {
        const ret = await result.current.handleCommandSelect('unknown');
        expect(ret).toBe('insert');
      });
    });
  });

  describe('Global keybindings', () => {
    it('useGlobalKeybindings returns false by default', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      const handled = result.current.useGlobalKeybindings('', { key: { name: 'a', ctrl: false, shift: false, meta: false } });
      expect(handled).toBe(false);
    });
  });

  describe('Footer provider', () => {
    it('is provided', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      expect(result.current.footerProvider).toBeDefined();
      expect(result.current.footerProvider.updateFromRuntime).toBeDefined();
    });
  });

  describe('Effect side effects', () => {
    it('calls footerProvider.updateFromRuntime on mount', () => {
      const { result } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      expect(result.current.footerProvider.updateFromRuntime).toHaveBeenCalled();
    });

    it('registers signal handlers on mount', () => {
      const originalOn = process.on;
      const mockOn = vi.fn();
      process.on = mockOn;
      renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      expect(mockOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
      process.on = originalOn;
    });

    it('cleans up on unmount', () => {
      const mockUnsubscribe = vi.fn();
      mockRuntime.session = { subscribe: vi.fn().mockReturnValue(mockUnsubscribe) } as any;
      const { unmount } = renderHook(() => useInkApp(mockRuntime, createMockRuntimeDeps()));
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
