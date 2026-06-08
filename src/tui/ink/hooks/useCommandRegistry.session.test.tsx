import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandRegistry } from './useCommandRegistry';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    dispose: vi.fn(),
    cwd: '/test',
    session: {
      messages: [],
      getSessionStats: vi.fn().mockReturnValue({}),
      getPerformanceStats: vi.fn().mockReturnValue({}),
    } as any,
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    },
    resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) },
    authStorage: {
      getProviders: vi.fn().mockReturnValue([]),
      removeApiKey: vi.fn().mockResolvedValue(undefined),
      getApiKey: vi.fn().mockResolvedValue(null),
    },
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    newSession: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
    setThinkingLevel: vi.fn(),
  };
}

function createMockContext(runtime: AgentSessionRuntimeInterface) {
  return {
    runtime,
    addToast: vi.fn(),
    setActiveModal: vi.fn(),
    messages: runtime.session.messages,
    footerProvider: { updateFromRuntime: vi.fn() },
  };
}

describe('useCommandRegistry /session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens session-info modal', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));

    await act(async () => {
      await result.current.handleCommand('session');
    });

    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'session-info' });
  });
});
