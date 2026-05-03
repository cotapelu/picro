/**
 * Terminal UI Library for Coding Agent
 * 
 * This module provides the TerminalUI class.
 * Base types should be imported from './components/base.js'.
 */

// Import base types for internal use only (no re-exports)
import type {
  UIElement,
  RenderContext,
  InteractiveElement,
  KeyEvent,
  KeyHandler,
  KeyHandlerResult,
  Dimension,
  PanelAnchor,
  PanelMargin,
  PanelOptions,
  PanelHandle,
  UITheme,
} from '../atoms/base.js';

import {
  isInteractive,
  CURSOR_MARKER,
  resolveDimension,
  ElementContainer,
} from '../atoms/base.js';
import { darkTheme } from '../atoms/themes.js';
import { DebugOverlay } from '../atoms/debug-overlay.js';
import { LayoutInspector } from '../atoms/layout-inspector.js';

import { visibleWidth, truncateText, wrapText, sliceByColumn, extractOverlaySegments, wrapTextWithAnsi } from '../atoms/internal-utils.js';
import { isImageLine, getCellDimensions, setCellDimensions } from '../atoms/terminal-image.js';
import type { Terminal } from '../atoms/terminal.js';
import { parseKey, isKeyRelease } from '../atoms/keys.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * TerminalUI - Main class for managing terminal UI with incremental rendering
 */
export class TerminalUI extends ElementContainer {
	public terminal: Terminal;
	private previousLines: string[] = [];
	private previousWidth = 0;
	private previousHeight = 0;
	private focusedElement: UIElement | null = null;
	private renderRequested = false;
	private renderTimer: NodeJS.Timeout | undefined;
	private lastRenderAt = 0;
	private static readonly MIN_RENDER_INTERVAL_MS = 16;
	private cursorRow = 0;
	private hardwareCursorRow = 0;
	private showHardwareCursor = false;
	private clearOnShrink = false;
	private maxLinesRendered = 0;
	private previousViewportTop = 0;
	private fullRedrawCount = 0;
	private _dirtyLineCount = 0;
	private scrollTop = 0;
	// Inertial scrolling
	private inertiaScrollVelocity = 0;
	private inertiaScrollLastEventTime = 0;
	private inertiaScrollTimer?: NodeJS.Timeout;
	private readonly INERTIA_DECELERATION = 0.92;
	private readonly INERTIA_TIMEOUT = 200; // ms without wheel events before stopping
	private readonly INERTIA_TICK_RATE = 16; // ms per update (~60fps)
	private totalBaseLines = 0;
	// Key repeat state
	private keyRepeatDelay = 500; // ms before first repeat
	private keyRepeatInterval = 50; // ms between repeats
	private keyRepeatEnabled = true;
	private keyRepeatTimers = new Map<string, NodeJS.Timeout>();
	private keyRepeatLastSent = new Map<string, number>();
	private stopped = false;
	private debugLogPath?: string;
	private inputLogging = false;
	private totalFrames = 0;
	private totalRenderTimeMs = 0;

	// Debug overlay
	private debugOverlayEnabled = false;
	private debugOverlayPanelHandle?: PanelHandle;
	private debugOverlayComponent?: DebugOverlay;

	// Layout inspector
	private layoutInspectorEnabled = false;
	private layoutInspectorPanelHandle?: PanelHandle;
	private layoutInspectorComponent?: LayoutInspector;

	// Extension points
	private componentRegistry = new Map<string, new (options: any) => UIElement>();
	private extensionHooks: { onMount?: (c: UIElement) => void; onUnmount?: (c: UIElement) => void } = {};
	private currentTheme: any = darkTheme;

	// Memory leak detection (debug mode)
	private memoryLeakDetection = false;
	private createdCount = 0;
	private destroyedCount = 0;
	private lastMemoryLogAt = 0;

	// Render throttling: configurable minimum interval between renders (ms)
	private renderIntervalMs = 16; // ~60fps default

	// Panel stack for modal elements rendered on top of base content
	private focusOrderCounter = 0;

	private keyHandlers = new Set<KeyHandler>();

	private panelStack: {
		element: UIElement;
		options?: PanelOptions;
		preFocus: UIElement | null;
		hidden: boolean;
		focusOrder: number;
		zIndex: number;
	}[] = [];

	// Track geometry of rendered panels for mouse hit testing
	private panelGeos = new Map<UIElement, {top: number; left: number; width: number; height: number}>();

	public onDebug?: () => void;

	/** Add a key handler */
	addKeyHandler(handler: KeyHandler): void {
		this.keyHandlers.add(handler);
	}

	/** Remove a key handler */
	removeKeyHandler(handler: KeyHandler): void {
		this.keyHandlers.delete(handler);
	}

	/** Append child element (overrides ElementContainer) */
	append(element: UIElement): void {
		if (this.memoryLeakDetection) this.createdCount++;
		super.append(element);
		if (typeof (element as any).onMount === 'function') {
			(element as any).onMount();
		}
		this.extensionHooks.onMount?.(element);
		this.requestRender();
	}

	/** Remove child element (overrides ElementContainer) */
	remove(element: UIElement): void {
		const index = this.children.indexOf(element);
		if (index !== -1) {
			if (typeof (element as any).onUnmount === 'function') {
				(element as any).onUnmount();
			}
			if (this.memoryLeakDetection) this.destroyedCount++;
			super.remove(element);
			this.extensionHooks.onUnmount?.(element);
			this.requestRender();
		}
	}

	constructor(terminal: Terminal, showHardwareCursor?: boolean) {
		super();
		this.terminal = terminal;
		this.showHardwareCursor = showHardwareCursor ?? (process.env.PI_HARDWARE_CURSOR === "1");
		this.clearOnShrink = process.env.PI_CLEAR_ON_SHRINK === "1";
	}

	/** Debug logging for redraw events */
	private logRender(msg: string): void {
		if (!this.debugLogPath) return;
		try {
			const line = `[${new Date().toISOString()}] ${msg}\n`;
			fs.appendFileSync(this.debugLogPath, line);
			 // eslint-disable-next-line no-empty
		} catch (e) {}
	}

	get fullRedraws(): number {
		return this.fullRedrawCount;
	}

	/**
	 * Get the number of lines changed in the last incremental render.
	 * Useful for performance monitoring.
	 */
	get dirtyLineCount(): number {
		return this._dirtyLineCount;
	}

	/** Enable/disable memory leak detection (debug mode) */
	enableMemoryLeakDetection(enabled: boolean): void {
		this.memoryLeakDetection = enabled;
	}

	/** Get memory allocation stats */
	getMemoryStats(): { created: number; destroyed: number; net: number } {
		return {
			created: this.createdCount,
			destroyed: this.destroyedCount,
			net: this.createdCount - this.destroyedCount,
		};
	}

	/** Set the minimum render interval (ms) to throttle rendering */
	setRenderInterval(ms: number): void {
		this.renderIntervalMs = Math.max(4, ms);
	}

	/** Get render performance metrics */
	getRenderMetrics(): { frames: number; totalMs: number; avgMs: number } {
		return {
			frames: this.totalFrames,
			totalMs: this.totalRenderTimeMs,
			avgMs: this.totalFrames > 0 ? this.totalRenderTimeMs / this.totalFrames : 0,
		};
	}

	/** Enable/disable debug overlay */
	setDebugOverlay(enabled: boolean): void {
		if (enabled === this.debugOverlayEnabled) return;
		this.debugOverlayEnabled = enabled;
		if (enabled) {
			if (!this.debugOverlayComponent) {
				this.debugOverlayComponent = new DebugOverlay();
			}
			if (!this.debugOverlayPanelHandle) {
				this.debugOverlayPanelHandle = this.showPanel(this.debugOverlayComponent, { anchor: 'top-right', panelHeight: 10 });
			}
		} else {
			if (this.debugOverlayPanelHandle) {
				this.removePanel(this.debugOverlayComponent!);
				this.debugOverlayPanelHandle = undefined;
			}
		}
	}

	/** Enable/disable layout inspector overlay */
	setLayoutInspector(enabled: boolean): void {
		if (enabled === this.layoutInspectorEnabled) return;
		this.layoutInspectorEnabled = enabled;
		if (enabled) {
			if (!this.layoutInspectorComponent) {
				this.layoutInspectorComponent = new LayoutInspector(() => this.getLayoutInfo());
			}
			if (!this.layoutInspectorPanelHandle) {
				this.layoutInspectorPanelHandle = this.showPanel(this.layoutInspectorComponent, { anchor: 'top-left' });
			}
		} else {
			if (this.layoutInspectorPanelHandle) {
				this.removePanel(this.layoutInspectorComponent!);
				this.layoutInspectorPanelHandle = undefined;
			}
		}
	}

	/** Enable/disable input event logging */
	setInputLogging(enabled: boolean): void {
		this.inputLogging = enabled;
	}

	/** Register a custom component constructor by name */
	registerComponent(name: string, ctor: new (options: any) => UIElement): void {
		this.componentRegistry.set(name, ctor);
	}

	/** Create a component instance from the registry */
	createComponent(name: string, options?: any): UIElement | undefined {
		const ctor = this.componentRegistry.get(name);
		if (!ctor) return undefined;
		return new ctor(options);
	}

	/** Get component counts */
	getComponentStats(): { children: number; panels: number } {
		return {
			children: this.children.length,
			panels: this.panelStack.length,
		};
	}

	/** Get layout information for debugging */
	getLayoutInfo(): {
		panels: Array<{ top: number; left: number; width: number; height: number }>;
		scrollTop: number;
		totalBaseLines: number;
		terminalWidth: number;
		terminalHeight: number;
	} {
		return {
			panels: Array.from(this.panelGeos.values()),
			scrollTop: this.scrollTop,
			totalBaseLines: this.totalBaseLines,
			terminalWidth: this.terminal.columns,
			terminalHeight: this.terminal.rows,
		};
	}

	/** Set extension lifecycle hooks */
	setExtensionHook(event: 'mount' | 'unmount', cb: (comp: UIElement) => void): void {
		if (event === 'mount') this.extensionHooks.onMount = cb;
		if (event === 'unmount') this.extensionHooks.onUnmount = cb;
	}

	getShowHardwareCursor(): boolean {
		return this.showHardwareCursor;
	}

	setShowHardwareCursor(enabled: boolean): void {
		if (this.showHardwareCursor === enabled) return;
		this.showHardwareCursor = enabled;
		if (!enabled) {
			this.terminal.hideCursor();
		}
		this.requestRender();
	}

	getClearOnShrink(): boolean {
		return this.clearOnShrink;
	}

	setClearOnShrink(enabled: boolean): void {
		this.clearOnShrink = enabled;
	}

	/** Query terminal for cell size (for image rendering) */
	private queryCellSize(): void {
		// Only query if terminal supports images
		const caps = { images: false } as any;
		if (!caps.images) return;
		// Query terminal for cell size: CSI 16 t
		// Response format: CSI 6 ; height ; width t
		this.terminal.write('\x1b[16t');
	}

	// Handle cell size response (CSI 6 ; height ; width t)
	private consumeCellSizeResponse(data: string): boolean {
		const match = data.match(/^\x1b\[6;(\d+);(\d+)t$/);
		if (!match) return false;
		const heightPx = parseInt(match[1], 10);
		const widthPx = parseInt(match[2], 10);
		if (heightPx <= 0 || widthPx <= 0) return true;
		setCellDimensions({ widthPx, heightPx });
		// Invalidate to re-render images with correct dimensions
		this.invalidate();
		this.requestRender();
		return true;
	}

	/** Invalidate cached state for all children */
	public invalidate(): void {
		for (const child of this.children) {
			child.clearCache?.();
		}
		for (const panel of this.panelStack) {
			panel.element.clearCache?.();
		}
	}

	/**
	 * Get render context for a child, applying theme inheritance.
	 */
	private getRenderContextForChild(parentContext: RenderContext, child: UIElement): RenderContext {
		const childTheme = (child as any).theme as UITheme | undefined;
		if (childTheme) {
			return { ...parentContext, theme: { ...parentContext.theme, ...childTheme } };
		}
		return parentContext;
	}

	setFocus(element: UIElement | null): void {
		// Clear focused flag on old element
		if (isInteractive(this.focusedElement)) {
			this.focusedElement.isFocused = false;
		}

		this.focusedElement = element;

		// Set focused flag on new element
		if (isInteractive(element)) {
			element.isFocused = true;
		}

		this.requestRender();
	}

	getFocusedElement(): UIElement | null {
		return this.focusedElement;
	}

	/**
	 * Show a panel element with configurable positioning and sizing.
	 * Returns a handle to control the panel's visibility.
	 */
	showPanel(element: UIElement, options?: PanelOptions): PanelHandle {
		const entry = {
			element,
			options,
			preFocus: this.focusedElement,
			hidden: false,
			focusOrder: ++this.focusOrderCounter,
			zIndex: options?.zIndex ?? 0,
		};

		if (this.memoryLeakDetection) this.createdCount++;
		this.panelStack.push(entry);

		// Call onMount lifecycle hook if present
		if (typeof (entry.element as any).onMount === 'function') {
			(entry.element as any).onMount();
		}
		this.extensionHooks.onMount?.(entry.element);

		// Focus the panel if it's not non-capturing
		if (!options?.nonCapturing) {
			this.setFocus(element);
		}

		this.requestRender();

		return {
			close: () => this.removePanel(element),
			setHidden: (hidden: boolean) => this.setPanelHidden(element, hidden),
			isHidden: () => this.isPanelHidden(element),
			focus: () => this.setFocus(element),
			unfocus: () => this.setFocus(entry.preFocus),
			isFocused: () => this.focusedElement === element,
			setZIndex: (zIndex: number) => this.setPanelZIndex(element, zIndex),
			getZIndex: () => this.getPanelZIndex(element),
			bringToFront: () => this.bringPanelToFront(element),
			sendToBack: () => this.sendPanelToBack(element),
		};
	}

	/**
	 * Remove a panel element from the stack
	 */
	removePanel(element: UIElement): void {
		const index = this.panelStack.findIndex(p => p.element === element);
		if (index === -1) return;

		const panel = this.panelStack[index];
		// Call onUnmount lifecycle hook if present
		if (typeof (panel.element as any).onUnmount === 'function') {
			(panel.element as any).onUnmount();
		}
		this.extensionHooks.onUnmount?.(panel.element);
		if (this.memoryLeakDetection) this.destroyedCount++;
		this.panelStack.splice(index, 1);

		// Restore focus to previous element
		if (panel.preFocus) {
			this.setFocus(panel.preFocus);
		}

		this.requestRender();
	}

	/**
	 * Set panel hidden state
	 */
	setPanelHidden(element: UIElement, hidden: boolean): void {
		const panel = this.panelStack.find(p => p.element === element);
		if (panel) {
			panel.hidden = hidden;
			this.requestRender();
		}
	}

	/**
	 * Check if panel is hidden
	 */
	isPanelHidden(element: UIElement): boolean {
		const panel = this.panelStack.find(p => p.element === element);
		return panel?.hidden ?? false;
	}

	/**
	 * Get panel z-index
	 */
	getPanelZIndex(element: UIElement): number {
		const panel = this.panelStack.find(p => p.element === element);
		return panel?.zIndex ?? 0;
	}

	/**
	 * Set panel z-index
	 */
	setPanelZIndex(element: UIElement, zIndex: number): void {
		const panel = this.panelStack.find(p => p.element === element);
		if (panel) {
			panel.zIndex = zIndex;
			this.requestRender();
		}
	}

	/**
	 * Bring panel to front (increase z-index relative to others)
	 */
	bringPanelToFront(element: UIElement): void {
		const panel = this.panelStack.find(p => p.element === element);
		if (panel) {
			// Find max zIndex among other panels
			let maxZ = 0;
			for (const p of this.panelStack) {
				if (p !== panel) maxZ = Math.max(maxZ, p.zIndex);
			}
			panel.zIndex = maxZ + 1;
			this.requestRender();
		}
	}

	/**
	 * Send panel to back (decrease z-index below all others)
	 */
	sendPanelToBack(element: UIElement): void {
		const panel = this.panelStack.find(p => p.element === element);
		if (panel) {
			let minZ = 0;
			for (const p of this.panelStack) {
				if (p !== panel) minZ = Math.min(minZ, p.zIndex);
			}
			panel.zIndex = minZ - 1;
			this.requestRender();
		}
	}

	/**
	 * Start the TerminalUI
	 */
	start(): void {
		if (this.stopped) return;

		this.terminal.start(
			(data) => this.handleKey(data),
			() => this.requestRender()
		);

		this.terminal.hideCursor();

		// Query cell size for image rendering
		this.queryCellSize();

		// Initial render
		this.requestRender();
	}

	/**
	 * Stop the TerminalUI
	 */
	stop(): void {
		this.stopped = true;
		if (this.renderTimer) {
			clearTimeout(this.renderTimer);
			this.renderTimer = undefined;
		}
		// Stop inertial scrolling
		this.stopInertiaScroll();

		// Ensure synchronized output mode is disabled (in case stop() called mid-render)
		try {
			this.terminal.write('\x1b[?2026l');
		} catch {
			// ignore errors
		}

		// Clear key handlers to prevent any further handling
		this.keyHandlers.clear();

		// Move cursor to the end of the content
		if (this.previousLines.length > 0) {
			const targetRow = this.previousLines.length;
			const lineDiff = targetRow - this.hardwareCursorRow;
			if (lineDiff > 0) {
				this.terminal.write(`\x1b[${lineDiff}B`);
			} else if (lineDiff < 0) {
				this.terminal.write(`\x1b[${-lineDiff}A`);
			}
			this.terminal.write("\r\n");
		}

		this.terminal.showCursor();
		this.terminal.stop();

		// Reset internal state
		this.previousLines = [];
		this.panelStack.length = 0;
		this.panelGeos.clear();
		this.focusedElement = null;
		// Clear any key repeat timers
		for (const timer of this.keyRepeatTimers.values()) {
			(clearTimeout as any)(timer);
		}
		this.keyRepeatTimers.clear();
		this.keyRepeatLastSent.clear();
	}

	/**
	 * Request a render
	 */
	requestRender(force = false): void {
		if (force) {
			this.previousLines = [];
			this.previousWidth = -1;
			this.previousHeight = -1;
			this.cursorRow = 0;
			this.hardwareCursorRow = 0;
			this.maxLinesRendered = 0;
			this.previousViewportTop = 0;
			if (this.renderTimer) {
				clearTimeout(this.renderTimer);
				this.renderTimer = undefined;
			}
			this.renderRequested = true;
			process.nextTick(() => {
				if (this.stopped || !this.renderRequested) {
					return;
				}
				this.renderRequested = false;
				this.lastRenderAt = Date.now();
				this.renderInternal();
			});
			return;
		}
		if (this.renderRequested) return;
		this.renderRequested = true;
		process.nextTick(() => this.scheduleRender());
	}

	/**
	 * Schedule a render with throttling
	 */
	private scheduleRender(): void {
		if (this.stopped || this.renderTimer || !this.renderRequested) {
			return;
		}
		const elapsed = Date.now() - this.lastRenderAt;
		const delay = Math.max(0, this.renderIntervalMs - elapsed);
		this.renderTimer = setTimeout(() => {
			this.renderTimer = undefined as NodeJS.Timeout | undefined;
			if (this.stopped || !this.renderRequested) {
				return;
			}
			this.renderRequested = false;
			this.lastRenderAt = Date.now();
			this.renderInternal();
			if (this.renderRequested) {
				this.scheduleRender();
			}
		}, delay) as unknown as NodeJS.Timeout;
	}

	/**
	 * Handle keyboard input
	 */
	private handleKey(data: string): void {
		if (this.inputLogging) this.logRender(`key: ${data}`);
		// Mouse event detection (X10 protocol)
		if (data.length >= 6 && data.charCodeAt(0) === 27 && data.charCodeAt(1) === 91 && data[2] === 'M') {
			const b = data.charCodeAt(3) - 32;
			const cx = data.charCodeAt(4) - 32;
			const cy = data.charCodeAt(5) - 32;
			const btnCode = b & 0x03; // 0=left,1=middle,2=right,3=release
			const shift = (b & 0x04) !== 0;
			const ctrl = (b & 0x10) !== 0;
			const alt = (b & 0x08) !== 0;
			const button = btnCode === 0 ? 'left' : btnCode === 1 ? 'middle' : btnCode === 2 ? 'right' : 'release';
			this.handleMouse({ row: cy - 1, col: cx - 1, button, modifiers: { shift, ctrl, alt, meta: alt } });
			return;
		}

		// SGR mouse protocol (xterm): ESC [ < b ; x ; y M (press) or m (release)
		const sgrMatch = data.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/);
		if (sgrMatch) {
			const b = parseInt(sgrMatch[1], 10);
			const cx = parseInt(sgrMatch[2], 10);
			const cy = parseInt(sgrMatch[3], 10);
			const isRelease = sgrMatch[4] === 'm';
			let button: 'left' | 'right' | 'middle' | 'release' | 'wheelup' | 'wheeldown';
			if (isRelease) {
				button = 'release';
			} else if (b <= 2) {
				button = ['left', 'middle', 'right'][b] as 'left' | 'middle' | 'right';
			} else if (b === 64) {
				button = 'wheelup';
			} else if (b === 65) {
				button = 'wheeldown';
			} else {
				// Unrecognized button, ignore
				return;
			}
			this.handleMouse({ row: cy - 1, col: cx - 1, button, modifiers: {} });
			return;
		}

		// Consume terminal cell size responses without blocking unrelated input.
		if (this.consumeCellSizeResponse(data)) {
			return;
		}

		if (this.keyHandlers.size > 0) {
			let current = data;
			for (const handler of this.keyHandlers) {
				const result = handler({ raw: current });
				if (result?.consume) {
					return;
				}
				if (result?.data !== undefined) {
					current = result.data;
				}
			}
			if (current.length === 0) {
				return;
			}
			data = current;
		}

		// Parse the key event using keys.ts
		const parsed = parseKey(data);
		if (!parsed) return;

		// Filter out key release events unless element opts in
		if (isKeyRelease(parsed)) {
			const focused = this.getFocusedElement();
			if (focused && !focused.wantsKeyRelease) {
				return;
			}
		}

		// If focused element is a panel, verify it's still visible
		const focusedPanel = this.panelStack.find(p => p.element === this.focusedElement);
		if (focusedPanel && !this.isPanelVisible(focusedPanel)) {
			const topVisible = this.getTopmostVisiblePanel();
			if (topVisible) {
				this.setFocus(topVisible.element);
			} else {
				this.setFocus(focusedPanel.preFocus);
			}
		}

		// Handle Tab for focus traversal
		if (parsed.name === 'Tab') {
			const direction = parsed.shift ? 'prev' : 'next';
			this.traverseFocus(direction);
			return;
		}

		// Handle chord sequences
		if (this.processChords(parsed)) {
			return;
		}

		// Pass to focused element with parsed key info
		const focused = this.getFocusedElement();
		if (focused && focused.handleKey) {
			const keyEvent: KeyEvent = {
				raw: data,
				name: parsed.name,
				modifiers: {
					ctrl: parsed.ctrl,
					alt: parsed.alt,
					shift: parsed.shift,
					meta: parsed.meta,
				},
			};
			focused.handleKey(keyEvent);
			this.requestRender();
		}

		// After key processing, manage key repeat timers
		this.afterKeyProcessed(parsed, data);
	}

	/** Handle mouse events (row/col are 0-indexed) */
	private handleMouse(event: import('../atoms/base.js').MouseEvent): void {
		if (this.inputLogging) this.logRender(`mouse: ${event.row},${event.col} btn=${event.button} modifiers=${event.modifiers ?? ''}`);
		// Handle wheel events with inertial scrolling
		if (event.button === 'wheelup' || event.button === 'wheeldown') {
			const delta = event.button === 'wheelup' ? -1 : 1;
			this.handleWheelScroll(delta);
		}
		// Traverse panel stack from topmost to bottom
		for (let i = this.panelStack.length - 1; i >= 0; i--) {
			const panel = this.panelStack[i];
			if (panel.hidden) continue;
			const geo = this.panelGeos.get(panel.element);
			if (!geo) continue;
			if (event.row >= geo.top && event.row < geo.top + geo.height &&
			    event.col >= geo.left && event.col < geo.left + geo.width) {
				// Focus the panel and forward mouse to element if it implements handleMouse
				this.setFocus(panel.element);
				if ('handleMouse' in panel.element && typeof (panel.element as any).handleMouse === 'function') {
					const localEvent = {
						row: event.row - geo.top,
						col: event.col - geo.left,
						button: event.button,
					};
					(panel.element as any).handleMouse(localEvent);
				}
				break;
			}
		}
	}

	/**
	 * Check if a panel is visible
	 */
	private isPanelVisible(panel: { element: UIElement; options?: PanelOptions; preFocus: UIElement | null; hidden: boolean; focusOrder: number }): boolean {
		if (panel.hidden) return false;
		if (panel.options?.visible && !panel.options.visible(this.terminal.columns, this.terminal.rows)) {
			return false;
		}
		return true;
	}

	/**
	 * Get the topmost visible panel
	 */
	private getTopmostVisiblePanel(): { element: UIElement; options?: PanelOptions; preFocus: UIElement | null; hidden: boolean; focusOrder: number } | undefined {
		for (let i = this.panelStack.length - 1; i >= 0; i--) {
			const panel = this.panelStack[i];
			if (this.isPanelVisible(panel)) {
				return panel;
			}
		}
		return undefined;
	}

	/**
	 * Internal render method
	 */
	private renderInternal(): void {
		if (this.stopped) return;

		const now = Date.now();
		this.lastRenderAt = now;

		const size = { cols: this.terminal.columns, rows: this.terminal.rows };
		const width = size.cols;
		const height = size.rows;

		// Check if viewport size changed
		const sizeChanged = width !== this.previousWidth || height !== this.previousHeight;

		if (sizeChanged) {
			this.previousWidth = width;
			this.previousHeight = height;
			this.fullRedrawCount++;
		}

		// Memory leak detection: log if net growth is suspicious
		if (this.memoryLeakDetection) {
			const net = this.createdCount - this.destroyedCount;
			const now = Date.now();
			if (now - this.lastMemoryLogAt > 30000) { // every 30s
				this.lastMemoryLogAt = now;
				if (net > 1000) {
					this.logRender(`Memory leak suspicion: ${this.createdCount} created, ${this.destroyedCount} destroyed, net ${net}`);
				}
			}
		}

		// Render base content (full)
		const context: RenderContext = { width, height };
		const fullBase = this.renderBaseContent(context);
		this.totalBaseLines = fullBase.length;

		// Determine viewport slice
		const viewportStart = this.scrollTop;
		const viewportEnd = Math.min(fullBase.length, viewportStart + height);
		const baseLines = fullBase.slice(viewportStart, viewportEnd);

		// Render panels (full)
		const panelLines = this.renderPanels(context);

		// Clear previous panel geometries; will be repopulated during merge
		this.panelGeos.clear();

		// Merge panels into base content, respecting viewport offset
		const finalLines = this.mergePanels(baseLines, panelLines, width, height, viewportStart);

		// Choose rendering strategy: full redraw on size change, else incremental
		if (sizeChanged) {
			this.fullRedraw(finalLines, width, height);
		} else {
			this.incrementalRender(finalLines, sizeChanged);
		}

		// Performance metrics
		const duration = Date.now() - now;
		this.totalFrames++;
		this.totalRenderTimeMs += duration;

		// Update debug overlay if enabled
		if (this.debugOverlayEnabled && this.debugOverlayComponent) {
			const metrics = this.getRenderMetrics();
			const info: Record<string, string> = {
				'Frames': String(metrics.frames),
				'Avg Frame (ms)': metrics.avgMs.toFixed(2),
				'Dirty Lines': String(this._dirtyLineCount),
				'Scroll Top': String(this.scrollTop),
				'Base Lines': String(this.totalBaseLines),
				'Panels': String(this.panelStack.length),
			};
			this.debugOverlayComponent.setData(info);
		}

		// Update tracking
		this.previousLines = finalLines;
		this.maxLinesRendered = Math.max(this.maxLinesRendered, finalLines.length);
		this.renderRequested = false;
	}

	/**
	 * Render base content (root element)
	 */
	private renderBaseContent(parentContext: RenderContext): string[] {
		if (this.children.length === 0) return [];
		const childContext = this.getRenderContextForChild(parentContext, this.children[0]);
		return this.children[0].draw(childContext);
	}

	/**
	 * Render all panels
	 */
	private renderPanels(parentContext: RenderContext): Map<UIElement, string[]> {
		const panelMap = new Map<UIElement, string[]>();

		for (const panel of this.panelStack) {
			// Skip if panel is hidden
			if (panel.hidden) continue;

			// Check visibility condition if provided
			if (panel.options?.visible && !panel.options.visible(this.terminal.columns, this.terminal.rows)) {
				continue;
			}

			// Calculate panel dimensions
			const panelWidth = this.calculatePanelWidth(panel.options, parentContext.width);
			const panelHeight = this.calculatePanelHeight(panel.options, parentContext.height);

			if (panelWidth === undefined || panelHeight === undefined) {
				continue;
			}

			// Render panel with theme inheritance
			const panelBaseContext: RenderContext = { width: panelWidth, height: panelHeight, theme: parentContext.theme };
			const childContext = this.getRenderContextForChild(panelBaseContext, panel.element);
			const lines = panel.element.draw(childContext);
			panelMap.set(panel.element, lines);
		}

		return panelMap;
	}

	/**
	 * Calculate panel width
	 */
	private calculatePanelWidth(options: PanelOptions | undefined, termWidth: number): number | undefined {
		if (!options) return undefined;

		let width: number | undefined;

		if (options.width !== undefined) {
			width = resolveDimension(options.width, termWidth);
		} else if (options.minWidth !== undefined) {
			width = options.minWidth;
		}

		return width;
	}

	/**
	 * Calculate panel height
	 */
	private calculatePanelHeight(options: PanelOptions | undefined, termHeight: number): number | undefined {
		if (!options) return undefined;

		let height: number | undefined;

		if (options.height !== undefined) {
			height = resolveDimension(options.height, termHeight);
		} else if (options.maxHeight !== undefined) {
			height = resolveDimension(options.maxHeight, termHeight);
		}

		return height;
	}

	/**
	 * Merge panels into base content, with viewport offset for scrolling
	 */
	private mergePanels(baseLines: string[], panelMap: Map<UIElement, string[]>, width: number, height: number, viewportStart: number): string[] {
		// Initialize result with empty lines up to viewport height
		const result: string[] = new Array(height).fill('');
		// Copy visible base lines into result starting at row 0
		for (let i = 0; i < baseLines.length; i++) {
			result[i] = baseLines[i];
		}

		// Sort panels by zIndex (higher on top), then focusOrder (newer on top)
		const sortedPanels = Array.from(panelMap.entries()).sort((a, b) => {
			const aPanel = this.panelStack.find(p => p.element === a[0]);
			const bPanel = this.panelStack.find(p => p.element === b[0]);
			const zDiff = (bPanel?.zIndex ?? 0) - (aPanel?.zIndex ?? 0);
			if (zDiff !== 0) return zDiff;
			return (bPanel?.focusOrder ?? 0) - (aPanel?.focusOrder ?? 0);
		});

		for (const [element, panelLines] of sortedPanels) {
			const panel = this.panelStack.find(p => p.element === element);
			if (!panel) continue;

			const panelWidth = this.calculatePanelWidth(panel.options, width);
			const panelHeight = this.calculatePanelHeight(panel.options, height);

			if (panelWidth === undefined || panelHeight === undefined) {
				continue;
			}

			// Calculate panel position
			const { startRow, startCol } = this.calculatePanelPosition(panel.options, panelWidth, panelHeight, width, height);

			// Store geometry for mouse hit testing
			this.panelGeos.set(element, { top: startRow, left: startCol, width: panelWidth, height: panelHeight });

			// Merge panel lines
			for (let i = 0; i < panelHeight; i++) {
				const outputRow = (startRow - viewportStart) + i;
				if (outputRow >= 0 && outputRow < result.length) {
					const outputLine = result[outputRow];
					const panelLine = panelLines[i] || '';

					// Pad panel line to full width
					const paddedPanel = panelLine.padEnd(panelWidth);

					// Merge into output line
					const before = outputLine.substring(0, startCol);
					const after = outputLine.substring(startCol + panelWidth);
					result[outputRow] = before + paddedPanel + after;
				}
			}
		}

		return result;
	}

	/**
	 * Calculate panel position
	 */
	private calculatePanelPosition(options: PanelOptions | undefined, panelWidth: number, panelHeight: number, termWidth: number, termHeight: number): { startRow: number; startCol: number } {
		let startRow = 0;
		let startCol = 0;

		if (!options) {
			return { startRow, startCol };
		}

		// Calculate row position
		if (options.row !== undefined) {
			startRow = resolveDimension(options.row, termHeight) ?? 0;
		} else {
			switch (options.anchor) {
				case 'top-left':
				case 'top-center':
				case 'top-right':
					startRow = (typeof options.padding === 'object' ? options.padding.top : options.padding) ?? 0;
					break;
				case 'bottom-left':
				case 'bottom-center':
				case 'bottom-right':
					startRow = termHeight - panelHeight - ((typeof options.padding === 'object' ? options.padding.bottom : options.padding) ?? 0);
					break;
				case 'center':
				case 'left-center':
				case 'right-center':
					startRow = Math.floor((termHeight - panelHeight) / 2);
					break;
				default:
					startRow = 0;
			}
		}

		// Calculate column position
		if (options.col !== undefined) {
			startCol = resolveDimension(options.col, termWidth) ?? 0;
		} else {
			switch (options.anchor) {
				case 'top-left':
				case 'bottom-left':
				case 'left-center':
					startCol = (typeof options.padding === 'object' ? options.padding.left : options.padding) ?? 0;
					break;
				case 'top-right':
				case 'bottom-right':
				case 'right-center':
					startCol = termWidth - panelWidth - ((typeof options.padding === 'object' ? options.padding.right : options.padding) ?? 0);
					break;
				case 'center':
				case 'top-center':
				case 'bottom-center':
					startCol = Math.floor((termWidth - panelWidth) / 2);
					break;
				default:
					startCol = 0;
			}
		}

		// Apply offsets
		startRow += options.offsetY ?? 0;
		startCol += options.offsetX ?? 0;

		return { startRow, startCol };
	}

	/**
	 * Incremental rendering - only update changed lines
	 */
	private incrementalRender(newLines: string[], sizeChanged: boolean): void {
		// Start synchronized output
		this.terminal.write('\x1b[?2026h');

		// Move cursor to top-left initially
		this.terminal.moveBy(-this.cursorRow);

		// Find cursor marker position and remove markers
		let cursorRow = 0;
		let cursorCol = 0;

		for (let i = 0; i < newLines.length; i++) {
			const line = newLines[i];
			const markerIndex = line.indexOf(CURSOR_MARKER);
			if (markerIndex !== -1) {
				cursorRow = i;
				cursorCol = markerIndex;
				newLines[i] = line.replace(CURSOR_MARKER, '');
				break;
			}
		}

		// Get previous lines (empty if first render)
		const oldLines = this.previousLines;

		// Compute diff: find first and last changed indices
		let firstDiff = -1;
		let lastDiff = -1;
		const commonLength = Math.min(newLines.length, oldLines.length);

		for (let i = 0; i < commonLength; i++) {
			if (newLines[i] !== oldLines[i]) {
				if (firstDiff === -1) firstDiff = i;
				lastDiff = i;
			}
		}

		// Check for append-only (prefix unchanged, new longer)
		const appendOnly = firstDiff === -1 && newLines.length > oldLines.length;
		// Check for delete-only (prefix unchanged, new shorter)
		const deleteOnly = firstDiff === -1 && newLines.length < oldLines.length;

		// If no changes and not appending/deleting, done
		if (firstDiff === -1 && !appendOnly && !deleteOnly && !sizeChanged) {
			// End synchronized output
			this.terminal.write('\x1b[?2026l');
			// Still need to position hardware cursor
			if (this.showHardwareCursor) {
				this.terminal.moveBy(cursorRow - this.cursorRow);
				this.terminal.showCursor();
			} else {
				this.terminal.hideCursor();
			}
			return;
		}

		// Determine rendering range
		let renderStart: number;
		let renderEnd: number;

		if (appendOnly) {
			renderStart = oldLines.length;
			renderEnd = newLines.length - 1;
		} else if (deleteOnly) {
			renderStart = newLines.length;
			renderEnd = oldLines.length - 1;
		} else {
			renderStart = firstDiff === -1 ? 0 : firstDiff;
			if (newLines.length < oldLines.length) {
				lastDiff = Math.max(lastDiff, oldLines.length - 1);
			} else {
				lastDiff = Math.max(lastDiff, newLines.length - 1);
			}
			renderEnd = lastDiff;
		}

		// Track dirty line count for metrics
		this._dirtyLineCount = renderEnd - renderStart + 1;

		// Debug logging for incremental mode
		const mode = appendOnly ? 'append-only' : deleteOnly ? 'delete-only' : 'diff';
		this.logRender(`incremental: ${mode}, range=[${renderStart}-${renderEnd}], oldLen=${oldLines.length}, newLen=${newLines.length}`);

		// Perform rendering
		if (appendOnly) {
			// Move to end of old content
			this.terminal.moveBy(oldLines.length - this.cursorRow);
			for (let i = renderStart; i <= renderEnd; i++) {
				this.terminal.write(newLines[i] + '\x1b[0m\x1b]8;;\x07');
				if (i < renderEnd) this.terminal.moveBy(1);
			}
			this.cursorRow = renderEnd;
		} else if (deleteOnly) {
			// Move to start of deletion region
			this.terminal.moveBy(renderStart - this.cursorRow);
			for (let i = renderStart; i <= renderEnd; i++) {
				this.terminal.clearLine();
				if (i < renderEnd) this.terminal.moveBy(1);
			}
			this.cursorRow = renderEnd;
		} else {
			// Diff range: move to firstDiff
			this.terminal.moveBy(renderStart - this.cursorRow);
			for (let i = renderStart; i <= renderEnd; i++) {
				const line = i < newLines.length ? newLines[i] : '';
				this.terminal.clearLine();
				this.terminal.write(line + '\x1b[0m\x1b]8;;\x07');
				if (i < renderEnd) this.terminal.moveBy(1);
			}
			this.cursorRow = renderEnd;
		}

		// Clear remaining lines if content shrank (handle trailing clearance)
		if (this.clearOnShrink && newLines.length < oldLines.length) {
			for (let i = newLines.length; i < oldLines.length; i++) {
				this.terminal.moveBy(1);
				this.terminal.clearLine();
				this.cursorRow = i;
			}
		}

		// End synchronized output
		this.terminal.write('\x1b[?2026l');

		// Position hardware cursor
		if (this.showHardwareCursor) {
			this.terminal.moveBy(cursorRow - this.cursorRow);
			this.terminal.showCursor();
		} else {
			this.terminal.hideCursor();
		}

		this.cursorRow = cursorRow;
		this.hardwareCursorRow = cursorRow;
	}

	/**
	 * Full redraw - simpler and more reliable than incremental
	 */
	private fullRedraw(newLines: string[], width: number, height: number): void {
		// All lines are dirty in full redraw
		this._dirtyLineCount = newLines.length;

		// Clear screen and move to home
		try { this.terminal.clearScreen(); } catch {}
		this.terminal.moveBy(-this.cursorRow);

		// Find cursor marker
		let cursorRow = 0;
		for (let i = 0; i < newLines.length; i++) {
			const idx = newLines[i].indexOf(CURSOR_MARKER);
			if (idx !== -1) {
				cursorRow = i;
				newLines[i] = newLines[i].replace(CURSOR_MARKER, '');
				break;
			}
		}

		// Write all lines with overflow protection
		for (let i = 0; i < newLines.length; i++) {
			this.terminal.clearLine();
			const line = newLines[i];
			// Skip image lines in width check
			if (!isImageLine(line)) {
				const lineWidth = visibleWidth(line);
				if (lineWidth > width) {
					// Log crash info
					const crashLogPath = path.join(os.homedir(), '.pi', 'agent', 'pi-crash.log');
					const crashData = [
						`Crash at ${new Date().toISOString()}`,
						`Terminal width: ${width}`,
						`Line ${i} visible width: ${lineWidth}`,
						"",
						"=== All rendered lines ===",
						...newLines.map((l, idx) => `[${idx}] (w=${visibleWidth(l)}) ${l}`),
					].join('\n');
					try {
						fs.mkdirSync(path.dirname(crashLogPath), { recursive: true });
						fs.writeFileSync(crashLogPath, crashData);
					} catch {}
					this.stop();
					throw new Error(
						`Rendered line ${i} exceeds terminal width (${lineWidth} > ${width}). ` +
						`This is likely caused by a custom component not truncating output. ` +
						`Debug log written to: ${crashLogPath}`
					);
				}
			}
			this.terminal.write(line);
			if (i < newLines.length - 1) {
				this.terminal.moveBy(1);
			}
		}

		// Move cursor to marker line (current cursor is at last line: newLines.length-1)
		const currentLine = newLines.length - 1;
		const diff = cursorRow - currentLine;
		if (diff !== 0) {
			this.terminal.moveBy(diff);
		}

		if (this.showHardwareCursor) {
			this.terminal.showCursor();
		} else {
			this.terminal.hideCursor();
		}

		// Update tracking
		this.cursorRow = cursorRow;
		this.hardwareCursorRow = cursorRow;
	}


	/**
	 * Configure key repeat behavior (delay in ms, interval in ms)
	 */
	setKeyRepeatConfig(delay: number, interval: number): void {
		this.keyRepeatDelay = delay;
		this.keyRepeatInterval = interval;
	}

	/**
	 * Enable or disable key repeat globally
	 */
	setKeyRepeatEnabled(enabled: boolean): void {
		this.keyRepeatEnabled = enabled;
	}

	/**
	 * Called after a key is processed to manage key repeat timers.
	 */
	private afterKeyProcessed(parsed: any, rawData: string): void {
		if (!this.keyRepeatEnabled) return;
		const isRelease = isKeyRelease(parsed);
		const keyId = this.makeKeyId(parsed);

		if (isRelease) {
			// Stop repeating this key
			this.stopKeyRepeat(keyId);
		} else {
			// Only start repeat for non-release keys that are actual keys (not mouse, resize etc.)
			if (parsed.name && !this.keyRepeatTimers.has(keyId)) {
				this.startKeyRepeatTimer(keyId, parsed, rawData);
			}
		}
	}

	private makeKeyId(parsed: any): string {
		return `${parsed.name}|${parsed.ctrl}|${parsed.alt}|${parsed.shift}|${parsed.meta}`;
	}

	private startKeyRepeatTimer(keyId: string, parsed: any, rawData: string): void {
		const timer = setTimeout(() => {
			// First repeat: reschedule with interval
			this.keyRepeatTimers.delete(keyId);
			const intervalTimer = setInterval(() => {
				this.fireKeyRepeat(parsed, rawData);
			}, this.keyRepeatInterval);
			this.keyRepeatTimers.set(keyId, intervalTimer as any);
			// Immediately fire first repeat
			this.fireKeyRepeat(parsed, rawData);
		}, this.keyRepeatDelay);
		this.keyRepeatTimers.set(keyId, timer as any);
	}

	private fireKeyRepeat(parsed: any, rawData: string): void {
		const focused = this.getFocusedElement();
		if (focused && focused.handleKey) {
			const keyEvent: KeyEvent = {
				raw: rawData,
				name: parsed.name,
				modifiers: {
					ctrl: parsed.ctrl,
					alt: parsed.alt,
					shift: parsed.shift,
					meta: parsed.meta,
				},
			};
			focused.handleKey(keyEvent);
			this.requestRender();
		}
	}

	private stopKeyRepeat(keyId: string): void {
		const timer = this.keyRepeatTimers.get(keyId);
		if (timer) {
			// Use global clearTimeout/clearInterval to accept both types
			(clearTimeout as any)(timer);
			this.keyRepeatTimers.delete(keyId);
		}
	}

	/**
	 * Collect all focusable elements from a list (supports nested containers)
	 */
	private collectFocusables(elements: UIElement[]): UIElement[] {
		const focusables: UIElement[] = [];
		for (const el of elements) {
			if (isInteractive(el)) {
				focusables.push(el);
			}
			// Recurse into ElementContainer children
			if ('children' in el && Array.isArray((el as any).children)) {
				focusables.push(...this.collectFocusables((el as any).children));
			}
		}
		return focusables;
	}

	/**
	 * Move focus to next or previous focusable element (Tab/Shift+Tab)
	 */
	private traverseFocus(direction: 'next' | 'prev'): void {
		// Get focusable elements from root children only (not panels)
		const focusables = this.collectFocusables(this.children);
		if (focusables.length <= 1) return;

		// Find currently focused element among focusables
		const currentIndex = focusables.findIndex(el => el === this.focusedElement);

		// Compute next index
		let nextIndex: number;
		if (direction === 'next') {
			nextIndex = currentIndex + 1;
			if (nextIndex >= focusables.length) nextIndex = 0;
		} else {
			nextIndex = currentIndex - 1;
			if (nextIndex < 0) nextIndex = focusables.length - 1;
		}

		this.setFocus(focusables[nextIndex]);
		this.requestRender();
	}

	// Chord registry and state
	private chordRegistry: Array<{
		seq: { name: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }[];
		handler: () => void;
	}> = [];
	private chordBuffer: { name: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }[] = [];
	private chordTimeoutMs = 1000; // ms to wait for chord completion
	private chordTimer: NodeJS.Timeout | null = null;

	/**
	 * Register a chord sequence (e.g., ['ctrl+x', 'ctrl+s'])
	 */
	public registerChord(sequence: string[], handler: () => void): void {
		const parsed = sequence.map(s => this.parseChordStep(s));
		this.chordRegistry.push({ seq: parsed, handler });
	}

	/**
	 * Unregister a chord sequence (exact match)
	 */
	public unregisterChord(sequence: string[]): void {
		const parsed = sequence.map(s => this.parseChordStep(s));
		const idx = this.chordRegistry.findIndex(c => this.seqEqual(c.seq, parsed));
		if (idx !== -1) this.chordRegistry.splice(idx, 1);
	}

	private parseChordStep(step: string): { name: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } {
		const parts = step.toLowerCase().split('+');
		const mods = { ctrl: false, alt: false, shift: false, meta: false };
		let name = '';
		for (const p of parts) {
			if (p === 'ctrl') mods.ctrl = true;
			else if (p === 'alt') mods.alt = true;
			else if (p === 'shift') mods.shift = true;
			else if (p === 'meta') mods.meta = true;
			else name = p;
		}
		return { name, ...mods };
	}

	private seqEqual(a: { name: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }[], b: { name: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }[]): boolean {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			const x = a[i];
			const y = b[i];
			if (x.name !== y.name || x.ctrl !== y.ctrl || x.alt !== y.alt || x.shift !== y.shift || x.meta !== y.meta) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Process a key press for chord recognition.
	 * @returns true if the key completed a chord and was handled.
	 */
	private processChords(parsed: any): boolean {
		// Convert parsed key to descriptor
		const desc = {
			name: parsed.name,
			ctrl: parsed.ctrl,
			alt: parsed.alt,
			shift: parsed.shift,
			meta: parsed.meta,
		};
		this.chordBuffer.push(desc);
		// reset timer
		if (this.chordTimer) (clearTimeout as any)(this.chordTimer);
		this.chordTimer = setTimeout(() => {
			this.chordBuffer = [];
			this.chordTimer = null;
		}, this.chordTimeoutMs) as any;
		// check for full match
		for (const chord of this.chordRegistry) {
			if (this.seqEqual(this.chordBuffer, chord.seq)) {
				// match
				this.chordBuffer = [];
				if (this.chordTimer) { clearTimeout(this.chordTimer); this.chordTimer = null; }
				chord.handler();
				return true;
			}
			// If buffer is not a prefix of this chord, we could discard early? Not needed.
		}
		return false;
	}

	/**
	 * Get terminal size
	 */
	getSize(): { rows: number; cols: number } {
		return { rows: this.terminal.rows, cols: this.terminal.columns };
	}

	/**
	 * Get scroll metrics
	 */
	getScrollMetrics(): { scrollTop: number; totalLines: number; viewportLines: number } {
		const { rows } = this.getSize();
		return {
			scrollTop: this.scrollTop,
			totalLines: this.totalBaseLines,
			viewportLines: rows,
		};
	}

	/**
	 * Get maximum possible scrollTop (0-indexed)
	 */
	getScrollMax(): number {
		const { rows } = this.getSize();
		return Math.max(0, this.totalBaseLines - rows);
	}

	/**
	 * Scroll by delta lines (positive=down, negative=up), clamped
	 */
	scroll(delta: number): void {
		const max = this.getScrollMax();
		this.scrollTop = Math.max(0, Math.min(max, this.scrollTop + delta));
		this.requestRender();
	}

	/**
	 * Scroll to an absolute line index (clamped)
	 */
	scrollTo(line: number): void {
		const max = this.getScrollMax();
		this.scrollTop = Math.max(0, Math.min(max, line));
		this.requestRender();
	}

	/**
	 * Handle wheel scroll event with inertial effect
	 */
	private handleWheelScroll(delta: number): void {
		this.inertiaScrollVelocity += delta;
		this.inertiaScrollLastEventTime = Date.now();
		this.startInertiaScroll();
	}

	/**
	 * Start the inertia scroll loop if not already running
	 */
	private startInertiaScroll(): void {
		if (this.inertiaScrollTimer) return;
		this.updateInertiaScroll();
	}

	/**
	 * Update scroll position based on inertia physics
	 */
	private updateInertiaScroll(): void {
		const now = Date.now();
		// Stop if no wheel events for too long
		if (now - this.inertiaScrollLastEventTime > this.INERTIA_TIMEOUT) {
			this.stopInertiaScroll();
			return;
		}

		// Apply scroll if velocity is significant
		if (Math.abs(this.inertiaScrollVelocity) >= 0.1) {
			this.scroll(this.inertiaScrollVelocity);
			// Decelerate
			this.inertiaScrollVelocity *= this.INERTIA_DECELERATION;
			// Schedule next tick
			this.inertiaScrollTimer = setTimeout(() => this.updateInertiaScroll(), this.INERTIA_TICK_RATE) as unknown as NodeJS.Timeout;
		} else {
			this.stopInertiaScroll();
		}
	}

	/**
	 * Stop the inertia scroll loop
	 */
	private stopInertiaScroll(): void {
		if (this.inertiaScrollTimer) {
			clearTimeout(this.inertiaScrollTimer);
			this.inertiaScrollTimer = undefined;
		}
		this.inertiaScrollVelocity = 0;
	}

	/**
	 * Check if TerminalUI is running
	 */
	isActive(): boolean {
		return !this.stopped;
	}
}

/** Check if running in Termux session */
export function isTermuxSession(): boolean {
	return Boolean(process.env.TERMUX_VERSION);
}
