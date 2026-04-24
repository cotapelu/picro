/**
 * Terminal UI Library for Coding Agent
 */

import type { Terminal } from './terminal.js';
import { parseKey, isKeyRelease } from './keys.js';

/**
 * Base interface for all UI elements
 * Each element can draw itself to a list of text lines
 */
export interface UIElement {
	/**
	 * Draw the element to lines for the given viewport width
	 * @param context - Rendering context with width and other info
	 * @returns Array of strings, each representing a line
	 */
	draw(context: RenderContext): string[];

	/**
	 * Optional handler for keyboard input when element has focus
	 */
	handleKey?(key: KeyEvent): void;

	/**
	 * If true, element receives key release events.
	 * Default is false - release events are filtered out.
	 */
	wantsKeyRelease?: boolean;

	/**
	 * Clear any cached rendering state.
	 * Called when theme changes or when element needs to redraw from scratch.
	 */
	clearCache(): void;
}

/**
 * Rendering context passed to draw methods
 */
export interface RenderContext {
	/** Available width for rendering */
	width: number;
	/** Available height for rendering */
	height: number;
	/** Current theme for styling */
	theme?: UITheme;
}

/**
 * Interface for elements that can receive focus and display a cursor.
 * When focused, the element should emit CURSOR_MARKER at the cursor position
 * in its draw output. TerminalUI will find this marker and position the cursor there.
 */
export interface InteractiveElement {
	/** Set by TerminalUI when focus changes. Element should emit CURSOR_MARKER when true. */
	isFocused: boolean;
}

/** Type guard to check if an element implements InteractiveElement */
export function isInteractive(element: UIElement | null): element is UIElement & InteractiveElement {
	return element !== null && 'isFocused' in element;
}

/**
 * Cursor position marker - APC (Application Program Command) sequence.
 * This is a zero-width escape sequence that terminals ignore.
 * Elements emit this at the cursor position when focused.
 * TerminalUI finds and strips this marker, then positions the cursor there.
 */
export const CURSOR_MARKER = '\x1b_pi:c\x07';

/** Value that can be absolute (number) or percentage (string like "50%") */
export type Dimension = number | `${number}%`;

/** Result of key event handling */
export type KeyHandlerResult = { consume?: boolean; data?: string } | undefined;

/** Handler for keyboard events */
export type KeyHandler = (key: KeyEvent) => KeyHandlerResult;

/** Keyboard event data */
export interface KeyEvent {
	/** Raw key data from terminal */
	raw: string;
	/** Key name if recognized (e.g., 'Enter', 'Escape') */
	name?: string;
	/** Modifier keys */
	modifiers?: {
		ctrl?: boolean;
		alt?: boolean;
		shift?: boolean;
		meta?: boolean;
	};
}

/**
 * Parse a Dimension into absolute value given a reference size
 */
export function resolveDimension(value: Dimension | undefined, referenceSize: number): number | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value.endsWith('%')) {
		const percent = parseFloat(value.slice(0, -1));
		return Math.floor((percent / 100) * referenceSize);
	}
	return undefined;
}

/** Anchor position for floating panels */
export type PanelAnchor =
	| 'center'
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right'
	| 'top-center'
	| 'bottom-center'
	| 'left-center'
	| 'right-center';

/** Margin configuration for panels */
export interface PanelMargin {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}

/** Options for panel positioning */
export interface PanelOptions {
	anchor?: PanelAnchor;

	/** Minimum width in columns */
	minWidth?: number;

	/** Height in rows, or percentage of terminal height (e.g., "50%") */
	panelHeight?: Dimension;

	/** Maximum height in rows, or percentage of terminal height (e.g., "50%") */
	maxHeight?: Dimension;

	/** Horizontal offset from anchor position (positive = right) */
	offsetX?: number;

	/** Vertical offset from anchor position (positive = down) */
	offsetY?: number;

	/** Margin from terminal edges. Number applies to all sides. */
	padding?: PanelMargin | number;

	/** Control panel visibility based on terminal dimensions. */
	visible?: (termWidth: number, termHeight: number) => boolean;

	/** If true, don't capture keyboard focus when shown */
	nonCapturing?: boolean;
	/** Row position: absolute number, or percentage (e.g., "25%" = 25% from top) */
	row?: Dimension;
	/** Column position: absolute number, or percentage (e.g., "50%" = centered horizontally) */
	col?: Dimension;
	width?: Dimension;
	height?: Dimension;
}

/** Handle returned by showPanel for controlling the panel */
export interface PanelHandle {
	/** Permanently remove the panel (cannot be shown again) */
	close(): void;

	/** Temporarily hide or show the panel */
	setHidden(hidden: boolean): void;

	/** Check if panel is temporarily hidden */
	isHidden(): boolean;

	/** Focus this panel and bring it to the visual front */
	focus(): void;

	/** Release focus to the previous target */
	unfocus(): void;

	/** Check if this panel currently has focus */
	isFocused(): boolean;
}

/**
 * Container element that holds child elements
 */
export class ElementContainer implements UIElement {
	public children: UIElement[] = [];

	/** Draw all child elements */
	draw(context: RenderContext): string[] {
		const lines: string[] = [];
		for (const child of this.children) {
			const childLines = child.draw(context);
			for (const line of childLines) {
				lines.push(line);
			}
		}
		return lines;
	}

	/** Add a child element */
	append(element: UIElement): void {
		this.children.push(element);
	}

	/** Remove a child element */
	remove(element: UIElement): void {
		const index = this.children.indexOf(element);
		if (index !== -1) {
			this.children.splice(index, 1);
		}
	}

	/** Remove all child elements */
	clear(): void {
		this.children = [];
	}

	/** Clear cache for all child elements */
	clearCache(): void {
		for (const child of this.children) {
			child.clearCache?.();
		}
	}
}

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
		this.fullRedraw(finalLines);

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
		// Move cursor to top
		this.terminal.moveBy(-this.cursorRow);

		// Find cursor marker position
		let cursorRow = 0;
		let cursorCol = 0;

		for (let i = 0; i < newLines.length; i++) {
			const line = newLines[i];
			const markerIndex = line.indexOf(CURSOR_MARKER);

			if (markerIndex !== -1) {
				cursorRow = i;
				cursorCol = markerIndex;
				// Remove marker from line
				newLines[i] = line.replace(CURSOR_MARKER, '');
				break;
			}
		}

		// Update lines
		for (let i = 0; i < newLines.length; i++) {
			const newLine = newLines[i];
			const oldLine = this.previousLines[i] || '';

			if (newLine !== oldLine || sizeChanged) {
				this.terminal.moveBy(i - this.cursorRow);
				this.terminal.clearLine();
				this.terminal.write(newLine);
				this.cursorRow = i;
			}
		}

		// Clear remaining lines if content shrank
		if (this.clearOnShrink && newLines.length < this.previousLines.length) {
			for (let i = newLines.length; i < this.previousLines.length; i++) {
				this.terminal.moveBy(i - this.cursorRow);
				this.terminal.clearLine();
				this.cursorRow = i;
			}
		}

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
	private fullRedraw(newLines: string[]): void {
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

		// Write all lines
		for (let i = 0; i < newLines.length; i++) {
			this.terminal.clearLine();
			this.terminal.write(newLines[i]);
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

/**
 * UI Theme interface for styling
 */
export interface UITheme {
	/** Default text color */
	textColor?: string;
	/** Default background color */
	bgColor?: string;
	/** Border color */
	borderColor?: string;
	/** Accent color */
	accentColor?: string;
	/** Error color */
	errorColor?: string;
	/** Warning color */
	warningColor?: string;
	/** Success color */
	successColor?: string;
}
