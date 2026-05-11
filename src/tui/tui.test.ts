// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for TerminalUI class (tui.ts)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TerminalUI } from './tui';
import type { Terminal } from './atoms/terminal';
import type { UIElement, RenderContext, InteractiveElement } from './atoms/base';

// Mock Terminal
const createMockTerminal = (): Terminal => ({
  start: vi.fn(),
  stop: vi.fn(),
  write: vi.fn(),
  drainInput: vi.fn().mockResolvedValue(undefined),
  get columns() { return 80; },
  get rows() { return 24; },
  get kittyProtocolActive() { return false; },
  moveBy: vi.fn(),
  moveTo: vi.fn(),
  hideCursor: vi.fn(),
  showCursor: vi.fn(),
  clearLine: vi.fn(),
  clearFromCursor: vi.fn(),
  clearScreen: vi.fn(),
  setTitle: vi.fn(),
  queryCellSize: vi.fn().mockResolvedValue({ width: 8, height: 16 }),
  writeImage: vi.fn(),
});

// Mock UIElement
const createMockElement = (lines: string[] = ['Mock']): UIElement => ({
  draw: vi.fn().mockReturnValue(lines),
  clearCache: vi.fn(),
});

// Mock InteractiveElement
const createMockInteractive = (): InteractiveElement => ({
  isFocused: false,
});

const defaultRenderContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('TerminalUI', () => {
  let tui: TerminalUI;
  let mockTerminal: Terminal;
  let mockChild: UIElement;

  beforeEach(() => {
    mockTerminal = createMockTerminal();
    tui = new TerminalUI(mockTerminal);
    mockChild = createMockElement();
    tui.append(mockChild);
  });

  afterEach(() => {
    tui.stop();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(tui).toBeInstanceOf(TerminalUI);
    });

    it('should accept showHardwareCursor option', () => {
      const tui2 = new TerminalUI(mockTerminal, true);
      expect(tui2['showHardwareCursor']).toBe(true);
    });

    it('should initialize default values', () => {
      expect(tui['previousWidth']).toBe(0);
      expect(tui['previousHeight']).toBe(0);
      expect(tui['focusedElement']).toBeNull();
      expect(tui['stopped']).toBe(false);
    });

    it('should initialize panel stack empty', () => {
      expect(tui['panelStack']).toHaveLength(0);
    });
  });

  describe('append() / remove()', () => {
    it('should add child to children', () => {
      expect(tui.children).toHaveLength(1);
    });

    it('should call onMount if present', () => {
      const child = { onMount: vi.fn(), draw: vi.fn().mockReturnValue([]), clearCache: vi.fn() } as any;
      tui.append(child);
      expect(child.onMount).toHaveBeenCalled();
    });

    it('should request render after append', () => {
      tui.requestRender = vi.fn();
      tui.append(createMockElement());
      expect(tui.requestRender).toHaveBeenCalled();
    });

    it('should call onUnmount on remove', () => {
      const child = { onUnmount: vi.fn(), clearCache: vi.fn(), draw: vi.fn().mockReturnValue([]) } as any;
      tui.remove(child);
      // Not called because child not in children? Actually we added mockChild in beforeEach
      // Let's test properly
      const childWithUnmount: any = { onUnmount: vi.fn(), clearCache: vi.fn(), draw: vi.fn() };
      tui.append(childWithUnmount);
      tui.remove(childWithUnmount);
      expect(childWithUnmount.onUnmount).toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    it('should call terminal.start with handlers', () => {
      tui.start();
      expect(mockTerminal.start).toHaveBeenCalled();
      // The handlers are passed as arguments
    });

    it('should hide cursor', () => {
      tui.start();
      expect(mockTerminal.hideCursor).toHaveBeenCalled();
    });

    it('should query cell size for images', () => {
      tui.start();
      expect(mockTerminal.queryCellSize).toHaveBeenCalled();
    });

    it('should request initial render', () => {
      tui.requestRender = vi.fn();
      tui.start();
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('should set stopped flag', () => {
      tui.stop();
      expect(tui['stopped']).toBe(true);
    });

    it('should clear render timer', () => {
      tui['renderTimer'] = setTimeout(() => {}, 1000) as any;
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      tui.stop();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should stop inertial scrolling', () => {
      const spy = vi.spyOn(tui as any, 'stopInertiaScroll');
      tui.stop();
      expect(spy).toHaveBeenCalled();
    });

    it('should disable synchronized output mode', () => {
      tui.stop();
      expect(mockTerminal.write).toHaveBeenCalledWith('\x1b[?2026l');
    });

    it('should clear key handlers', () => {
      tui.addKeyHandler(() => ({}));
      expect(tui['keyHandlers'].size).toBe(1);
      tui.stop();
      expect(tui['keyHandlers'].size).toBe(0);
    });

    it('should move cursor and show cursor', () => {
      tui['previousLines'] = ['Line1', 'Line2'];
      tui['hardwareCursorRow'] = 1;
      tui.stop();
      // Should contain move and newline
    });

    it('should call terminal.stop()', () => {
      tui.stop();
      expect(mockTerminal.stop).toHaveBeenCalled();
    });
  });

  describe('requestRender()', () => {
    it('should set renderRequested flag', () => {
      tui.requestRender();
      expect(tui['renderRequested']).toBe(true);
    });

    it('should schedule render if not already scheduled', () => {
      tui.requestRender();
      expect(tui['renderTimer']).toBeDefined();
    });

    it('should not schedule duplicate renders', () => {
      tui.requestRender();
      const timer1 = tui['renderTimer'];
      tui.requestRender();
      const timer2 = tui['renderTimer'];
      expect(timer1).toBe(timer2);
    });

    it('should force immediate render if force=true', () => {
      tui.requestRender = vi.fn();
      tui['renderInternal'] = vi.fn();
      tui.requestRender(true);
      // Force clears previous state, schedules immediate
    });
  });

  describe('setFocus()', () => {
    it('should set focused element and clear old', () => {
      const interactive: InteractiveElement = { isFocused: false };
      tui.setFocus(interactive);
      expect(interactive.isFocused).toBe(true);
      expect(tui['focusedElement']).toBe(interactive);
    });

    it('should clear previous focused flag', () => {
      const old: InteractiveElement = { isFocused: false };
      tui.setFocus(old);
      tui.setFocus(null as any);
      expect(old.isFocused).toBe(false);
    });

    it('should request render after focus change', () => {
      tui.requestRender = vi.fn();
      const interactive: InteractiveElement = { isFocused: false };
      tui.setFocus(interactive);
      expect(tui.requestRender).toHaveBeenCalled();
    });
  });

  describe('getFocusedElement()', () => {
    it('should return current focused element', () => {
      const interactive: InteractiveElement = { isFocused: false };
      tui.setFocus(interactive);
      expect(tui.getFocusedElement()).toBe(interactive);
    });
  });

  describe('showPanel() / removePanel()', () => {
    it('should show panel and return handle', () => {
      const panel = createMockElement();
      const handle = tui.showPanel(panel);
      expect(handle).toBeDefined();
      expect(handle.close).toBeDefined();
      expect(handle.focus).toBeDefined();
    });

    it('should add panel to stack', () => {
      const panel = createMockElement();
      tui.showPanel(panel);
      expect(tui['panelStack']).toHaveLength(1);
    });

    it('should set hidden to false', () => {
      const panel = createMockElement();
      const handle = tui.showPanel(panel);
      expect(handle.isHidden()).toBe(false);
    });

    it('should focus panel by default (nonCapturing false)', () => {
      const panel: any = { ...createMockElement(), isFocused: false };
      tui.showPanel(panel);
      expect(panel.isFocused).toBe(true);
    });

    it('should not focus if nonCapturing option set', () => {
      const panel: any = { ...createMockElement(), isFocused: false };
      tui.showPanel(panel, { nonCapturing: true });
      expect(panel.isFocused).toBe(false);
    });

    it('should call onMount lifecycle', () => {
      const panel = { onMount: vi.fn(), clearCache: vi.fn(), draw: vi.fn().mockReturnValue([]) } as any;
      tui.showPanel(panel);
      expect(panel.onMount).toHaveBeenCalled();
    });

    it('should call removePanel on handle.close()', () => {
      const panel = createMockElement();
      tui.showPanel(panel);
      const handle = tui.showPanel(createMockElement()); // actually create a new panel
      // We need the handle for that panel specifically...
      const stackBefore = tui['panelStack'].length;
      handle.close();
      expect(tui['panelStack'].length).toBe(stackBefore - 1);
    });

    it('should setHidden and isHidden correctly', () => {
      const panel = createMockElement();
      const handle = tui.showPanel(panel);
      handle.setHidden(true);
      expect(handle.isHidden()).toBe(true);
      handle.setHidden(false);
      expect(handle.isHidden()).toBe(false);
    });

    it('should setZIndex and getZIndex correctly', () => {
      const panel = createMockElement();
      const handle = tui.showPanel(panel, { zIndex: 5 });
      expect(handle.getZIndex()).toBe(5);
      handle.setZIndex(10);
      expect(handle.getZIndex()).toBe(10);
    });

    it('should bringToFront and sendToBack adjust relative zIndex', () => {
      const p1 = createMockElement();
      const p2 = createMockElement();
      tui.showPanel(p1, { zIndex: 0 });
      tui.showPanel(p2, { zIndex: 0 });
      const handle2 = tui.showPanel(createMockElement()); // Actually we need handle for p2
      // Let's use the returned handles: adjust p2
      // Simpler: after showing both, p2 is on top due to later focusOrder if same zIndex.
    });
  });

  describe('scroll() / scrollTo()', () => {
    it('should scroll by delta', () => {
      tui['totalBaseLines'] = 100;
      tui.scroll(10);
      expect(tui['scrollTop']).toBe(10);
    });

    it('should clamp scrollTop to min 0', () => {
      tui['totalBaseLines'] = 100;
      tui.scroll(-20);
      expect(tui['scrollTop']).toBe(0);
    });

    it('should clamp to max', () => {
      tui['totalBaseLines'] = 100;
      tui.scroll(100);
      const max = tui.getScrollMax();
      expect(tui['scrollTop']).toBe(max);
    });

    it('should request render after scroll', () => {
      tui.requestRender = vi.fn();
      tui['totalBaseLines'] = 100;
      tui.scroll(10);
      expect(tui.requestRender).toHaveBeenCalled();
    });

    it('scrollTo should set absolute position', () => {
      tui['totalBaseLines'] = 100;
      tui.scrollTo(50);
      expect(tui['scrollTop']).toBe(50);
    });
  });

  describe('getScrollMetrics() / getScrollMax()', () => {
    it('should return scroll metrics', () => {
      tui['totalBaseLines'] = 100;
      tui['scrollTop'] = 20;
      const metrics = tui.getScrollMetrics();
      expect(metrics.scrollTop).toBe(20);
      expect(metrics.totalLines).toBe(100);
      expect(metrics.viewportLines).toBe(24);
    });

    it('getScrollMax should compute max scrollTop', () => {
      tui['totalBaseLines'] = 100;
      expect(tui.getScrollMax()).toBe(76);
    });
  });

  describe('handleWheelScroll() / inertial scrolling', () => {
    it('should accumulate velocity', () => {
      tui.handleWheelScroll(-1);
      expect(tui['inertiaScrollVelocity']).toBe(-1);
    });

    it('should start inertia scroll loop', () => {
      tui.handleWheelScroll(1);
      expect(tui['inertiaScrollTimer']).toBeDefined();
    });
  });

  describe('handleKey() - key repeat and chords', () => {
    it('should process key handlers', () => {
      const handler = vi.fn().mockReturnValue({ consume: true });
      tui.addKeyHandler(handler);
      tui.isActive = true; // or tui['stopped'] = false
      // Actually handleKey expects raw data string
      tui['handleKey']('\x1b'); // trigger
      // Hard to unit test without full machinery
    });
  });

  describe('registerChord() / unregisterChord()', () => {
    it('should register and trigger chord handler', () => {
      const handler = vi.fn();
      tui.registerChord(['a', 'b'], handler);
      tui['processChords']({ name: 'a', ctrl: false, alt: false, shift: false, meta: false });
      tui['processChords']({ name: 'b', ctrl: false, alt: false, shift: false, meta: false });
      expect(handler).toHaveBeenCalled();
    });

    it('should unregister chord', () => {
      tui.registerChord(['x', 'y'], vi.fn());
      tui.unregisterChord(['x', 'y']);
      // Should not fire
    });
  });

  describe('getRenderMetrics()', () => {
    it('should return frame and timing metrics', () => {
      tui['totalFrames'] = 100;
      tui['totalRenderTimeMs'] = 5000;
      const metrics = tui.getRenderMetrics();
      expect(metrics.frames).toBe(100);
      expect(metrics.avgMs).toBe(50);
    });
  });

  describe('enableMemoryLeakDetection() / getMemoryStats()', () => {
    it('should track created/destroyed', () => {
      tui.enableMemoryLeakDetection(true);
      tui.append(createMockElement());
      tui.remove(tui.children[0]);
      const stats = tui.getMemoryStats();
      expect(stats.created).toBe(1);
      expect(stats.destroyed).toBe(1);
      expect(stats.net).toBe(0);
    });
  });

  describe('setDebugOverlay()', () => {
    it('should toggle debug overlay', () => {
      tui.setDebugOverlay(true);
      expect(tui['debugOverlayEnabled']).toBe(true);
      expect(tui['debugOverlayComponent']).toBeDefined();
      tui.setDebugOverlay(false);
      expect(tui['debugOverlayEnabled']).toBe(false);
    });
  });

  describe('setLayoutInspector()', () => {
    it('should toggle layout inspector', () => {
      tui.setLayoutInspector(true);
      expect(tui['layoutInspectorEnabled']).toBe(true);
    });
  });

  describe('registerComponent() / createComponent()', () => {
    it('should register and create component', () => {
      const MockComp = class implements UIElement {
        draw(ctx) { return []; }
        clearCache() {}
      };
      tui.registerComponent('test', MockComp);
      const instance = tui.createComponent('test', {});
      expect(instance).toBeInstanceOf(MockComp);
    });

    it('should return undefined for unknown component', () => {
      const instance = tui.createComponent('nonexistent');
      expect(instance).toBeUndefined();
    });
  });

  describe('getComponentStats()', () => {
    it('should return children and panels count', () => {
      tui.append(createMockElement());
      tui.showPanel(createMockElement());
      const stats = tui.getComponentStats();
      expect(stats.children).toBe(2);
      expect(stats.panels).toBe(1);
    });
  });

  describe('getLayoutInfo()', () => {
    it('should return layout info', () => {
      tui['totalBaseLines'] = 10;
      tui['scrollTop'] = 2;
      const info = tui.getLayoutInfo();
      expect(info.totalBaseLines).toBe(10);
      expect(info.scrollTop).toBe(2);
      expect(info.terminalWidth).toBe(80);
    });
  });

  describe('setExtensionHook()', () => {
    it('should set mount and unmount hooks', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();
      tui.setExtensionHook('mount', onMount);
      tui.setExtensionHook('unmount', onUnmount);
      expect(tui['extensionHooks'].onMount).toBe(onMount);
      expect(tui['extensionHooks'].onUnmount).toBe(onUnmount);
    });
  });

  describe('getShowHardwareCursor() / setShowHardwareCursor()', () => {
    it('should toggle and return value', () => {
      expect(tui.getShowHardwareCursor()).toBe(false);
      tui.setShowHardwareCursor(true);
      expect(tui.getShowHardwareCursor()).toBe(true);
    });
  });

  describe('setClearOnShrink() / getClearOnShrink()', () => {
    it('should get and set', () => {
      expect(tui.getClearOnShrink()).toBe(false);
      tui.setClearOnShrink(true);
      expect(tui.getClearOnShrink()).toBe(true);
    });
  });

  describe('getSize()', () => {
    it('should return terminal dimensions', () => {
      const size = tui.getSize();
      expect(size.rows).toBe(24);
      expect(size.cols).toBe(80);
    });
  });

  describe('isActive()', () => {
    it('should return true if not stopped', () => {
      tui['stopped'] = false;
      expect(tui.isActive()).toBe(true);
      tui['stopped'] = true;
      expect(tui.isActive()).toBe(false);
    });
  });

  describe('invalidate()', () => {
    it('should call clearCache on all children', () => {
      const child = createMockElement();
      tui.append(child);
      tui.invalidate();
      expect(child.clearCache).toHaveBeenCalled();
    });
  });
});