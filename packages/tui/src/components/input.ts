/**
 * Input Component
 * 
 * Text input component with cursor support.
 * Supports editing, navigation, and optional single-line mode.
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';
import { visibleWidth, sliceByColumn } from './internal-utils.js';
import { parseKey, Key, matchesKey, isKeyRelease } from './keys.js';

/**
 * Input options
 */
export interface InputOptions {
	/** Initial value */
	value?: string;
	/** Placeholder text when empty */
	placeholder?: string;
	/** Maximum visible width (for rendering) */
	maxWidth?: number;
	/** Whether this is a password input (mask characters) */
	password?: boolean;
	/** Password mask character */
	maskChar?: string;
	/** Callback when value changes */
	onChange?: (value: string) => void;
	/** Callback when Enter is pressed */
	onSubmit?: (value: string) => void;
	/** Callback when Escape is pressed */
	onCancel?: () => void;
}

/**
 * Input - text input component
 */
export class Input implements UIElement, InteractiveElement {
	private value: string;
	private placeholder: string;
	private cursorPos: number = 0;
	private maxWidth: number;
	private password: boolean;
	private maskChar: string;
	private onChange?: (value: string) => void;
	private onSubmit?: (value: string) => void;
	private onCancel?: () => void;

	public isFocused = false;

	// History support
	private history: string[] = [];
	private historyIndex: number = -1;
	private historyTemp: string = '';

	constructor(options: InputOptions = {}) {
		this.value = options.value || '';
		this.placeholder = options.placeholder || '';
		this.maxWidth = options.maxWidth || 80;
		this.password = options.password || false;
		this.maskChar = options.maskChar || '*';
		this.onChange = options.onChange;
		this.onSubmit = options.onSubmit;
		this.onCancel = options.onCancel;
	}

	/**
	 * Get current value
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Set value programmatically
	 */
	setValue(value: string): void {
		this.value = value;
		this.cursorPos = Math.min(this.cursorPos, this.value.length);
		this.onChange?.(this.value);
	}

	/**
	 * Add to history (for command history)
	 */
	addToHistory(entry: string): void {
		if (entry && entry !== this.history[this.history.length - 1]) {
			this.history.push(entry);
		}
	}

	/**
	 * Clear history
	 */
	clearHistory(): void {
		this.history = [];
		this.historyIndex = -1;
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		let displayValue: string;

		if (this.value.length === 0 && !this.isFocused) {
			// Show placeholder when not focused and empty
			displayValue = `\x1b[2m${this.placeholder}\x1b[22m`;
		} else if (this.password) {
			// Mask password
			displayValue = this.maskChar.repeat(this.value.length);
		} else {
			displayValue = this.value;
		}

		// Truncate if needed
		const maxVisible = Math.min(width, this.maxWidth);
		let displayLine: string;

		if (visibleWidth(displayValue) <= maxVisible) {
			displayLine = displayValue;
		} else {
			// Show portion around cursor
			displayLine = sliceByColumn(displayValue, Math.max(0, this.cursorPos - maxVisible + 1), maxVisible);
		}

		// Add cursor marker if focused
		if (this.isFocused) {
			// Insert cursor marker at cursor position
			let beforeCursor = displayLine.slice(0, this.cursorPos);
			let afterCursor = displayLine.slice(this.cursorPos);
			displayLine = beforeCursor + '\x1b_pi:c\x07' + afterCursor;
		}

		return [displayLine];
	}

	handleKey(key: KeyEvent): void {
		if (isKeyRelease(key.raw)) return;

		const parsed = parseKey(key.raw);
		if (!parsed) return;

		const name = parsed.name;

		// Navigation
		if (matchesKey(key.raw, 'left') || matchesKey(key.raw, 'ctrl+b')) {
			this.moveCursor(-1);
			return;
		}

		if (matchesKey(key.raw, 'right') || matchesKey(key.raw, 'ctrl+f')) {
			this.moveCursor(1);
			return;
		}

		if (matchesKey(key.raw, 'home') || matchesKey(key.raw, 'ctrl+a')) {
			this.cursorPos = 0;
			return;
		}

		if (matchesKey(key.raw, 'end') || matchesKey(key.raw, 'ctrl+e')) {
			this.cursorPos = this.value.length;
			return;
		}

		// History navigation
		if (matchesKey(key.raw, 'up') && this.history.length > 0) {
			if (this.historyIndex === -1) {
				this.historyTemp = this.value;
			}
			if (this.historyIndex < this.history.length - 1) {
				this.historyIndex++;
				this.value = this.history[this.history.length - 1 - this.historyIndex] || '';
				this.cursorPos = this.value.length;
				this.onChange?.(this.value);
			}
			return;
		}

		if (matchesKey(key.raw, 'down') && this.history.length > 0) {
			if (this.historyIndex > 0) {
				this.historyIndex--;
				this.value = this.history[this.history.length - 1 - this.historyIndex] || '';
			} else {
				this.historyIndex = -1;
				this.value = this.historyTemp;
			}
			this.cursorPos = this.value.length;
			this.onChange?.(this.value);
			return;
		}

		// Editing
		if (matchesKey(key.raw, 'backspace') || matchesKey(key.raw, 'ctrl+h')) {
			this.deleteBeforeCursor();
			return;
		}

		if (matchesKey(key.raw, 'delete') || matchesKey(key.raw, 'ctrl+d')) {
			this.deleteAtCursor();
			return;
		}

		if (matchesKey(key.raw, 'ctrl+w')) {
			this.deleteWordBeforeCursor();
			return;
		}

		if (matchesKey(key.raw, 'ctrl+k')) {
			this.deleteToEndOfLine();
			return;
		}

		// Submit
		if (matchesKey(key.raw, 'enter') || matchesKey(key.raw, 'ctrl+m')) {
			this.onSubmit?.(this.value);
			return;
		}

		// Cancel
		if (matchesKey(key.raw, 'escape') || matchesKey(key.raw, 'ctrl+c')) {
			this.onCancel?.();
			return;
		}

		// Insert character
		if (parsed.name && parsed.name.length === 1 && parsed.name >= ' ' && parsed.name <= '~') {
			this.insertChar(parsed.name);
			return;
		}

		// Ctrl+V for paste (terminal will handle actual paste)
		// We just need to handle the text input
	}

	/**
	 * Insert character at cursor position
	 */
	private insertChar(char: string): void {
		this.value = this.value.slice(0, this.cursorPos) + char + this.value.slice(this.cursorPos);
		this.cursorPos++;
		this.onChange?.(this.value);
	}

	/**
	 * Move cursor by offset
	 */
	private moveCursor(offset: number): void {
		this.cursorPos = Math.max(0, Math.min(this.value.length, this.cursorPos + offset));
	}

	/**
	 * Delete character before cursor
	 */
	private deleteBeforeCursor(): void {
		if (this.cursorPos > 0) {
			this.value = this.value.slice(0, this.cursorPos - 1) + this.value.slice(this.cursorPos);
			this.cursorPos--;
			this.onChange?.(this.value);
		}
	}

	/**
	 * Delete character at cursor
	 */
	private deleteAtCursor(): void {
		if (this.cursorPos < this.value.length) {
			this.value = this.value.slice(0, this.cursorPos) + this.value.slice(this.cursorPos + 1);
			this.onChange?.(this.value);
		}
	}

	/**
	 * Delete word before cursor (Ctrl+W)
	 */
	private deleteWordBeforeCursor(): void {
		// Find beginning of current/previous word
		let pos = this.cursorPos;
		// Skip whitespace
		while (pos > 0 && this.value[pos - 1] === ' ') pos--;
		// Skip word characters
		while (pos > 0 && this.value[pos - 1] !== ' ') pos--;

		if (pos < this.cursorPos) {
			this.value = this.value.slice(0, pos) + this.value.slice(this.cursorPos);
			this.cursorPos = pos;
			this.onChange?.(this.value);
		}
	}

	/**
	 * Delete from cursor to end of line (Ctrl+K)
	 */
	private deleteToEndOfLine(): void {
		if (this.cursorPos < this.value.length) {
			this.value = this.value.slice(0, this.cursorPos);
			this.onChange?.(this.value);
		}
	}

	clearCache(): void {
		// No caching needed for input
	}
}
