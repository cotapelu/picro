// InteractiveController.test.ts - Simple test for InteractiveController
// Hỗ trợ tiếng Việt có dấu (UTF-8)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractiveController } from './interactive-controller.js';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';

// Simple mock - spread object so tests can override methods
const createMockRuntime = (): AgentSessionRuntimeInterface => {
  return {
    session: {
      subscribe: () => () => {},
      messages: [],
      isStreaming: false,
      thinkingLevel: 'off',
      setThinkingLevel: async () => {},
      prompt: async () => {},
      compact: async () => {},
      newSession: async () => ({ cancelled: false }),
      switchSession: async () => ({ cancelled: false }),
      cycleModel: async () => ({ model: undefined }),
      setModel: async () => {},
      setAutoCompactionEnabled: async () => {},
      getContextUsage: () => ({ tokens: 0, contextWindow: 100000, percent: 0 }),
      getTools: () => [],
      getActiveTools: () => [],
      setActiveTools: () => {},
      getToolDefinition: () => undefined,
      getSteeringMessages: () => [],
      getFollowUpMessages: () => [],
      clearQueue: () => ({ steering: [], followUp: [] }),
      abort: () => {},
      model: { id: 'gemini-pro', provider: 'google' },
    },
    authStorage: {
      getProviders: () => ['google'],
      setApiKey: async () => {},
      removeApiKey: async () => {},
    },
    settings: {
      getDefaultProvider: () => 'google',
      getDefaultModel: () => 'gemini-pro',
      getDefaultThinkingLevel: () => 'off',
      getTheme: () => 'dark',
      getDisabledTools: () => [],
      setTheme: async () => {},
      setToolDisabled: async () => {},
    },
    cwd: '/test/cwd',
    sessionManager: {
      getEntries: () => [],
      getSessionId: () => 'test-session-123',
      getCwd: () => '/test/cwd',
      setSessionName: async () => {},
    },
    setThinkingLevel: async () => {},
    newSession: async () => ({ cancelled: false }),
  } as unknown as AgentSessionRuntimeInterface;
};

describe('InteractiveController', () => {
  let controller: InteractiveController;
  let runtime: AgentSessionRuntimeInterface;

  beforeEach(() => {
    runtime = createMockRuntime();
    controller = new InteractiveController({ runtime });
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('Initialization', () => {
    it('initializes with empty messages', () => {
      expect(controller.getMessages()).toEqual([]);
    });

    // Footer phải hiện model CỦA PHIÊN ngay từ đầu (pi-mono: footer đọc
    // session.model khi render). Bản cũ để "unknown" cho tới hết lượt đầu tiên.
    it('initializes with the session model in the status', () => {
      const state = controller.getStatus();
      expect(state.model).toBe('google/gemini-pro');
      expect(state.tokens).toBe('0/100000');
      expect(state.cwd).toBe('/test/cwd');
      expect(state.isProcessing).toBe(false);
    });

    it('initializes with empty modal', () => {
      expect(controller.getModal().type).toBe('none');
    });

    it('initializes with empty toasts', () => {
      expect(controller.getToasts()).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('adds user message to messages', async () => {
      const controller = new InteractiveController({ runtime });
      await controller.sendMessage('Hello world');
      
      const messages = controller.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello world');
      
      controller.dispose();
    });

    it('rejects empty message', async () => {
      const controller = new InteractiveController({ runtime });
      await controller.sendMessage('');
      await controller.sendMessage('   ');
      
      const messages = controller.getMessages();
      expect(messages.length).toBe(0);
      
      controller.dispose();
    });

    it('supports Vietnamese diacritics', async () => {
      const controller = new InteractiveController({ runtime });
      const vietnameseText = 'Chào bạn, bạn có thể giúp tôi không?';
      
      await controller.sendMessage(vietnameseText);
      
      expect(controller.getMessages()[0].content).toBe(vietnameseText);
      
      controller.dispose();
    });
  });

  describe('runCommand', () => {
    it('handles /quit command', async () => {
      const controller = new InteractiveController({ runtime });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      await controller.runCommand('quit');
      
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
      controller.dispose();
    });

    it('handles /exit command', async () => {
      const controller = new InteractiveController({ runtime });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      
      await controller.runCommand('exit');
      
      expect(exitSpy).toHaveBeenCalledWith(0);
      exitSpy.mockRestore();
      controller.dispose();
    });

    it('handles /thinking command with valid level', async () => {
      const controller = new InteractiveController({ runtime });
      const spy = vi.spyOn(runtime, 'setThinkingLevel').mockResolvedValue(undefined);
      
      await controller.runCommand('thinking', 'high');
      
      expect(spy).toHaveBeenCalledWith('high');
      spy.mockRestore();
      controller.dispose();
    });

    it('handles /thinking command with invalid level shows modal', async () => {
      const controller = new InteractiveController({ runtime });
      const spy = vi.spyOn(runtime, 'setThinkingLevel').mockResolvedValue(undefined);
      
      await controller.runCommand('thinking', 'invalid');
      
      expect(spy).not.toHaveBeenCalled();
      expect(controller.getModal().type).toBe('thinking');
      spy.mockRestore();
      controller.dispose();
    });

    it('handles /login command', async () => {
      const controller = new InteractiveController({ runtime });
      
      await controller.runCommand('login');
      
      const modal = controller.getModal();
      expect(modal.type).toBe('login');
      
      controller.dispose();
    });

    it('handles /help command', async () => {
      const controller = new InteractiveController({ runtime });
      
      await controller.runCommand('help');
      
      const modal = controller.getModal();
      expect(modal.type).toBe('help');
      
      controller.dispose();
    });

    it('handles /compact command', async () => {
      const controller = new InteractiveController({ runtime });
      vi.spyOn(runtime.session, 'compact').mockResolvedValue(undefined);
      
      await controller.runCommand('compact');
      
      const toasts = controller.getToasts();
      expect(toasts.some(t => t.message.includes('Compaction completed'))).toBe(true);
      
      controller.dispose();
    });

    it('handles /settings command', async () => {
      const controller = new InteractiveController({ runtime });
      
      await controller.runCommand('settings');
      
      const modal = controller.getModal();
      expect(modal.type).toBe('settings');
      
      controller.dispose();
    });

    it('handles /model command', async () => {
      const controller = new InteractiveController({ runtime });
      const session = runtime.session as any;
      session.model = { id: 'gemini-pro' };
      
      await controller.runCommand('model');
      
      const modal = controller.getModal();
      expect(modal.type).toBe('model-selector');
      expect(modal.props.current).toBe('gemini-pro');
      
      controller.dispose();
    });

    it('handles unknown command', async () => {
      const controller = new InteractiveController({ runtime });
      
      await controller.runCommand('unknown_command');
      
      const toasts = controller.getToasts();
      expect(toasts.some(t => t.message.includes('not yet implemented'))).toBe(true);
      
      controller.dispose();
    });
  });

  describe('getStatus', () => {
    it('returns copy of status', () => {
      const controller = new InteractiveController({ runtime });
      const status = controller.getStatus();
      status.isProcessing = true;
      
      expect(controller.getStatus().isProcessing).toBe(false);
      
      controller.dispose();
    });
  });

  describe('addToast', () => {
    it('adds toast message', () => {
      const controller = new InteractiveController({ runtime });
      
      controller.addToast('Test message', 'info');
      
      const toasts = controller.getToasts();
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Test message');
      
      controller.dispose();
    });

    it('supports Vietnamese toast message', () => {
      const controller = new InteractiveController({ runtime });
      
      controller.addToast('Thao tác thành công', 'success');
      
      const toasts = controller.getToasts();
      expect(toasts[0].message).toBe('Thao tác thành công');
      
      controller.dispose();
    });
  });

  describe('dispose', () => {
    it('does not throw when disposed', () => {
      const controller = new InteractiveController({ runtime });
      expect(() => controller.dispose()).not.toThrow();
    });
  });
});
