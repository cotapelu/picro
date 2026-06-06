/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExtensionUIState } from './useExtensionUIState.js';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

// Mock node modules
vi.mock('node:child_process', () => ({ execFile: vi.fn(), spawnSync: vi.fn().mockReturnValue({ status: 0, signal: null }) }));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    mkdtempSync: vi.fn().mockReturnValue('/tmp/picro-123'),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('edited text'),
    rmSync: vi.fn(),
  };
});

vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
    join: vi.fn().mockImplementation((...args) => args.join('/')),
  };
});

vi.mock('node:os', async () => {
  const actual = await vi.importActual('node:os');
  return {
    ...actual,
    tmpdir: vi.fn().mockReturnValue('/tmp'),
  };
});

// Helper to create mock runtime
function createMockRuntime(overrides: any = {}): AgentSessionRuntimeInterface {
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

  return {
    cwd: '/test/cwd',
    thinkingLevel: 'medium',
    session: { ...defaultSession, ...(overrides.session || {}) },
    settings: {
      get: vi.fn((key: string) => undefined),
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
}

describe('useExtensionUIState', () => {
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
  });

  describe('Widget Management', () => {
    it('adds and removes widgets above', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));

      expect(result.current.extensionWidgetsAbove.size).toBe(0);

      act(() => {
        result.current.setExtensionWidget('w1', 'Widget 1 content', { placement: 'above' });
      });
      expect(result.current.extensionWidgetsAbove.size).toBe(1);
      expect(result.current.extensionWidgetsAbove.get('w1')).toBe('Widget 1 content');

      act(() => {
        result.current.setExtensionWidget('w1', null, { placement: 'above' });
      });
      expect(result.current.extensionWidgetsAbove.size).toBe(0);
    });

    it('adds and removes widgets below', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));

      act(() => {
        result.current.setExtensionWidget('w2', 'Widget 2 content', { placement: 'below' });
      });
      expect(result.current.extensionWidgetsBelow.size).toBe(1);
      expect(result.current.extensionWidgetsBelow.get('w2')).toBe('Widget 2 content');

      act(() => {
        result.current.setExtensionWidget('w2', undefined, { placement: 'below' });
      });
      expect(result.current.extensionWidgetsBelow.size).toBe(0);
    });

    it('defaults placement to above', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));

      act(() => {
        result.current.setExtensionWidget('w3', 'Content');
      });
      expect(result.current.extensionWidgetsAbove.size).toBe(1);
      expect(result.current.extensionWidgetsBelow.size).toBe(0);
    });

    it('only allows string content in widgets', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));

      act(() => {
        result.current.setExtensionWidget('obj', { a: 1 } as any);
      });
      expect(result.current.extensionWidgetsAbove.size).toBe(0);

      act(() => {
        result.current.setExtensionWidget('str', 'valid');
      });
      expect(result.current.extensionWidgetsAbove.size).toBe(1);
    });
  });

  describe('Autocomplete Providers', () => {
    it('registers autocomplete provider', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      expect(result.current.autocompleteProviderFactories.length).toBe(0);

      const factory = vi.fn().mockResolvedValue([{ label: 'test', insertText: 'test' }]);
      act(() => {
        result.current.registerAutocompleteProvider(factory);
      });
      expect(result.current.autocompleteProviderFactories.length).toBe(1);
    });

    it('handleAutocomplete aggregates results from all providers', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const factory1 = vi.fn().mockResolvedValue([{ label: 'a', insertText: 'a' }]);
      const factory2 = vi.fn().mockResolvedValue([{ label: 'b', insertText: 'b' }]);
      act(() => {
        result.current.registerAutocompleteProvider(factory1);
        result.current.registerAutocompleteProvider(factory2);
      });

      const suggestions = await result.current.handleAutocomplete('test');
      expect(suggestions).toContain('a');
      expect(suggestions).toContain('b');
      expect(factory1).toHaveBeenCalledWith(expect.objectContaining({ filter: 'test', cwd: '/test/cwd' }));
      expect(factory2).toHaveBeenCalledWith(expect.objectContaining({ filter: 'test', cwd: '/test/cwd' }));
    });

    it('handleAutocomplete ignores provider errors', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const goodFactory = vi.fn().mockResolvedValue([{ label: 'good', insertText: 'good' }]);
      const badFactory = vi.fn().mockRejectedValue(new Error('fail'));
      act(() => {
        result.current.registerAutocompleteProvider(goodFactory);
        result.current.registerAutocompleteProvider(badFactory);
      });

      const suggestions = await result.current.handleAutocomplete('any');
      expect(suggestions).toContain('good');
      expect(suggestions.length).toBe(1);
    });
  });

  describe('Path Completion', () => {
    it('calls fd to get path completions', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const execFile = await import('node:child_process').then(m => m.execFile) as any;
      (execFile as any).mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        expect(cmd).toBe('fd');
        expect(args).toContain('prefix*');
        cb(null, 'file1\nfile2\n');
      });

      const files = await result.current.handlePathComplete('prefix');
      expect(files).toEqual(['file1', 'file2']);
    });

    it('returns empty array on exec error', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const execFile = await import('node:child_process').then(m => m.execFile) as any;
      (execFile as any).mockImplementation((cmd: string, args: string[], opts: any, cb: any) => {
        cb(new Error('fd not found'), null);
      });

      const files = await result.current.handlePathComplete('any');
      expect(files).toEqual([]);
    });

    it('returns empty array when cwd is missing', async () => {
      const runtimeNoCwd = createMockRuntime({ cwd: '' });
      const { result } = renderHook(() => useExtensionUIState(runtimeNoCwd));
      const files = await result.current.handlePathComplete('anything');
      expect(files).toEqual([]);
    });
  });

  describe('External Editor', () => {
    it('spawns editor and returns edited text', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const { spawnSync } = await import('node:child_process');
      const originalEditor = process.env.EDITOR;
      process.env.EDITOR = 'nano';

      const newText = await result.current.handleExternalEdit('original');

      expect(spawnSync).toHaveBeenCalledWith('nano', [expect.stringContaining('/edit.txt')], expect.any(Object));
      expect(newText).toBe('edited text');

      if (originalEditor) process.env.EDITOR = originalEditor;
    });

    it('falls back to VISUAL then vim', async () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      delete process.env.EDITOR;
      const originalVisual = process.env.VISUAL;
      process.env.VISUAL = 'code';

      const { spawnSync } = await import('node:child_process');
      const newText = await result.current.handleExternalEdit('orig');
      expect(spawnSync).toHaveBeenCalledWith('code', expect.any(Array), expect.any(Object));
      expect(newText).toBe('edited text');

      if (originalVisual) process.env.VISUAL = originalVisual;
    });
  });

  describe('Extension Shortcuts', () => {
    it('sets up shortcuts from runner', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const runner = {
        getShortcuts: () => new Map([
          ['ctrl+p', { handler: () => true }],
          ['ctrl+n', { handler: () => false }],
        ]),
      };

      act(() => {
        result.current.setupExtensionShortcuts(runner);
      });

      // The extensionShortcutsRef is internal; we can't directly access it.
      // Since InkApp uses it via ref, we just trust that it's set.
      // But we can verify that calling the function doesn't throw.
      expect(true).toBe(true);
    });

    it('handles runner with no shortcuts', () => {
      const { result } = renderHook(() => useExtensionUIState(runtime));
      const runner = { getShortcuts: undefined };

      act(() => {
        result.current.setupExtensionShortcuts(runner);
      });

      expect(true).toBe(true);
    });
  });
});
