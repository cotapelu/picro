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
} from './base.js';

import {
  isInteractive,
  CURSOR_MARKER,
  resolveDimension,
  ElementContainer,
} from './base.js';

import { visibleWidth, truncateText, wrapText, sliceByColumn, extractOverlaySegments, wrapTextWithAnsi } from './internal-utils.js';
import { isImageLine, getCellDimensions, setCellDimensions } from './terminal-image.js';
import type { Terminal } from './terminal.js';
import { parseKey, isKeyRelease } from './keys.js';
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
	private stopped = false;
	private debugLogPath?: string;

	// Panel stack for modal elements rendered on top of base content
	private focusOrderCounter = 0;

	private keyHandlers = new Set<KeyHandler>();

	private panelStack: {
		element: UIElement;
		options?: PanelOptions;
		preFocus: UIElement | null;
		hidden: boolean;
		focusOrder: number;
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
		};

		this.panelStack.push(entry);

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
		};
	}

	/**
	 * Remove a panel element from the stack
	 */
	removePanel(element: UIElement): void {
		const index = this.panelStack.findIndex(p => p.element === element);
		if (index === -1) return;

		const panel = this.panelStack[index];
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
		const delay = Math.max(0, TerminalUI.MIN_RENDER_INTERVAL_MS - elapsed);
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
		// Mouse event detection (X10 protocol)
		if (data.length >= 6 && data.charCodeAt(0) === 27 && data.charCodeAt(1) === 91 && data[2] === 'M') {
			const cb = data.charCodeAt(3) - 32;
			const cx = data.charCodeAt(4) - 32;
			const cy = data.charCodeAt(5) - 32;
			// Left button press (0) or drag? We'll handle press only
			if ((cb & 0x03) === 0) { // button 0 press
				this.handleMouse({ row: cy - 1, col: cx - 1, button: 'left' });
			}
			return; // consume mouse
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

		// Pass to focused element with parsed key info
		const focused = this.getFocusedElement();
		if (focused && focused.handleKey) {
			// Merge parsed info into the key event
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
	}

	/** Handle mouse events (row/col are 0-indexed) */
	private handleMouse(event: { row: number; col: number; button: 'left' | 'right' | 'middle' }): void {
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

		// Render base content
		const context: RenderContext = { width, height };
		const baseLines = this.renderBaseContent(context);

		// Render panels
		const panelLines = this.renderPanels(context);

		// Clear previous panel geometries; will be repopulated during merge
		this.panelGeos.clear();

		// Merge panels into base content
		const finalLines = this.mergePanels(baseLines, panelLines, width, height);

		// Full redraw
		this.fullRedraw(finalLines, width, height);

		// Update tracking
		this.previousLines = finalLines;
		this.maxLinesRendered = Math.max(this.maxLinesRendered, finalLines.length);
		this.renderRequested = false;
	}

	/**
	 * Render base content (root element)
	 */
	private renderBaseContent(context: RenderContext): string[] {
		const lines = this.children.length > 0 ? this.children[0].draw(context) : [];
		return lines;
	}

	/**
	 * Render all panels
	 */
	private renderPanels(context: RenderContext): Map<UIElement, string[]> {
		const panelMap = new Map<UIElement, string[]>();

		for (const panel of this.panelStack) {
			// Skip if panel is hidden
			if (panel.hidden) continue;

			// Check visibility condition if provided
			if (panel.options?.visible && !panel.options.visible(this.terminal.columns, this.terminal.rows)) {
				continue;
			}

			// Calculate panel dimensions
			const panelWidth = this.calculatePanelWidth(panel.options, context.width);
			const panelHeight = this.calculatePanelHeight(panel.options, context.height);

			if (panelWidth === undefined || panelHeight === undefined) {
				continue;
			}

			// Render panel
			const panelContext: RenderContext = { width: panelWidth, height: panelHeight };
			const lines = panel.element.draw(panelContext);
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
	 * Merge panels into base content
	 */
	private mergePanels(baseLines: string[], panelMap: Map<UIElement, string[]>, width: number, height: number): string[] {
		const result = [...baseLines];

		// Sort panels by focus order (newest on top)
		const sortedPanels = Array.from(panelMap.entries()).sort((a, b) => {
			const aPanel = this.panelStack.find(p => p.element === a[0]);
			const bPanel = this.panelStack.find(p => p.element === b[0]);
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
				const outputRow = startRow + i;
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
			// If lines were removed before lastDiff, we need to clear until old end
			if (newLines.length < oldLines.length) {
				lastDiff = Math.max(lastDiff, oldLines.length - 1);
			} else {
				lastDiff = Math.max(lastDiff, newLines.length - 1);
			}
			renderEnd = lastDiff;
		}

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
	 * Get terminal size
	 */
	getSize(): { rows: number; cols: number } {
		return { rows: this.terminal.rows, cols: this.terminal.columns };
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
