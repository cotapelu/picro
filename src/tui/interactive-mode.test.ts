// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for InteractiveMode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveMode } from './interactive-mode';
import type { TerminalUI } from './tui';
import type { AgentSessionRuntimeInterface } from '../types/agent-session';

// Mock TerminalUI
const createMockTUI = (): TerminalUI => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    requestRender: vi.fn(),
    setFocus: vi.fn(),
    getFocusedElement: vi.fn(),
  } as unknown as TerminalUI;
};

// Mock runtime
const createMockRuntime = (): AgentSessionRuntimeInterface => {
  return {
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
  };
};

describe('InteractiveMode', () => {
  let tui: TerminalUI;

  beforeEach(() => {
    tui = createMockTUI();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const mode = new InteractiveMode(tui);
      expect(mode).toBeDefined();
      expect(mode.isFocused).toBe(false);
    });

    it('should create instance with custom options', () => {
      const mode = new InteractiveMode(tui, {
        inputPlaceholder: 'Custom placeholder',
        initialStatus: 'Custom status',
      });
      expect(mode).toBeDefined();
    });
  });

  describe('containers', () => {
    it('should have all required containers', () => {
      const mode = new InteractiveMode(tui);
      expect(mode.headerContainer).toBeDefined();
      expect(mode.chatContainer).toBeDefined();
      expect(mode.pendingContainer).toBeDefined();
      expect(mode.statusContainer).toBeDefined();
      expect(mode.widgetAboveContainer).toBeDefined();
      expect(mode.editorContainer).toBeDefined();
      expect(mode.widgetBelowContainer).toBeDefined();
      expect(mode.footerContainer).toBeDefined();
    });

    it('should append containers to children', () => {
      const mode = new InteractiveMode(tui);
      expect(mode.children).toContain(mode.headerContainer);
      expect(mode.children).toContain(mode.chatContainer);
      expect(mode.children).toContain(mode.editorContainer);
    });
  });

  describe('setRuntime()', () => {
    it('should accept runtime without error', () => {
      const mode = new InteractiveMode(tui);
      const runtime = createMockRuntime();
      expect(() => mode.setRuntime(runtime)).not.toThrow();
    });

    it('should allow null runtime initially', () => {
      const mode = new InteractiveMode(tui);
      expect(() => mode.setRuntime(null as any)).not.toThrow();
    });
  });

  describe('init()', () => {
    it('should initialize editor and header', async () => {
      const mode = new InteractiveMode(tui);
      await mode.init();
      
      expect(tui.start).toHaveBeenCalled();
      expect(tui.setFocus).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      const mode = new InteractiveMode(tui);
      await mode.init();
      (tui.start as any).mockClear();
      
      await mode.init();
      expect(tui.start).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should stop the running loop', () => {
      const mode = new InteractiveMode(tui);
      mode.stop();
      // Running flag should be false
    });
  });

  describe('addUserMessage()', () => {
    it('should add user message to chat container', () => {
      const mode = new InteractiveMode(tui);
      mode.addUserMessage('Hello');
      
      expect(mode.chatContainer.children.length).toBe(1);
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('addAssistantMessage()', () => {
    it('should add assistant message to chat container', () => {
      const mode = new InteractiveMode(tui);
      mode.addAssistantMessage('Hi there!');
      
      expect(mode.chatContainer.children.length).toBe(1);
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('addToolMessage()', () => {
    it('should add tool message to chat container', () => {
      const mode = new InteractiveMode(tui);
      mode.addToolMessage('bash', 'ls -la');
      
      expect(mode.chatContainer.children.length).toBe(1);
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('setStatus()', () => {
    it('should update status container', () => {
      const mode = new InteractiveMode(tui);
      mode.setStatus('Processing...');
      
      expect(mode.statusContainer.children.length).toBe(1);
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('setWidget()', () => {
    it('should add widget above editor by default', () => {
      const mode = new InteractiveMode(tui);
      mode.setWidget('test', ['Line 1', 'Line 2']);
      
      expect(mode.widgetAboveContainer.children.length).toBe(1);
    });

    it('should add widget below editor when specified', () => {
      const mode = new InteractiveMode(tui);
      mode.setWidget('test', ['Content'], { placement: 'belowEditor' });
      
      expect(mode.widgetBelowContainer.children.length).toBe(1);
    });
  });

  describe('setHeader()', () => {
    it('should clear and set new header', () => {
      const mode = new InteractiveMode(tui);
      const mockElement = { draw: vi.fn(), clearCache: vi.fn() } as unknown as any;
      
      mode.setHeader(mockElement);
      
      expect(mode.headerContainer.children.length).toBe(1);
    });

    it('should clear header when null passed', () => {
      const mode = new InteractiveMode(tui);
      mode.setHeader(null as any);
      
      expect(mode.headerContainer.children.length).toBe(0);
    });
  });

  describe('setRightItems()', () => {
    it('should be callable without error', () => {
      const mode = new InteractiveMode(tui);
      expect(() => mode.setRightItems(['item1', 'item2'])).not.toThrow();
    });
  });

  describe('clearCache()', () => {
    it('should clear cache on all containers', () => {
      const mode = new InteractiveMode(tui);
      mode.clearCache();
      // No exception thrown
    });
  });

  describe('handleKey()', () => {
    it('should forward key events to editor when initialized', async () => {
      const mode = new InteractiveMode(tui);
      await mode.init();
      
      const mockKey = { raw: 'a' };
      mode.handleKey?.(mockKey);
    });

    it('should not throw when editor is null', () => {
      const mode = new InteractiveMode(tui);
      const mockKey = { raw: 'a' };
      // Should not throw even without init()
      expect(() => mode.handleKey?.(mockKey)).not.toThrow();
    });
  });

  describe('run() loop', () => {
    it('should handle immediate stop without input', async () => {
      const mode = new InteractiveMode(tui);
      await mode.init();
      
      // Stop immediately - should exit without waiting for input
      setTimeout(() => mode.stop(), 10);
      
      // run() should exit gracefully when stop() is called
      await mode.run();
    });
  });

  describe('draw()', () => {
    it('should draw without errors', () => {
      const mode = new InteractiveMode(tui);
      const context = { width: 80, height: 24 };
      const lines = mode.draw(context);
      expect(Array.isArray(lines)).toBe(true);
    });

    it('should handle zero width gracefully', () => {
      const mode = new InteractiveMode(tui);
      const context = { width: 0, height: 24 };
      const lines = mode.draw(context);
      expect(Array.isArray(lines)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message string', () => {
      const mode = new InteractiveMode(tui);
      mode.addUserMessage('');
      expect(mode.chatContainer.children.length).toBe(1);
    });

    it('should handle very long message', () => {
      const mode = new InteractiveMode(tui);
      const longMsg = 'x'.repeat(10000);
      mode.addUserMessage(longMsg);
      expect(mode.chatContainer.children.length).toBe(1);
    });

    it('should handle multiple messages', () => {
      const mode = new InteractiveMode(tui);
      mode.addUserMessage('Msg 1');
      mode.addAssistantMessage('Msg 2');
      mode.addUserMessage('Msg 3');
      expect(mode.chatContainer.children.length).toBe(3);
    });

    it('should handle status updates', () => {
      const mode = new InteractiveMode(tui);
      mode.setStatus('Status 1');
      mode.setStatus('Status 2');
      expect(mode.statusContainer.children.length).toBe(1);
    });

    it('should handle widget replacement', () => {
      const mode = new InteractiveMode(tui);
      mode.setWidget('key1', ['Content 1']);
      mode.setWidget('key2', ['Content 2']);
      // Should have 2 widgets
      expect(mode.widgetAboveContainer.children.length).toBe(2);
    });

    it('should handle null runtime gracefully in run', async () => {
      const mode = new InteractiveMode(tui);
      mode.setRuntime(null as any);
      await mode.init();
      
      setTimeout(() => mode.stop(), 10);
      await mode.run();
    });
  });
});