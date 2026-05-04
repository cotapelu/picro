import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAgentToolBridge } from '../agent-bridge';
import type { UIElement, RenderContext, Terminal } from '../base';

// Mock TerminalUI
class MockTerminalUI {
  showPanel = vi.fn();
  hidePanel = vi.fn();
}
class MockPanel implements UIElement {
  draw = vi.fn().mockReturnValue(['line']);
  isActive = vi.fn().mockReturnValue(true);
  setFocus = vi.fn();
  keypress = vi.fn();
  getPreferredDimensions = vi.fn().mockReturnValue({ width: 80, height: 10 });
  isFocused = false;
  clearCache = vi.fn();
}

describe('AgentBridge', () => {
  let mockTui: MockTerminalUI;
  let mockEmitter: any;
  let mockPanel: MockPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTui = new MockTerminalUI();
    mockPanel = new MockPanel();
    mockEmitter = {
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  describe('createAgentToolBridge', () => {
    it('should create bridge', () => {
      const bridge = createAgentToolBridge(mockTui as any, mockEmitter);
      expect(bridge).toBeDefined();
      expect(bridge.destroy).toBeDefined();
    });

    it('should register event listeners', () => {
      createAgentToolBridge(mockTui as any, mockEmitter);
      expect(mockEmitter.on).toHaveBeenCalled();
    });

    it('should show panel on tui', () => {
      createAgentToolBridge(mockTui as any, mockEmitter);
      expect(mockTui.showPanel).toHaveBeenCalled();
    });

    it('should accept panel height option', () => {
      const bridge = createAgentToolBridge(mockTui as any, mockEmitter, { panelHeight: 20 });
      expect(bridge).toBeDefined();
    });

    it('should accept anchor option', () => {
      const bridge = createAgentToolBridge(mockTui as any, mockEmitter, { anchor: 'top-center' });
      expect(bridge).toBeDefined();
    });
  });

  describe('destroy', () => {
    it('should remove event listeners', () => {
      const bridge = createAgentToolBridge(mockTui as any, mockEmitter);
      bridge.destroy();
      expect(mockEmitter.off).toHaveBeenCalled();
    });

    it('should allow multiple destroy calls', () => {
      const bridge = createAgentToolBridge(mockTui as any, mockEmitter);
      expect(() => bridge.destroy()).not.toThrow();
      expect(() => bridge.destroy()).not.toThrow();
    });
  });
});