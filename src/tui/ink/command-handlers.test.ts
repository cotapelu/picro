import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommand, type CommandContext } from './command-handlers.js';

describe('handleCommand', () => {
  let ctx: CommandContext;
  let runtime: any;
  let addToast: ReturnType<typeof vi.fn>;
  let setActiveModal: ReturnType<typeof vi.fn>;
  let messages: any[];
  let footerProvider: any;
  let inputValue: string;
  let setInputValue: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    runtime = {
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

    addToast = vi.fn();
    setActiveModal = vi.fn();
    messages = [];
    footerProvider = { updateFromRuntime: vi.fn() };
    inputValue = '';
    setInputValue = vi.fn();

    ctx = {
      runtime,
      addToast,
      setActiveModal,
      messages,
      footerProvider,
      inputValue,
      setInputValue,
    };
  });

  describe('unknown command', () => {
    it('returns "insert" for non-built-in command', async () => {
      const result = await handleCommand(ctx, 'unknown');
      expect(result).toBe('insert');
      expect(addToast).not.toHaveBeenCalled();
    });
  });

  describe('quit', () => {
    beforeEach(() => {
      vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
    });

    it('calls process.exit(0)', async () => {
      await expect(handleCommand(ctx, 'quit')).rejects.toThrow('process.exit called');
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('thinking', () => {
    it('opens modal when no args', async () => {
      await handleCommand(ctx, 'thinking');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'thinking' });
    });

    it('sets thinking level with valid arg', async () => {
      await handleCommand(ctx, 'thinking', '/thinking high');
      expect(runtime.setThinkingLevel).toHaveBeenCalledWith('high');
      expect(addToast).toHaveBeenCalledWith('Thinking level set to high', 'success');
    });

    it('opens modal for invalid arg', async () => {
      await handleCommand(ctx, 'thinking', 'invalid');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'thinking' });
    });
  });

  describe('login', () => {
    it('opens login modal', async () => {
      await handleCommand(ctx, 'login');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'login' });
    });
  });

  describe('help', () => {
    it('opens help modal', async () => {
      await handleCommand(ctx, 'help');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'help' });
    });
  });

  describe('copy', () => {
    it('copies entire conversation when args all', async () => {
      const msg1 = { role: 'user', content: 'Hello' };
      const msg2 = { role: 'assistant', content: 'Hi there' };
      ctx.messages = [msg1, msg2];

      await handleCommand(ctx, 'copy', '/copy all');

      expect(runtime.copyToClipboard).toHaveBeenCalledWith(`You: Hello\n\nAssistant: Hi there`);
      expect(addToast).toHaveBeenCalledWith('Copied full conversation to clipboard', 'success');
    });

    it('copies last assistant message', async () => {
      const msg1 = { role: 'user', content: 'Hello' };
      const msg2 = { role: 'assistant', content: 'Hi there' };
      ctx.messages = [msg1, msg2];

      await handleCommand(ctx, 'copy');

      expect(runtime.copyToClipboard).toHaveBeenCalledWith('Hi there');
      expect(addToast).toHaveBeenCalledWith('Copied last assistant message', 'success');
    });

    it('shows info when no assistant message', async () => {
      ctx.messages = [{ role: 'user', content: 'Hello' }];

      await handleCommand(ctx, 'copy');

      expect(runtime.copyToClipboard).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('No assistant message to copy', 'info');
    });

    it('handles copy errors', async () => {
      runtime.copyToClipboard = vi.fn().mockRejectedValue(new Error('fail'));
      ctx.messages = [{ role: 'assistant', content: 'Hi' }];

      await handleCommand(ctx, 'copy');

      expect(addToast).toHaveBeenCalledWith('Copy failed', 'error');
    });
  });

  describe('resume', () => {
    it('opens session selector modal', async () => {
      await handleCommand(ctx, 'resume');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'session-selector' });
    });
  });

  describe('new', () => {
    it('shows confirmation modal and creates new session on confirm', async () => {
      const onConfirm = vi.fn();
      await handleCommand(ctx, 'new');
      expect(setActiveModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirmation',
          title: 'New Session',
          message: 'Create a new session? Current session will be saved.',
          onConfirm: expect.any(Function),
        })
      );

      const modal = setActiveModal.mock.calls[0][0] as any;
      // Simulate confirm
      await (modal.onConfirm as any)();
      expect(runtime.newSession).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('New session created', 'success');
    });

    it('handles new session error', async () => {
      runtime.newSession = vi.fn().mockRejectedValue(new Error('fail'));
      const onConfirm = vi.fn();
      await handleCommand(ctx, 'new');
      const modal = setActiveModal.mock.calls[0][0] as any;
      await (modal.onConfirm as any)();
      expect(addToast).toHaveBeenCalledWith('Failed to create session', 'error');
    });
  });

  describe('settings', () => {
    it('opens settings modal', async () => {
      await handleCommand(ctx, 'settings');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'settings' });
    });
  });

  describe('model', () => {
    it('opens model selector modal', async () => {
      await handleCommand(ctx, 'model');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'model-selector' });
    });
  });

  describe('scoped-models', () => {
    it('opens scoped models modal', async () => {
      await handleCommand(ctx, 'scoped-models');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'scoped-models' });
    });
  });

  describe('name', () => {
    it('opens editor modal to set session name', async () => {
      runtime.settings.get = vi.fn().mockReturnValue('Current Name');
      await handleCommand(ctx, 'name');
      expect(setActiveModal).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          initialValue: 'Current Name',
        })
      );
    });

    it('saves new name and updates footer', async () => {
      runtime.settings.get = vi.fn().mockReturnValue('Old Name');
      await handleCommand(ctx, 'name');
      const modal = setActiveModal.mock.calls[0][0] as any;
      await (modal.onSave as any)('New Name');
      expect(runtime.settings.set).toHaveBeenCalledWith('sessionDisplayName', 'New Name');
      expect(runtime.settings.save).toHaveBeenCalled();
      expect(runtime.session.sessionManager.setSessionName).toHaveBeenCalledWith('New Name');
      expect(footerProvider.updateFromRuntime).toHaveBeenCalledWith(runtime);
      expect(addToast).toHaveBeenCalledWith('Session name set to: New Name', 'success');
    });

    it('handles save error', async () => {
      runtime.settings.save = vi.fn().mockRejectedValue(new Error('fail'));
      await handleCommand(ctx, 'name');
      const modal = setActiveModal.mock.calls[0][0] as any;
      await (modal.onSave as any)('New Name');
      expect(addToast).toHaveBeenCalledWith('Failed to set session name', 'error');
    });
  });

  describe('session', () => {
    it('opens session info modal', async () => {
      await handleCommand(ctx, 'session');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'session-info' });
    });
  });

  describe('changelog', () => {
    it('opens changelog modal', async () => {
      await handleCommand(ctx, 'changelog');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'changelog' });
    });
  });

  describe('hotkeys', () => {
    it('opens hotkeys modal', async () => {
      await handleCommand(ctx, 'hotkeys');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'hotkeys' });
    });
  });

  describe('clone', () => {
    it('clones session with first user message id', async () => {
      const msg = { role: 'user', content: 'Hi', id: 'msg123' };
      runtime.session.messages = [msg];
      await handleCommand(ctx, 'clone');
      expect(runtime.fork).toHaveBeenCalledWith('msg123');
      expect(addToast).toHaveBeenCalledWith('Session cloned', 'success');
    });

    it('creates new empty session if no user message with id', async () => {
      const msg = { role: 'assistant', content: 'Hi' };
      runtime.session.messages = [msg];
      await handleCommand(ctx, 'clone');
      expect(runtime.fork).not.toHaveBeenCalled();
      expect(runtime.newSession).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('New empty session created', 'success');
    });

    it('handles clone error', async () => {
      runtime.fork = vi.fn().mockRejectedValue(new Error('fail'));
      const msg = { role: 'user', content: 'Hi', id: '123' };
      runtime.session.messages = [msg];
      await handleCommand(ctx, 'clone');
      expect(addToast).toHaveBeenCalledWith('Clone failed: fail', 'error');
    });
  });

  describe('tree', () => {
    it('opens tree selector modal', async () => {
      await handleCommand(ctx, 'tree');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'tree-selector' });
    });
  });

  describe('compact', () => {
    it('compacts session with custom instructions', async () => {
      const session = runtime.session as any;
      await handleCommand(ctx, 'compact', '/compact custom');
      expect(session.compact).toHaveBeenCalledWith({ customInstructions: 'custom' });
      expect(addToast).toHaveBeenCalledWith('Compaction completed', 'success');
    });

    it('compacts without custom instructions', async () => {
      const session = runtime.session as any;
      await handleCommand(ctx, 'compact');
      expect(session.compact).toHaveBeenCalledWith(undefined);
      expect(addToast).toHaveBeenCalledWith('Compaction completed', 'success');
    });

    it('handles compaction not supported', async () => {
      const session = runtime.session as any;
      session.compact = undefined;
      await handleCommand(ctx, 'compact');
      expect(addToast).toHaveBeenCalledWith('Compaction not supported', 'error');
    });

    it('handles compaction error', async () => {
      const session = runtime.session as any;
      session.compact = vi.fn().mockRejectedValue(new Error('fail'));
      await handleCommand(ctx, 'compact');
      expect(addToast).toHaveBeenCalledWith('Compaction failed', 'error');
    });
  });

  describe('reload', () => {
    it('reloads settings and resources', async () => {
      await handleCommand(ctx, 'reload');
      expect(runtime.settings?.reload).toHaveBeenCalled();
      expect(runtime.session.resourceLoader.reload).toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('All resources reloaded', 'success');
    });

    it('handles reload error', async () => {
      runtime.settings.reload = vi.fn().mockRejectedValue(new Error('fail'));
      await handleCommand(ctx, 'reload');
      expect(addToast).toHaveBeenCalledWith('Reload failed: fail', 'error');
    });
  });

  describe('logout', () => {
    it('logs out from all providers', async () => {
      const authStorage = runtime.authStorage as any;
      authStorage.getProviders = vi.fn().mockReturnValue(['github', 'anthropic']);
      authStorage.removeApiKey = vi.fn().mockResolvedValue(undefined);

      await handleCommand(ctx, 'logout');

      expect(authStorage.removeApiKey).toHaveBeenCalledWith('github');
      expect(authStorage.removeApiKey).toHaveBeenCalledWith('anthropic');
      expect(addToast).toHaveBeenCalledWith('Logged out from 2 provider(s)', 'success');
    });

    it('handles empty providers', async () => {
      const authStorage = runtime.authStorage as any;
      authStorage.getProviders = vi.fn().mockReturnValue([]);

      await handleCommand(ctx, 'logout');

      expect(authStorage.removeApiKey).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('Logged out from 0 provider(s)', 'success');
    });

    it('handles logout error', async () => {
      const authStorage = runtime.authStorage as any;
      authStorage.getProviders = vi.fn().mockReturnValue(['github']);
      authStorage.removeApiKey = vi.fn().mockRejectedValue(new Error('fail'));

      await handleCommand(ctx, 'logout');

      expect(addToast).toHaveBeenCalledWith('Logout failed', 'error');
    });
  });

  describe('fork', () => {
    it('opens user message selector modal', async () => {
      await handleCommand(ctx, 'fork');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'user-message-selector' });
    });
  });

  describe('stats', () => {
    it('opens stats modal with performance stats', async () => {
      const stats = { tokens: 100 };
      (runtime.session as any).getPerformanceStats = vi.fn().mockReturnValue(stats);
      await handleCommand(ctx, 'stats');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'stats', stats });
    });

    it('shows info when performance tracking disabled', async () => {
      (runtime.session as any).getPerformanceStats = vi.fn().mockReturnValue(undefined);
      await handleCommand(ctx, 'stats');
      expect(setActiveModal).not.toHaveBeenCalled();
      expect(addToast).toHaveBeenCalledWith('Performance tracking disabled', 'info');
    });
  });

  describe('arminsayshi', () => {
    it('opens armin modal', async () => {
      await handleCommand(ctx, 'arminsayshi');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'armin' });
    });
  });

  describe('dementedelves', () => {
    it('opens earendil modal', async () => {
      await handleCommand(ctx, 'dementedelves');
      expect(setActiveModal).toHaveBeenCalledWith({ type: 'earendil' });
    });
  });
});
