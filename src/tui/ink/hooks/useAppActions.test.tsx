// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppActions } from './useAppActions';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

// Mock node:child_process, fs, path, os used by onEditor/onDebug
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));
vi.mock('node:fs', () => ({
  mkdtempSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
}));
vi.mock('node:path', () => ({
  join: vi.fn((...parts: string[]) => parts.join('/')),
}));
vi.mock('node:os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock clipboard-image utility
vi.mock('../../utils/clipboard-image.js', () => ({
  readClipboardImage: vi.fn(),
}));

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join as pathJoin } from 'node:path';
import { tmpdir } from 'node:os';
import { readClipboardImage } from '../../utils/clipboard-image.js';

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    dispose: vi.fn(),
    cwd: '/home/user/project',
    session: {
      messages: [
        { role: 'user', id: 'u1', content: 'Hello' },
        { role: 'assistant', id: 'a1', content: 'Hi there!' },
      ],
      getSessionStats: vi.fn().mockReturnValue({
        userMessages: 1,
        assistantMessages: 1,
        toolCalls: 0,
        toolResults: 0,
        tokens: { input: 10, output: 5, total: 15 },
        cost: 0.001,
        sessionFile: '/sessions/123',
      }),
      getPerformanceStats: vi.fn().mockReturnValue({
        userMessages: 1,
        assistantMessages: 1,
        toolCalls: 0,
        toolResults: 0,
        tokens: { input: 10, output: 5, total: 15 },
        cost: 0.001,
        sessionFile: '/sessions/123',
      }),
      compact: vi.fn().mockResolvedValue(undefined),
    } as any,
    settings: {
      get: vi.fn().mockReturnValue('light'),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    },
    resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) },
    authStorage: {
      getProviders: vi.fn().mockReturnValue(['github', 'openai']),
      removeApiKey: vi.fn().mockResolvedValue(undefined),
    },
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    newSession: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDeps(runtime: AgentSessionRuntimeInterface) {
  return {
    openModal: vi.fn(),
    addToast: vi.fn(),
    setToolOutputExpanded: vi.fn(),
    setHideThinkingBlock: vi.fn(),
    toolOutputExpanded: false,
    hideThinkingBlock: false,
    toggleTheme: vi.fn(),
    isDark: false,
    runtime,
  };
}

describe('useAppActions', () => {
  let runtime: AgentSessionRuntimeInterface;
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    runtime = createMockRuntime();
    deps = createMockDeps(runtime);
    vi.clearAllMocks();
  });

  it('onCommandPalette opens command-palette modal', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onCommandPalette();
    });
    expect(deps.openModal).toHaveBeenCalledWith({ type: 'command-palette' });
  });

  it('onThinking opens thinking modal', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onThinking();
    });
    expect(deps.openModal).toHaveBeenCalledWith({ type: 'thinking' });
  });

  it('onThemeToggle toggles theme and saves setting', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onThemeToggle();
    });
    expect(deps.toggleTheme).toHaveBeenCalled();
    expect(runtime.settings?.set).toHaveBeenCalledWith('theme', 'dark');
    expect(runtime.settings?.save).toHaveBeenCalled();
  });

  it('onToolOutputToggle toggles expanded state and shows toast', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onToolOutputToggle();
    });
    expect(deps.setToolOutputExpanded).toHaveBeenCalledWith(true);
    expect(deps.addToast).toHaveBeenCalledWith('Tool output expanded');
  });

  it('onToolOutputToggle collapses when expanded', () => {
    deps.toolOutputExpanded = true;
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onToolOutputToggle();
    });
    expect(deps.setToolOutputExpanded).toHaveBeenCalledWith(false);
    expect(deps.addToast).toHaveBeenCalledWith('Tool output collapsed');
  });

  it('onThinkingBlockToggle toggles hidden state and shows toast', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onThinkingBlockToggle();
    });
    expect(deps.setHideThinkingBlock).toHaveBeenCalledWith(true);
    expect(deps.addToast).toHaveBeenCalledWith('Thinking blocks: hidden');
  });

  it('onThinkingBlockToggle shows visible when hidden', () => {
    deps.hideThinkingBlock = true;
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onThinkingBlockToggle();
    });
    expect(deps.setHideThinkingBlock).toHaveBeenCalledWith(false);
    expect(deps.addToast).toHaveBeenCalledWith('Thinking blocks: visible');
  });

  it('onLogin opens login modal', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onLogin();
    });
    expect(deps.openModal).toHaveBeenCalledWith({ type: 'login' });
  });

  it('onSessionSelector opens session selector modal', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onSessionSelector();
    });
    expect(deps.openModal).toHaveBeenCalledWith({ type: 'session-selector' });
  });

  it('onDebug writes debug log to tmpdir', async () => {
    (tmpdir as any).mockReturnValue('/tmp');
    const { result } = renderHook(() => useAppActions(deps));
    await act(async () => {
      await result.current.onDebug();
    });
    expect(deps.addToast).toHaveBeenCalledWith(
      expect.stringMatching(/Debug log written to \/tmp\/picro-debug-/),
      'success'
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringMatching(/picro-debug-/),
      expect.stringContaining('Picro Debug Log'),
      'utf-8'
    );
  });

  it('onDebug handles errors and shows toast', async () => {
    (writeFileSync as any).mockImplementation(() => {
      throw new Error('disk full');
    });
    const { result } = renderHook(() => useAppActions(deps));
    await act(async () => {
      await result.current.onDebug();
    });
    expect(deps.addToast).toHaveBeenCalledWith(
      expect.stringMatching(/Debug failed:/),
      'error'
    );
  });

  it('onDebug writes correct stats and messages', async () => {
    (tmpdir as any).mockReturnValue('/tmp');
    const { result } = renderHook(() => useAppActions(deps));
    await act(async () => {
      await result.current.onDebug();
    });
    expect(writeFileSync).toHaveBeenCalled();
    const writtenContent = (writeFileSync as any).mock.calls[0][1];
    expect(writtenContent).toContain('Picro Debug Log');
    expect(writtenContent).toContain(`CWD: ${runtime.cwd}`);
    expect(writtenContent).toContain(`Session: /sessions/123`);
    expect(writtenContent).toContain(`Model: undefined/undefined`);
    expect(writtenContent).toContain('Messages: 2 total');
    expect(writtenContent).toContain('User: 1');
    expect(writtenContent).toContain('Assistant: 1');
    expect(writtenContent).toContain('ToolCalls: 0');
    expect(writtenContent).toContain('ToolResults: 0');
    expect(writtenContent).toContain('Tokens: in=10, out=5, total=15');
    expect(writtenContent).toContain('Cost: $0.001');
    expect(writtenContent).toContain('=== Full Message History (JSONL) ===');
    expect(writtenContent).toContain(JSON.stringify(runtime.session.messages[0]));
    expect(writtenContent).toContain(JSON.stringify(runtime.session.messages[1]));
  });

  it('onEditor opens external editor and returns content', async () => {
    const fakeEditor = 'vim';
    process.env.EDITOR = fakeEditor;
    (spawnSync as any).mockReturnValue({ status: 0 });
    (writeFileSync as any).mockImplementation(() => {});
    (readFileSync as any).mockReturnValue('edited content');
    (rmSync as any).mockImplementation(() => {});

    const { result } = renderHook(() => useAppActions(deps));
    let editorResult: string;
    await act(async () => {
      editorResult = await result.current.onEditor();
    });
    expect(editorResult).toBe('edited content');
    expect(spawnSync).toHaveBeenCalledWith(fakeEditor, expect.any(Array), { stdio: 'inherit', cwd: runtime.cwd });
    expect(deps.addToast).toHaveBeenCalledWith('External editor completed', 'info');
  });

  it('onEditor handles editor spawn error gracefully', async () => {
    process.env.EDITOR = 'nonexistent';
    (spawnSync as any).mockReturnValue({ status: 1, stderr: 'not found' });
    (readFileSync as any).mockReturnValue(''); // empty content after attempt

    const { result } = renderHook(() => useAppActions(deps));
    let editorResult: string;
    await act(async () => {
      editorResult = await result.current.onEditor();
    });
    expect(editorResult).toBe('');
    expect(deps.addToast).toHaveBeenCalledWith('External editor completed', 'info');
  });

  it('onPaste calls readClipboardImage and shows toast if no image', async () => {
    (readClipboardImage as any).mockResolvedValue(null);
    const { result } = renderHook(() => useAppActions(deps));
    await act(async () => {
      await result.current.onPaste();
    });
    expect(readClipboardImage).toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalledWith('No image in clipboard', 'info');
  });

  it('onPaste shows toast on error', async () => {
    (readClipboardImage as any).mockRejectedValue(new Error('clipboard busy'));
    const { result } = renderHook(() => useAppActions(deps));
    await act(async () => {
      await result.current.onPaste();
    });
    expect(deps.addToast).toHaveBeenCalledWith(
      expect.stringMatching(/Paste failed:/),
      'error'
    );
  });

  it('onSlashCommand opens command palette with slash filter', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onSlashCommand('/');
    });
    expect(deps.openModal).toHaveBeenCalledWith({
      type: 'command-palette',
      filter: '/',
      isSlash: true,
    });
  });

  it('onTab opens command palette without filter', () => {
    const { result } = renderHook(() => useAppActions(deps));
    act(() => {
      result.current.onTab();
    });
    expect(deps.openModal).toHaveBeenCalledWith({
      type: 'command-palette',
      filter: '',
      isSlash: false,
    });
  });
});
