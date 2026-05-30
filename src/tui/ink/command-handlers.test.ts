import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs before imports
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock('../../config.js', () => ({
  VERSION: 'test',
  getDebugLogPath: () => '/tmp/debug.log',
}));

import { handleCommand } from './command-handlers';
import type { CommandContext } from './command-handlers';
import { writeFileSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';

function createMockContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    runtime: {} as any,
    addToast: vi.fn(),
    setActiveModal: vi.fn(),
    messages: [],
    footerProvider: {} as any,
    inputValue: '',
    setInputValue: vi.fn(),
    ...overrides,
  };
}

describe('handleCommand', () => {
  let ctx: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should handle /quit by calling process.exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    await handleCommand(ctx, 'quit', '/quit');
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should set thinking level when valid argument provided', async () => {
    ctx.runtime.setThinkingLevel = vi.fn();
    await handleCommand(ctx, 'thinking', '/thinking high');
    expect(ctx.runtime.setThinkingLevel).toHaveBeenCalledWith('high');
    expect(ctx.addToast).toHaveBeenCalledWith('Thinking level set to high', 'success');
  });

  it('should show thinking modal when no argument', async () => {
    await handleCommand(ctx, 'thinking', '/thinking');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'thinking' });
  });

  it('should open login modal', async () => {
    await handleCommand(ctx, 'login', '/login');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'login' });
  });

  it('should open help modal', async () => {
    await handleCommand(ctx, 'help', '/help');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'help' });
  });

  it('should copy last assistant message', async () => {
    ctx.messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    ctx.runtime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'copy', '/copy');
    expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith('Hi there');
    expect(ctx.addToast).toHaveBeenCalledWith('Copied last assistant message', 'success');
  });

  it('should copy full conversation when /copy all', async () => {
    ctx.messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    ctx.runtime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'copy', '/copy all');
    const expected = 'You: Hello\n\nAssistant: Hi';
    expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith(expected);
  });

  it('should open session selector on /resume', async () => {
    await handleCommand(ctx, 'resume', '/resume');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'session-selector' });
  });

  it('should create new session on /new', async () => {
    ctx.runtime.newSession = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'new', '/new');
    expect(ctx.setActiveModal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirmation',
        title: 'New Session',
      })
    );
  });

  it('should open settings modal', async () => {
    await handleCommand(ctx, 'settings', '/settings');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'settings' });
  });

  it('should open model selector', async () => {
    await handleCommand(ctx, 'model', '/model');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'model-selector' });
  });

  it('should open scoped models selector', async () => {
    await handleCommand(ctx, 'scoped-models', '/scoped-models');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'scoped-models' });
  });

  it('should return insert for unknown command', async () => {
    const result = await handleCommand(ctx, 'unknown', '/unknown');
    expect(result).toBe('insert');
  });

  describe('/export', () => {
    it('should write HTML file when messages exist', async () => {
      const mockWrite = vi.mocked(writeFileSync) as any;
      ctx.runtime.session = { messages: [
        { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] }
      ] as any };
      ctx.runtime.cwd = '/tmp';
      await handleCommand(ctx, 'export', '/export');
      expect(mockWrite).toHaveBeenCalled();
      const filepath = mockWrite.mock.calls[0][0];
      expect(filepath).toMatch(/session-.*\.html/);
    });

    it('shows info toast when no messages to export', async () => {
      ctx.runtime.session = { messages: [] as any[] };
      await handleCommand(ctx, 'export', '/export');
      expect(ctx.addToast).toHaveBeenCalledWith('No messages to export', 'info');
    });
  });

  describe('/import', () => {
    it('should import session when fd finds a file', async () => {
      const mockedExecSync = vi.mocked(execSync) as any;
      mockedExecSync.mockReturnValue('file.jsonl');
      ctx.runtime.cwd = '/tmp';
      ctx.runtime.switchSession = vi.fn().mockResolvedValue({ cancelled: false });
      await handleCommand(ctx, 'import', '/import');
      expect(mockedExecSync).toHaveBeenCalledWith(expect.stringContaining('fd'), expect.any(Object));
      expect(ctx.runtime.switchSession).toHaveBeenCalledWith('/tmp/file.jsonl');
    });

    it('shows info toast when no files found', async () => {
      const mockedExecSync = vi.mocked(execSync) as any;
      mockedExecSync.mockReturnValue('');
      ctx.runtime.cwd = '/tmp';
      await handleCommand(ctx, 'import', '/import');
      expect(ctx.addToast).toHaveBeenCalledWith('No JSONL files found', 'info');
    });

    it('shows error if fd not found', async () => {
      const mockedExecSync = vi.mocked(execSync) as any;
      mockedExecSync.mockImplementation(() => { throw new Error('fd not found'); });
      ctx.runtime.cwd = '/tmp';
      await handleCommand(ctx, 'import', '/import');
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('fd not found'), 'error');
    });
  });

  describe('/share', () => {
    it('should create gist and copy URL when token available', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: 'https://gist/abc' }) }) as any;
      ctx.runtime.session = { messages: [{ role: 'user', content: 'test', timestamp: Date.now(), id: '1' }] as any };
      ctx.runtime.authStorage = { getApiKey: vi.fn().mockResolvedValue('token') };
      ctx.runtime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
      await handleCommand(ctx, 'share', '/share');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('github.com/gists'), expect.any(Object));
      expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith('https://gist/abc');
      expect(ctx.addToast).toHaveBeenCalledWith('Gist URL copied to clipboard', 'success');
    });

    it('shows error when GitHub token missing', async () => {
      ctx.runtime.authStorage = { getApiKey: vi.fn().mockResolvedValue(null) };
      await handleCommand(ctx, 'share', '/share');
      expect(ctx.addToast).toHaveBeenCalledWith('GitHub token required. Login with /login github first.', 'error');
    });

    it('shows error when gist API fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as any;
      ctx.runtime.session = { messages: [{ role: 'user', content: 'test' }] as any };
      ctx.runtime.authStorage = { getApiKey: vi.fn().mockResolvedValue('token') };
      await handleCommand(ctx, 'share', '/share');
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('GitHub API error'), 'error');
    });
  });

  describe('/name', () => {
    it('should open editor modal with current name', async () => {
      ctx.runtime.settings = { get: vi.fn().mockReturnValue('MyName'), set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) } as any;
      ctx.runtime.session = { sessionManager: { setSessionName: vi.fn() } } as any;
      ctx.footerProvider = { updateFromRuntime: vi.fn() };
      await handleCommand(ctx, 'name', '/name');
      expect(ctx.setActiveModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          initialValue: 'MyName',
        })
      );
    });

    it('shows info toast when no name provided (shows usage)', async () => {
      await handleCommand(ctx, 'name', '/name');
      expect(ctx.addToast).toHaveBeenCalledWith('Usage: /name <session name>', 'info');
    });
  });

  describe('/session', () => {
    it('should open session info modal', async () => {
      await handleCommand(ctx, 'session', '/session');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'session-info' });
    });
  });

  describe('/changelog', () => {
    it('should open changelog modal', async () => {
      await handleCommand(ctx, 'changelog', '/changelog');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'changelog' });
    });
  });

  describe('/hotkeys', () => {
    it('should open hotkeys modal', async () => {
      await handleCommand(ctx, 'hotkeys', '/hotkeys');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'hotkeys' });
    });
  });

  describe('/clone', () => {
    it('should show info when no messages to clone', async () => {
      ctx.runtime.session = { messages: [] as any[] };
      await handleCommand(ctx, 'clone', '/clone');
      expect(ctx.addToast).toHaveBeenCalledWith('No messages to clone', 'info');
    });

    it('should fork from first user message if exists', async () => {
      ctx.runtime.fork = vi.fn().mockResolvedValue(undefined);
      const msgs = [
        { role: 'user', id: 'u1', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
      ];
      ctx.runtime.session = { messages: msgs } as any;
      await handleCommand(ctx, 'clone', '/clone');
      expect(ctx.runtime.fork).toHaveBeenCalledWith('u1');
      expect(ctx.addToast).toHaveBeenCalledWith('Session cloned', 'success');
    });

    it('should create new empty session if user message lacks id', async () => {
      ctx.runtime.fork = vi.fn().mockResolvedValue(undefined);
      ctx.runtime.newSession = vi.fn().mockResolvedValue(undefined);
      ctx.runtime.session = { messages: [{ role: 'user', content: 'Hello' }] } as any; // no id
      await handleCommand(ctx, 'clone', '/clone');
      expect(ctx.runtime.fork).not.toHaveBeenCalled();
      expect(ctx.runtime.newSession).toHaveBeenCalled();
      expect(ctx.addToast).toHaveBeenCalledWith('New empty session created', 'success');
    });
  });

  describe('/tree', () => {
    it('should open tree selector', async () => {
      await handleCommand(ctx, 'tree', '/tree');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'tree-selector' });
    });
  });

  describe('/compact', () => {
    it('should call session.compact with custom instructions when provided', async () => {
      ctx.runtime.session = { compact: vi.fn().mockResolvedValue(undefined) } as any;
      await handleCommand(ctx, 'compact', '/compact Summarize');
      expect(ctx.runtime.session.compact).toHaveBeenCalledWith({ customInstructions: 'Summarize' });
      expect(ctx.addToast).toHaveBeenCalledWith('Compaction completed', 'success');
    });

    it('compacts without instructions if not provided', async () => {
      ctx.runtime.session = { compact: vi.fn().mockResolvedValue(undefined) } as any;
      await handleCommand(ctx, 'compact', '/compact');
      expect(ctx.runtime.session.compact).toHaveBeenCalledWith(undefined);
    });

    it('shows error if compaction not supported', async () => {
      ctx.runtime.session = { compact: undefined } as any;
      await handleCommand(ctx, 'compact', '/compact');
      expect(ctx.addToast).toHaveBeenCalledWith('Compaction not supported', 'error');
    });
  });

  describe('/reload', () => {
    it('should reload resources successfully', async () => {
      ctx.runtime.settings = { reload: vi.fn().mockResolvedValue(undefined) };
      ctx.runtime.session = { resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) } } as any;
      await handleCommand(ctx, 'reload', '/reload');
      expect(ctx.runtime.settings.reload).toHaveBeenCalled();
      expect((ctx.runtime.session as any).resourceLoader.reload).toHaveBeenCalled();
      expect(ctx.addToast).toHaveBeenCalledWith('All resources reloaded', 'success');
    });

    it('handles reload failure', async () => {
      ctx.runtime.settings = { reload: vi.fn().mockRejectedValue(new Error('fail')) };
      ctx.runtime.session = { resourceLoader: { reload: vi.fn() } } as any;
      await handleCommand(ctx, 'reload', '/reload');
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('Reload failed'), 'error');
    });
  });

  describe('/logout', () => {
    it('should remove API keys for all providers', async () => {
      const auth = { getProviders: vi.fn().mockReturnValue(['github', 'openai']), removeApiKey: vi.fn().mockResolvedValue(undefined) };
      ctx.runtime.authStorage = auth as any;
      await handleCommand(ctx, 'logout', '/logout');
      expect(auth.removeApiKey).toHaveBeenCalledWith('github');
      expect(auth.removeApiKey).toHaveBeenCalledWith('openai');
      expect(ctx.addToast).toHaveBeenCalledWith('Logged out from 2 provider(s)', 'success');
    });

    it('handles empty providers list', async () => {
      const auth = { getProviders: vi.fn().mockReturnValue([]), removeApiKey: vi.fn() };
      ctx.runtime.authStorage = auth as any;
      await handleCommand(ctx, 'logout', '/logout');
      expect(auth.removeApiKey).not.toHaveBeenCalled();
      expect(ctx.addToast).toHaveBeenCalledWith('Logged out from 0 provider(s)', 'success');
    });
  });

  describe('/fork', () => {
    it('should open user message selector', async () => {
      await handleCommand(ctx, 'fork', '/fork');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'user-message-selector' });
    });
  });

  describe('/stats', () => {
    it('should show stats modal when stats available', async () => {
      const stats = { sampleCount: 100, timeSpanMS: 5000 };
      ctx.runtime.session = { getPerformanceStats: vi.fn().mockReturnValue(stats) } as any;
      await handleCommand(ctx, 'stats', '/stats');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'stats', stats });
    });

    it('shows info toast when stats disabled', async () => {
      ctx.runtime.session = { getPerformanceStats: undefined } as any;
      await handleCommand(ctx, 'stats', '/stats');
      expect(ctx.addToast).toHaveBeenCalledWith('Performance tracking disabled', 'info');
    });
  });

  describe('/paste', () => {
    it('pastes image from clipboard using wl-paste and returns paste', async () => {
      const mockedExecFileSync = vi.mocked(execFileSync) as any;
      mockedExecFileSync.mockReturnValue(Buffer.from('imgdata'));
      ctx.runtime.cwd = '/tmp';
      const result = await handleCommand(ctx, 'paste', '/paste');
      expect(execFileSync).toHaveBeenCalledWith('wl-paste', ['--no-size', '--type', 'image/png']);
      expect(result).toBe('paste');
    });

    it('falls back to xclip if wl-paste fails', async () => {
      const mockedExecFileSync = vi.mocked(execFileSync) as any;
      mockedExecFileSync.mockImplementationOnce(() => { throw new Error('wl fail') }).mockImplementationOnce(Buffer.from('data'));
      ctx.runtime.cwd = '/tmp';
      await handleCommand(ctx, 'paste', '/paste');
      expect(execFileSync).toHaveBeenCalledWith('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
    });

    it('shows error if both paste methods fail', async () => {
      const mockedExecFileSync = vi.mocked(execFileSync) as any;
      mockedExecFileSync.mockImplementation(() => { throw new Error('no clipboard'); });
      await handleCommand(ctx, 'paste', '/paste');
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('No image in clipboard'), 'error');
    });
  });

  describe('/debug', () => {
    it('writes debug log file', async () => {
      const mockWrite = vi.mocked(writeFileSync) as any;
      ctx.runtime.cwd = '/tmp';
      ctx.runtime.session = { 
        messages: [{ role: 'user', content: 'test' }] as any,
        getSessionStats: () => ({ sessionFile: '/tmp/session.jsonl', userMessages: 1, assistantMessages: 1, toolCalls: 0, toolResults: 0, tokens: { input: 10, output: 5, total: 15 }, cost: 0.001 }) as any,
        model: { provider: 'openai', id: 'gpt-4' } as any,
        thinkingLevel: 'medium' as any,
      } as any;
      await handleCommand(ctx, 'debug', '/debug');
      expect(mockWrite).toHaveBeenCalled();
      const filepath = mockWrite.mock.calls[0][0];
      expect(filepath).toMatch(/picro-debug-\d+\.log/);
    });
  });

  describe('/arminsayshi', () => {
    it('shows armin modal', async () => {
      await handleCommand(ctx, 'arminsayshi', '/arminsayshi');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'armin' });
    });
  });

  describe('/dementedelves', () => {
    it('shows demented delves modal', async () => {
      await handleCommand(ctx, 'dementedelves', '/dementedelves');
      expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'earendil' });
    });
  });
});
