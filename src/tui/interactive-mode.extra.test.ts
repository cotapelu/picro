// Additional tests for InteractiveMode - covering more methods
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveMode } from './interactive-mode';
import type { TerminalUI } from './tui';
import type { AgentSessionRuntimeInterface } from '../types/agent-session';

const createMockTUI = (): TerminalUI => ({
  start: vi.fn(),
  stop: vi.fn(),
  requestRender: vi.fn(),
  setFocus: vi.fn(),
  getFocusedElement: vi.fn(),
  showPanel: vi.fn().mockReturnValue({ close: vi.fn() }),
  registerComponent: vi.fn(),
  createComponent: vi.fn(),
} as any);

const createMockRuntime = (): AgentSessionRuntimeInterface => ({
  session: {
    prompt: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => {}),
    abort: vi.fn(),
    messages: [],
    isStreaming: false,
  },
  cwd: '/test',
  newSession: vi.fn().mockResolvedValue({ cancelled: false }),
  switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
  fork: vi.fn().mockResolvedValue({ cancelled: false }),
  setBeforeSessionInvalidate: vi.fn(),
  setRebindSession: vi.fn(),
});

describe('InteractiveMode Additional', () => {
  let tui: TerminalUI;
  let mode: InteractiveMode;
  let runtime: AgentSessionRuntimeInterface;

  beforeEach(() => {
    tui = createMockTUI();
    mode = new InteractiveMode(tui);
    runtime = createMockRuntime();
    mode.setRuntime(runtime);
  });

  describe('message adding', () => {
    it('addUserMessage should append to chatContainer', () => {
      mode.addUserMessage('Hello');
      expect(mode.chatContainer.children.length).toBe(1);
    });

    it('addAssistantMessage should append to chatContainer', () => {
      mode.addAssistantMessage('Hi');
      expect(mode.chatContainer.children.length).toBe(1);
    });

    it('addToolMessage should append to chatContainer', () => {
      mode.addToolMessage('bash', 'ls -la');
      expect(mode.chatContainer.children.length).toBe(1);
    });
  });

  describe('setStatus()', () => {
    it('should update statusContainer', () => {
      mode.setStatus('Processing...');
      expect(mode.statusContainer.children.length).toBe(1);
    });
  });

  describe('setWidget()', () => {
    it('should add to widgetAboveContainer by default', () => {
      mode.setWidget('key', ['Line']);
      expect(mode.widgetAboveContainer.children.length).toBe(1);
    });

    it('should add to widgetBelowContainer when specified', () => {
      mode.setWidget('key', ['Content'], { placement: 'belowEditor' });
      expect(mode.widgetBelowContainer.children.length).toBe(1);
    });
  });

  describe('setHeader()', () => {
    it('should set headerContainer children', () => {
      const el = { draw: vi.fn().mockReturnValue([]), clearCache: vi.fn() } as any;
      mode.setHeader(el);
      expect(mode.headerContainer.children.length).toBe(1);
    });

    it('should clear header when null', () => {
      mode.setHeader(null as any);
      expect(mode.headerContainer.children.length).toBe(0);
    });
  });

  describe('setRightItems()', () => {
    it('should call footer.setRightItems', () => {
      mode.setRightItems(['item1', 'item2']);
      // No error thrown
    });
  });

  describe('clearCache()', () => {
    it('should clear all containers caches', () => {
      mode.clearCache();
      // no error
    });
  });

  describe('run() loop', () => {
    it('should handle immediate stop', async () => {
      mode.init();
      setTimeout(() => mode.stop(), 10);
      await mode.run();
      // Should exit without infinite loop
    });
  });

  describe('command palette', () => {
    it('should handle command palette on Ctrl+P', () => {
      mode.handleCommandPalette();
      // showPanel called
      expect(tui.showPanel).toHaveBeenCalled();
    });
  });

  describe('thinking selector', () => {
    it('should show thinking selector on Ctrl+T', () => {
      mode.handleThinkingSelector();
      expect(tui.showPanel).toHaveBeenCalled();
    });
  });
});