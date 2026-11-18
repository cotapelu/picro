// TUI - base class cho TUI
// Bắt chước nguyên tắc pi-tui tui.ts:
//   - Component tree management
//   - Focus management
//   - Render loop
//   - Mouse handling
// Port sang TSX riêng, không copy code trực tiếp.

import { Component, Focusable, TUI as TUIInterface, TuiMouseEvent, TuiMouseEventResult } from "./TuiTypes.js";
import { Terminal } from "./Terminal.js";
import { ProgramStatus } from "./ProgramStatus.js";
import { ProcessTerminal } from "./Terminal.js";

interface RenderState {
  cursor: { x: number; y: number; shape: "block" | "underline" | "bar"; visible: boolean };
  selection: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  scrollPositions: Map<Component, number>;
}

export abstract class BaseTUI implements TUIInterface {
  protected children: Component[] = [];
  protected focusedComponent: Component | null = null;
  public terminal: Terminal;
  protected renderCallback?: () => void;
  protected debugCallback?: (event: unknown) => void;
  protected exitCallbacks: (() => void)[] = [];
  protected running = false;
  protected lastRender = "";
  protected renderScheduled = false;
  protected renderState: RenderState = {
    cursor: { x: 0, y: 0, shape: "block", visible: true },
    selection: null,
    scrollPositions: new Map(),
  };
  protected showHardwareCursor = false;
  protected logDirectory: string;
  protected clearOnShrink = false;
  protected lastWidth = 0;
  protected lastHeight = 0;
  protected inputHandler?: (data: string) => void;
  protected resizeHandler?: () => void;

  constructor(
    terminal: Terminal,
    showHardwareCursor: boolean,
    logDirectory: string
  ) {
    this.terminal = terminal;
    this.showHardwareCursor = showHardwareCursor;
    this.logDirectory = logDirectory;
  }

  abstract get mode(): "regular" | "fullscreen";

  addChild(child: Component): void {
    this.children.push(child);
    this.invalidate();
  }

  removeChild(child: Component): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      this.invalidate();
    }
  }

  clear(): void {
    this.children = [];
    this.invalidate();
  }

  getChildren(): Component[] {
    return [...this.children];
  }

  invalidate(): void {
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      queueMicrotask(() => this.flushRender());
    }
  }

  protected flushRender(): void {
    this.renderScheduled = false;
    if (!this.running) return;
    this.renderNow();
  }

  renderNow(): void {
    const width = this.terminal.columns;
    const height = this.terminal.rows;

    // Clear screen on first render or size change
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.terminal.clearScreen();
      this.lastWidth = width;
      this.lastHeight = height;
    }

    // Layout and render children
    let output = "";
    let y = 0;
    for (const child of this.children) {
      const childLines = child.render(width);
      for (const line of childLines) {
        output += `\x1b[${y + 1};1H${line}`;
        y++;
      }
    }

    // Position cursor
    if (this.focusedComponent && "getCursor" in this.focusedComponent) {
      const cursor = (this.focusedComponent as any).getCursor();
      if (cursor) {
        output += `\x1b[${cursor.y + 1};${cursor.x + 1}H`;
      }
    }

    // Write to terminal
    this.terminal.write(output);
    this.lastRender = output;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    this.terminal.start(
      (data: string) => this.handleInput(data),
      () => this.handleResize()
    );

    // Initial render
    this.renderNow();
  }

  stop(options?: { preserveScreen?: boolean }): void {
    if (!this.running) return;
    this.running = false;

    this.terminal.stop();

    if (!options?.preserveScreen) {
      this.terminal.clearScreen();
      this.terminal.write("\x1b[H");
    }

    for (const cb of this.exitCallbacks) {
      try { cb(); } catch {}
    }
  }

  setFocus(component: Component | null): void {
    if (this.focusedComponent) {
      if (this.isFocusable(this.focusedComponent)) {
        this.focusedComponent.focused = false;
        this.focusedComponent.capturesViewportInput = false;
      }
    }
    this.focusedComponent = component;
    if (component && this.isFocusable(component)) {
      component.focused = true;
      component.capturesViewportInput = true;
    }
  }

  private isFocusable(c: Component): c is Component & Focusable {
    return "focused" in c && "capturesViewportInput" in c;
  }

  getFocusedComponent(): Component | null {
    return this.focusedComponent;
  }

  requestRender(): void {
    this.invalidate();
  }

  get columns(): number {
    return this.terminal.columns;
  }

  get rows(): number {
    return this.terminal.rows;
  }

  // Abstract methods to be implemented by subclasses
  abstract handleInput(data: string): void;
  abstract handleResize(): void;

  // Common input handling
  protected dispatchInput(data: string): void {
    // Focused component gets first dibs
    if (this.focusedComponent?.handleInput) {
      this.focusedComponent.handleInput(data);
      return;
    }

    // Then check components with capturesViewportInput
    for (const child of this.children) {
      if (this.isFocusable(child) && child.capturesViewportInput && child.handleInput) {
        child.handleInput(data);
        return;
      }
    }

    // Then forward to all children
    for (const child of this.children) {
      if (child.handleInput) {
        child.handleInput(data);
      }
    }
  }

  protected dispatchMouse(event: TuiMouseEvent): void {
    // Focus handling on click
    if (event.type === "press" && event.button === "left") {
      for (let i = this.children.length - 1; i >= 0; i--) {
        const child = this.children[i];
        // Simple hit test - in reality would need layout info
        if (child.handleMouse) {
          const result = child.handleMouse(event);
          if (result?.handled) {
            if (result.focus) this.setFocus(child);
            return;
          }
        }
      }
    }

    // Forward to focused component
    if (this.focusedComponent?.handleMouse) {
      this.focusedComponent.handleMouse(event);
    }
  }

  onExit(callback: () => void): void {
    this.exitCallbacks.push(callback);
  }

  set onDebug(cb: ((event: unknown) => void) | undefined) {
    this.debugCallback = cb;
  }

  get onDebug(): ((event: unknown) => void) | undefined {
    return this.debugCallback;
  }

  setClearOnShrink(enabled: boolean): void {
    this.clearOnShrink = enabled;
  }

  getClearOnShrink(): boolean {
    return this.clearOnShrink;
  }

  getShowHardwareCursor(): boolean {
    return this.showHardwareCursor;
  }
}

/**
 * TuiMainScreen - regular mode (uses normal terminal scrollback)
 */
export class TuiMainScreen extends BaseTUI {
  private capturedRenderState: RenderState | null = null;

  constructor(
    terminal: Terminal = new ProcessTerminal(),
    showHardwareCursor: boolean = false,
    logDirectory: string = ""
  ) {
    super(terminal, showHardwareCursor, logDirectory);
  }

  get mode(): "regular" {
    return "regular";
  }

  captureRenderState(): RenderState {
    return {
      cursor: { ...this.renderState.cursor },
      selection: this.renderState.selection ? { ...this.renderState.selection } : null,
      scrollPositions: new Map(this.renderState.scrollPositions),
    };
  }

  restoreRenderState(state: RenderState): void {
    this.renderState = state;
  }

  handleInput(data: string): void {
    this.dispatchInput(data);
  }

  handleResize(): void {
    this.invalidate();
  }
}

/**
 * TuiAltScreen - fullscreen mode (alternate screen buffer)
 */
export class TuiAltScreen extends BaseTUI {
  private layoutRoot: Component | null = null;
  private overlayStack: Component[] = [];
  private searchMatchStyle: (text: string) => string;
  private searchCurrentMatchStyle: (text: string) => string;
  private searchNavigationButtonStyle: (text: string, hovered: boolean) => string;
  private scrollToEndIndicator: () => string;
  private openUrl: (url: string) => void;
  private onRightClickPaste?: () => void;
  private copyOnSelect: boolean;
  private wheelScrollLines: number | "auto";
  private copySelection: (text: string) => Promise<string | true>;
  private selection: { start: { x: number; y: number }; end: { x: number; y: number } } | null = null;

  constructor(
    terminal: Terminal,
    showHardwareCursor: boolean,
    logDirectory: string,
    options: {
      searchMatchStyle: (text: string) => string;
      searchCurrentMatchStyle: (text: string) => string;
      searchNavigationButtonStyle: (text: string, hovered: boolean) => string;
      scrollToEndIndicator: () => string;
      openUrl: (url: string) => void;
      onRightClickPaste?: () => void;
      copyOnSelect: boolean;
      wheelScrollLines: number | "auto";
      copySelection: (text: string) => Promise<string | true>;
    }
  ) {
    super(terminal, showHardwareCursor, logDirectory);

    // Enter alternate screen
    this.terminal.write("\x1b[?1049h");
    this.terminal.hideCursor();

    this.searchMatchStyle = options.searchMatchStyle;
    this.searchCurrentMatchStyle = options.searchCurrentMatchStyle;
    this.searchNavigationButtonStyle = options.searchNavigationButtonStyle;
    this.scrollToEndIndicator = options.scrollToEndIndicator;
    this.openUrl = options.openUrl;
    this.onRightClickPaste = options.onRightClickPaste;
    this.copyOnSelect = options.copyOnSelect;
    this.wheelScrollLines = options.wheelScrollLines;
    this.copySelection = options.copySelection;
  }

  get mode(): "fullscreen" {
    return "fullscreen";
  }

  get hasOverlayEntries(): boolean {
    return this.overlayStack.length > 0;
  }

  setLayoutRoot(root: Component | undefined): void {
    this.layoutRoot = root ?? null;
  }

  setFocus(component: Component | null): void {
    super.setFocus(component);
  }

  addChild(child: Component): void {
    // In fullscreen mode, children go to layoutRoot or overlay
    if (this.layoutRoot && "addChild" in this.layoutRoot) {
      (this.layoutRoot as any).addChild(child);
    } else {
      super.addChild(child);
    }
    this.invalidate();
  }

  hideOverlay(): void {
    if (this.overlayStack.length > 0) {
      const overlay = this.overlayStack.pop()!;
      overlay.destroy?.();
      this.invalidate();
    }
  }

  handleInput(data: string): void {
    // Overlay gets first dibs
    if (this.overlayStack.length > 0) {
      const topOverlay = this.overlayStack[this.overlayStack.length - 1];
      if (topOverlay.handleInput) {
        topOverlay.handleInput(data);
        return;
      }
    }

    // Then layout root
    if (this.layoutRoot?.handleInput) {
      this.layoutRoot.handleInput(data);
      return;
    }

    // Then fallback to base dispatch
    this.dispatchInput(data);
  }

  handleResize(): void {
    this.invalidate();
  }

  renderNow(): void {
    const width = this.terminal.columns;
    const height = this.terminal.rows;

    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.terminal.clearScreen();
      this.lastWidth = width;
      this.lastHeight = height;
    }

    let output = "";

    // Render layout root
    if (this.layoutRoot) {
      const lines = this.layoutRoot.render(width);
      let y = 0;
      for (const line of lines) {
        output += `\x1b[${y + 1};1H${line}`;
        y++;
      }
    }

    // Render overlays on top
    for (const overlay of this.overlayStack) {
      const lines = overlay.render(width);
      let y = 0;
      for (const line of lines) {
        output += `\x1b[${y + 1};1H${line}`;
        y++;
      }
    }

    // Position cursor
    if (this.focusedComponent && "getCursor" in this.focusedComponent) {
      const cursor = (this.focusedComponent as any).getCursor();
      if (cursor) {
        output += `\x1b[${cursor.y + 1};${cursor.x + 1}H`;
      }
    }

    this.terminal.write(output);
    this.lastRender = output;
  }

  stop(options?: { preserveScreen?: boolean }): void {
    // Exit alternate screen
    this.terminal.write("\x1b[?1049l");
    this.terminal.showCursor();
    super.stop(options);
  }
}

/**
 * Factory function for creating TUI instances.
 */
export function createTuiMainScreen(
  terminal: Terminal = new ProcessTerminal(),
  showHardwareCursor: boolean = false,
  logDirectory: string = ""
): TuiMainScreen {
  return new TuiMainScreen(terminal, showHardwareCursor, logDirectory);
}

export function createTuiAltScreen(
  terminal: Terminal,
  showHardwareCursor: boolean,
  logDirectory: string,
  options: {
    searchMatchStyle: (text: string) => string;
    searchCurrentMatchStyle: (text: string) => string;
    searchNavigationButtonStyle: (text: string, hovered: boolean) => string;
    scrollToEndIndicator: () => string;
    openUrl: (url: string) => void;
    onRightClickPaste?: () => void;
    copyOnSelect: boolean;
    wheelScrollLines: number | "auto";
    copySelection: (text: string) => Promise<string | true>;
  }
): TuiAltScreen {
  return new TuiAltScreen(terminal, showHardwareCursor, logDirectory, options);
}

/**
 * Proxy reference for stable TUI reference across renderer swaps.
 */
export function createTuiReference(getTui: () => TUIInterface): TUIInterface {
  return new Proxy({} as TUIInterface, {
    get(_target, property) {
      const tui = getTui();
      const value = Reflect.get(tui, property, tui);
      if (typeof value !== "function") return value;
      let methodTui = tui;
      let method = value;
      return (...args: unknown[]) => {
        const currentTui = getTui();
        if (currentTui !== methodTui) {
          const currentMethod = Reflect.get(currentTui, property, currentTui);
          if (typeof currentMethod !== "function") {
            throw new TypeError(`TUI property ${String(property)} is not callable`);
          }
          methodTui = currentTui;
          method = currentMethod;
        }
        return Reflect.apply(method, methodTui, args);
      };
    },
    set(_target, property, value) {
      const tui = getTui();
      return Reflect.set(tui, property, value, tui);
    },
    has(_target, property) {
      return Reflect.has(getTui(), property);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(getTui());
    },
  });
}