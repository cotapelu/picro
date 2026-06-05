import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommand, type CommandContext } from './command-handlers.js';

// Mock node builtin modules used inside handleCommand
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));
vi.mock('node:path', () => ({
  join: vi.fn((...a: string[]) => a.join('/')),
}));
vi.mock('node:os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

global.fetch = vi.fn();

function createRuntime(overrides: any = {}): any {
  const base = {
    settings: {
      get: vi.fn(),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      messages: [],
      getPerformanceStats: vi.fn(),
      compact: vi.fn().mockResolvedValue(undefined),
      resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) },
      sessionManager: { setSessionName: vi.fn() },
      model: { provider: 'test', id: 'test-model' },
      thinkingLevel: 'medium',
    },
    authStorage: {
      getApiKey: vi.fn(),
      getProviders: vi.fn().mockReturnValue([]),
      removeApiKey: vi.fn().mockResolvedValue(undefined),
    },
    cwd: '/home/user/project',
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    newSession: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue({ cancelled: false, selectedText: 'forked text' }),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
    setThinkingLevel: vi.fn(),
  };
  return { ...base, ...overrides };
}

function createCtx(overrides: any = {}): CommandContext {
  const runtime = createRuntime(overrides.runtime);
  const addToast = vi.fn();
  const setActiveModal = vi.fn();
  const messages = overrides.messages ?? [];
  const footerProvider = { updateFromRuntime: vi.fn() };
  const inputValue = '';
  const setInputValue = vi.fn();

  return {
    runtime,
    addToast,
    setActiveModal,
    messages,
    footerProvider,
    inputValue,
    setInputValue,
  };
}

describe('handleCommand missing commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Clear mocks
    import('node:fs').then(m => (m.writeFileSync as any).mockClear?.());
    import('node:child_process').then(m => {
      (m.execSync as any).mockClear?.();
      (m.execFileSync as any).mockClear?.();
    });
    import('node:path').then(m => (m.join as any).mockClear?.());
    import('node:os').then(m => (m.tmpdir as any).mockClear?.());
  });

  describe('export', () => {
    it('writes HTML export file successfully', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ];
      const { writeFileSync } = await import('node:fs');
      writeFileSync.mockImplementation(() => {});

      await handleCommand(ctx, 'export');

      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/session-.*\.html/),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf-8'
      );
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringMatching(/Exported to/), 'success');
    });

    it('shows info when no messages', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = [];
      await handleCommand(ctx, 'export');
      expect(ctx.addToast).toHaveBeenCalledWith('No messages to export', 'info');
    });

    it('handles write error', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = [{ role: 'user', content: 'Hello' }];
      const { writeFileSync } = await import('node:fs');
      writeFileSync.mockImplementation(() => {
        throw new Error('disk full');
      });

      await handleCommand(ctx, 'export');

      expect(ctx.addToast).toHaveBeenCalledWith('Export failed: disk full', 'error');
    });
  });

  describe('import', () => {
    it('imports first found jsonl session', async () => {
      const ctx = createCtx();
      const { execSync } = await import('node:child_process');
      execSync.mockReturnValue('session-2024.jsonl\n');

      await handleCommand(ctx, 'import');

      expect(execSync).toHaveBeenCalledWith('fd --extension jsonl', expect.objectContaining({ cwd: ctx.runtime.cwd, encoding: 'utf-8' }));
      expect(ctx.runtime.switchSession).toHaveBeenCalledWith(ctx.runtime.cwd + '/session-2024.jsonl');
      expect(ctx.addToast).toHaveBeenCalledWith('Imported session from session-2024.jsonl', 'success');
    });

    it('shows info when no jsonl files found', async () => {
      const ctx = createCtx();
      const { execSync } = await import('node:child_process');
      execSync.mockReturnValue('');

      await handleCommand(ctx, 'import');

      expect(ctx.addToast).toHaveBeenCalledWith('No JSONL files found', 'info');
    });

    it('handles fd not found error', async () => {
      const ctx = createCtx();
      const { execSync } = await import('node:child_process');
      const err = new Error('fd not found');
      (err as any).code = 'ENOENT';
      execSync.mockImplementation(() => { throw err; });

      await handleCommand(ctx, 'import');

      expect(ctx.addToast).toHaveBeenCalledWith('fd not found - install fd', 'error');
    });

    it('handles other execSync errors', async () => {
      const ctx = createCtx();
      const { execSync } = await import('node:child_process');
      execSync.mockImplementation(() => {
        throw new Error('some error');
      });

      await handleCommand(ctx, 'import');

      expect(ctx.addToast).toHaveBeenCalledWith('Import failed: some error', 'error');
    });

    it('handles cancelled switchSession', async () => {
      const ctx = createCtx();
      ctx.runtime.switchSession = vi.fn().mockResolvedValue({ cancelled: true });
      const { execSync } = await import('node:child_process');
      execSync.mockReturnValue('file.jsonl');

      await handleCommand(ctx, 'import');

      expect(ctx.addToast).toHaveBeenCalledWith('Import cancelled', 'info');
    });
  });

  describe('share', () => {
    const messages = [
      { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
    ];

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ html_url: 'https://gist/123' }) });
    });

    it('shares to GitHub gist with token', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = messages;
      ctx.runtime.authStorage.getApiKey = vi.fn().mockResolvedValue('ghp_token');

      await handleCommand(ctx, 'share');

      expect(ctx.runtime.authStorage.getApiKey).toHaveBeenCalledWith('github');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/gists',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'token ghp_token' }),
          body: expect.stringContaining('"session.json"'),
        })
      );
      expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith('https://gist/123');
      expect(ctx.addToast).toHaveBeenCalledWith('Gist URL copied to clipboard', 'success');
    });

    it('fails when no GitHub token', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = messages;
      ctx.runtime.authStorage.getApiKey = vi.fn().mockResolvedValue(null);

      await handleCommand(ctx, 'share');

      expect(ctx.addToast).toHaveBeenCalledWith(
        'GitHub token required. Login with /login github first.',
        'error'
      );
    });

    it('handles fetch error', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = messages;
      ctx.runtime.authStorage.getApiKey = vi.fn().mockResolvedValue('token');
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      await handleCommand(ctx, 'share');

      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringMatching(/GitHub API error/), 'error');
    });

    it('handles copy error', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = messages;
      ctx.runtime.authStorage.getApiKey = vi.fn().mockResolvedValue('token');
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ html_url: 'url' }) });
      ctx.runtime.copyToClipboard = vi.fn().mockRejectedValue(new Error('copy fail'));

      await handleCommand(ctx, 'share');

      expect(ctx.addToast).toHaveBeenCalledWith('Share failed: copy fail', 'error');
    });

    it('handles empty messages', async () => {
      const ctx = createCtx();
      ctx.runtime.session.messages = [];
      await handleCommand(ctx, 'share');
      expect(ctx.addToast).toHaveBeenCalledWith('No messages to share', 'info');
    });
  });

  describe('paste', () => {
    it('pastes image from wl-paste', async () => {
      const ctx = createCtx();
      const pngBuffer = Buffer.from('fake png');
      const { execFileSync } = await import('node:child_process');
      execFileSync.mockReturnValue(pngBuffer);

      const { writeFileSync } = await import('node:fs');
      writeFileSync.mockImplementation(() => {});

      const { join } = await import('node:path');
      join.mockReturnValue(ctx.runtime.cwd + '/pasted-123.png');

      const result = await handleCommand(ctx, 'paste');

      expect(execFileSync).toHaveBeenCalledWith('wl-paste', ['--no-size', '--type', 'image/png']);
      expect(writeFileSync).toHaveBeenCalledWith(ctx.runtime.cwd + '/pasted-123.png', pngBuffer);
      expect(result).toBe('paste');
    });

    it('falls back to xclip if wl-paste fails', async () => {
      const ctx = createCtx();
      const pngBuffer = Buffer.from('fake png');
      const { execFileSync } = await import('node:child_process');
      execFileSync
        .mockImplementationOnce(() => { throw new Error('wl-paste not found'); })
        .mockImplementationOnce(() => pngBuffer);

      const { writeFileSync } = await import('node:fs');
      writeFileSync.mockImplementation(() => {});

      const { join } = await import('node:path');
      join.mockReturnValue(ctx.runtime.cwd + '/pasted-456.png');

      const result = await handleCommand(ctx, 'paste');

      expect(execFileSync).toHaveBeenNthCalledWith(1, 'wl-paste', ['--no-size', '--type', 'image/png']);
      expect(execFileSync).toHaveBeenNthCalledWith(2, 'xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
      expect(result).toBe('paste');
    });

    it('shows error when neither paste tool works', async () => {
      const ctx = createCtx();
      const { execFileSync } = await import('node:child_process');
      execFileSync.mockImplementation(() => { throw new Error('fail'); });

      await handleCommand(ctx, 'paste');

      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringMatching(/No image in clipboard/), 'error');
    });

    it('handles writeFileSync error', async () => {
      const ctx = createCtx();
      const pngBuffer = Buffer.from('fake');
      const { execFileSync } = await import('node:child_process');
      execFileSync.mockReturnValue(pngBuffer);

      const { writeFileSync } = await import('node:fs');
      writeFileSync.mockImplementation(() => { throw new Error('disk full'); });

      await handleCommand(ctx, 'paste');

      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringMatching(/Paste failed/), 'error');
    });
  });
});
