// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandRegistry } from './useCommandRegistry';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

// Mock node builtins
vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', () => ({ writeFileSync: vi.fn() }));
vi.mock('node:path', () => ({ join: vi.fn((...parts) => parts.join('/')) }));

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal('process', { exit: mockExit });

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function createMockRuntime(initialMessages: any[] = []): AgentSessionRuntimeInterface {
  return {
    dispose: vi.fn(),
    cwd: '/home/user/project',
    session: {
      messages: initialMessages,
      getSessionStats: vi.fn().mockReturnValue({ userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, tokens: { input: 0, output: 0, total: 0 }, cost: 0, sessionFile: '' }),
      getPerformanceStats: vi.fn().mockReturnValue({ userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, tokens: { input: 0, output: 0, total: 0 }, cost: 0, sessionFile: '' }),
      compact: undefined,
      model: { provider: 'openai', id: 'gpt-4' },
      thinkingLevel: 'medium',
    } as any,
    settings: {
      get: vi.fn().mockReturnValue('light'),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
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

describe('useCommandRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('non-built-in command returns insert', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    let res: string | undefined;
    await act(async () => {
      res = await result.current.handleCommand('unknown');
    });
    expect(res).toBe('insert');
  });

  it('quit calls process.exit(0)', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('quit');
    });
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('thinking with valid level sets level and success toast', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('thinking', '/thinking high');
    });
    expect(runtime.setThinkingLevel).toHaveBeenCalledWith('high');
    expect(ctx.addToast).toHaveBeenCalledWith('Thinking level set to high', 'success');
    expect(ctx.setActiveModal).not.toHaveBeenCalled();
  });

  it('thinking without args opens thinking modal', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('thinking');
    });
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'thinking' });
  });

  it('help opens help modal', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('help');
    });
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'help' });
  });

  it('copy all copies full conversation', async () => {
    const runtime = createMockRuntime([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]);
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('copy', '/copy all');
    });
    expect(runtime.copyToClipboard).toHaveBeenCalledWith('You: Hello\n\nAssistant: Hi');
    expect(ctx.addToast).toHaveBeenCalledWith('Copied full conversation to clipboard', 'success');
  });

  it('copy with no args copies last assistant', async () => {
    const runtime = createMockRuntime([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ]);
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('copy');
    });
    expect(runtime.copyToClipboard).toHaveBeenCalledWith('Hi');
    expect(ctx.addToast).toHaveBeenCalledWith('Copied last assistant message', 'success');
  });

  it('copy shows info when no assistant message', async () => {
    const runtime = createMockRuntime([{ role: 'user', content: 'Hello' }]);
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('copy');
    });
    expect(ctx.addToast).toHaveBeenCalledWith('No assistant message to copy', 'info');
  });

  it('new opens confirmation modal', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('new');
    });
    expect(ctx.setActiveModal).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'confirmation', title: 'New Session' })
    );
  });

  it('settings opens settings modal', async () => {
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    await act(async () => {
      await result.current.handleCommand('settings');
    });
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'settings' });
  });

  it('paste writes file and returns paste', async () => {
    (execFileSync as any).mockReturnValue(Buffer.from('pngdata'));
    const runtime = createMockRuntime();
    const ctx = createMockContext(runtime);
    const { result } = renderHook(() => useCommandRegistry(ctx));
    let res: string | undefined;
    await act(async () => {
      res = await result.current.handleCommand('paste');
    });
    expect(writeFileSync).toHaveBeenCalled();
    expect(res).toBe('paste');
  });
});
