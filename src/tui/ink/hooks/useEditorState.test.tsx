// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorState } from './useEditorState';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

// Mock node:child_process for bash mode
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    dispose: vi.fn().mockResolvedValue(undefined),
    cwd: '/tmp',
    session: {
      messages: [],
      getSessionStats: vi.fn().mockReturnValue({ userMessages: 0, assistantMessages: 0, toolCalls: 0, toolResults: 0, tokens: { input: 0, output: 0, total: 0 }, cost: 0, sessionFile: '' }),
    } as any,
    settings: {
      set: vi.fn(),
      save: vi.fn(),
    },
    resourceLoader: { reload: vi.fn() },
    copyToClipboard: vi.fn(),
    newSession: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
  };
}

function createMockDeps(runtime: AgentSessionRuntimeInterface) {
  return {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    handleCommandSelect: vi.fn().mockResolvedValue(undefined),
    openModal: vi.fn(),
    addToast: vi.fn(),
  };
}

describe('useEditorState', () => {
  let runtime: AgentSessionRuntimeInterface;
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    runtime = createMockRuntime();
    deps = createMockDeps(runtime);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initial state is empty and not submitting', () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    expect(result.current.inputValue).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('setInputValue updates inputValue', () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('hello world');
    });
    expect(result.current.inputValue).toBe('hello world');
  });

  it('handleSubmit returns early if input is empty', async () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(deps.sendMessage).not.toHaveBeenCalled();
  });

  it('handleSubmit regular message calls sendMessage and resets state', async () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('hello');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.sendMessage).toHaveBeenCalledWith('hello');
    expect(result.current.inputValue).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handleSubmit regular message error still resets state', async () => {
    deps.sendMessage.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('oops');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.sendMessage).toHaveBeenCalled();
    expect(result.current.inputValue).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handleSubmit trims whitespace before processing', async () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('  hello  ');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.sendMessage).toHaveBeenCalledWith('hello');
  });

  it('handleSubmit bash command without context (!cmd) executes and shows modal', async () => {
    (execSync as any).mockReturnValue('output');

    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('!ls');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(execSync).toHaveBeenCalledWith('ls', { encoding: 'utf-8', stdio: 'pipe' });
    expect(deps.openModal).toHaveBeenCalledWith({
      type: 'bash-output',
      command: 'ls',
      output: 'output',
      error: undefined,
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handleSubmit bash command with context (!!cmd) executes and shows modal', async () => {
    (execSync as any).mockReturnValue('result');

    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('!!pwd');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(execSync).toHaveBeenCalledWith('pwd', { encoding: 'utf-8', stdio: 'pipe' });
    expect(deps.openModal).toHaveBeenCalledWith({
      type: 'bash-output',
      command: 'pwd',
      output: 'result',
      error: undefined,
    });
  });

  it('handleSubmit bash command error shows modal with error', async () => {
    (execSync as any).mockImplementation(() => {
      throw new Error('command not found');
    });

    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('!false');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.openModal).toHaveBeenCalledWith({
      type: 'bash-output',
      command: 'false',
      output: expect.stringContaining('command not found'),
      error: true,
    });
  });

  it('handleSubmit slash command calls handleCommandSelect and resets', async () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('/help');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.handleCommandSelect).toHaveBeenCalledWith('help', '/help');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('handleSubmit slash command error logs and resets', async () => {
    deps.handleCommandSelect.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('/unknown');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(deps.handleCommandSelect).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Slash command error:', expect.stringMatching(/fail/));
    expect(result.current.isSubmitting).toBe(false);

    consoleSpy.mockRestore();
  });

  it('handleInterrupt: single Ctrl+C clears input', () => {
    const { result } = renderHook(() => useEditorState(runtime, deps));
    act(() => {
      result.current.setInputValue('some text');
    });
    expect(result.current.inputValue).toBe('some text');

    act(() => {
      result.current.onInterrupt();
    });

    expect(result.current.inputValue).toBe('');
    expect(runtime.dispose).not.toHaveBeenCalled();
  });

  it('handleInterrupt: double Ctrl+C calls dispose and exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    const { result } = renderHook(() => useEditorState(runtime, deps));

    // Set input to have something to clear on first interrupt (optional)
    act(() => {
      result.current.setInputValue('text');
    });

    // Simulate first Ctrl+C at virtual time 1000 (>>500 from initial 0)
    await act(async () => {
      vi.setSystemTime(1000);
      result.current.onInterrupt();
    });
    // Single interrupt: clears input, does not dispose
    expect(result.current.inputValue).toBe('');
    expect(runtime.dispose).not.toHaveBeenCalled();

    // Simulate second Ctrl+C at virtual time 1200 (within 500ms)
    await act(async () => {
      vi.setSystemTime(1200);
      result.current.onInterrupt();
    });

    expect(runtime.dispose).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
