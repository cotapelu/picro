/**
 * Editor Component
 * 
 * Multi-line text editor with undo, history navigation, and autocomplete.
 * Based on study from pi-tui-legacy but not copied.
 */

import type { UIElement, RenderContext, KeyEvent } from '../tui.js';
import { visibleWidth, wrapText } from '../utils.js';

interface EditorState {
	lines: string[];
	cursorLine: number;
	cursorCol: number;
}

export interface EditorOptions {
	paddingX?: number;
	paddingY?: number;
	autocompleteMaxVisible?: number;
}

interface AutocompleteProvider {
	getCompletions(prefix: string): Promise<{ value: string; label: string }[]>;
	applyCompletion(text: string, completion: { value: string }): string;
}

/**
 * Generic undo stack for Editor
 */
class UndoStack<T> {
	private stack: T[] = [];
	private index: number = -1;
	private maxSize: number = 100;

	push(state: T): void {
		// Remove any states after current index
		this.stack = this.stack.slice(0, this.index + 1);
		this.stack.push(state);
		if (this.stack.length > this.maxSize) {
			this.stack.shift();
			this.index--;
		}
		this.index = this.stack.length - 1;
	}

	undo(): T | undefined {
		if (this.index > 0) {
			this.index--;
			return this.stack[this.index];
		}
		return undefined;
	}

	redo(): T | undefined {
		if (this.index < this.stack.length - 1) {
			this.index++;
			return this.stack[this.index];
		}
		return undefined;
	}

	canUndo(): boolean {
		return this.index > 0;
	}

	canRedo(): boolean {
		return this.index < this.stack.length - 1;
	}

	clear(): void {
		this.stack = [];
		this.index = -1;
	}
}

/**
 * Kill ring for Emacs-style kill/yank operations
 */
class KillRing {
	private ring: string[] = [];
	private index: number = 0;
	private maxSize: number = 10;

	kill(text: string): void {
		this.ring.unshift(text);
		if (this.ring.length > this.maxSize) {
			this.ring.pop();
		}
		this.index = 0;
	}

	yank(): string | undefined {
		if (this.ring.length === 0) return undefined;
		return this.ring[this.index];
	}

	yankPop(): string | undefined {
		if (this.ring.length <= 1) return undefined;
		this.index = (this.index + 1) % this.ring.length;
		return this.ring[this.index];
	}
}

/**
 * Editor - multi-line text editor component
 */
export class Editor implements UIElement {
	private state: EditorState = {
		lines: [''],
		cursorLine: 0,
		cursorCol: 0,
	};

	private tui: any;
	private paddingX: number = 0;
	private paddingY: number = 0;
	private maxAutocompleteVisible: number = 5;

	// Undo stack
	private undoStack = new UndoStack<EditorState>();

	// Kill ring
	private killRing = new KillRing();

	// Last action tracking
	private lastAction: 'kill' | 'yank' | 'type' | null = null;

	// History for up/down navigation
	private history: string[] = [];
	private historyIndex: number = -1;
	private historyTemp: string = '';

	// Scroll offset
	private scrollOffset: number = 0;
	private lastRenderWidth: number = 80;

	// Border color indicator
	public borderColor: (str: string) => string = (s) => s;

	// Callbacks
	public onSubmit?: (text: string) => void;
	public onChange?: (text: string) => void;
	public onEscape?: () => void;
	public onCtrlD?: () => void;

	// Focused state
	public isFocused: boolean = false;

	constructor(tui: any, options: EditorOptions = {}) {
		this.tui = tui;
		this.paddingX = options.paddingX ?? 0;
		this.paddingY = options.paddingY ?? 0;
		this.maxAutocompleteVisible = options.autocompleteMaxVisible ?? 5;
	}

	getText(): string {
		return this.state.lines.join('\n');
	}

	setText(text: string): void {
		const lines = text.split('\n');
		this.state.lines = lines.length === 0 ? [''] : lines;
		this.state.cursorLine = Math.min(this.state.cursorLine, this.state.lines.length - 1);
		this.state.cursorCol = Math.min(this.state.cursorCol, this.state.lines[this.state.cursorLine]?.length ?? 0);
		this.pushUndo();
	}

	addToHistory(text: string): void {
		const trimmed = text.trim();
		if (!trimmed) return;
		if (this.history.length > 0 && this.history[0] === trimmed) return;
		this.history.unshift(trimmed);
		if (this.history.length > 100) this.history.pop();
	}

	private pushUndo(): void {
		this.undoStack.push({ ...this.state, lines: [...this.state.lines] });
	}

	private undo(): void {
		const state = this.undoStack.undo();
		if (state) {
			this.state = state;
			this.onChange?.(this.getText());
		}
	}

	private redo(): void {
		const state = this.undoStack.redo();
		if (state) {
			this.state = state;
			this.onChange?.(this.getText());
		}
	}

	/**
	 * Move cursor to character position
	 */
	private jumpToChar(char: string, direction: 'forward' | 'backward'): void {
		const line = this.state.lines[this.state.cursorLine] ?? '';
		const pos = direction === 'forward'
			? line.indexOf(char, this.state.cursorCol + 1)
			: line.lastIndexOf(char, this.state.cursorCol - 1);
		if (pos !== -1) {
			this.state.cursorCol = pos;
		}
	}

	/**
	 * Word navigation
	 */
	private wordLeft(): void {
		const line = this.state.lines[this.state.cursorLine] ?? '';
		let pos = this.state.cursorCol - 1;
		while (pos > 0 && line[pos - 1] === ' ') pos--;
		while (pos > 0 && line[pos - 1] !== ' ') pos--;
		this.state.cursorCol = pos;
	}

	private wordRight(): void {
		const line = this.state.lines[this.state.cursorLine] ?? '';
		let pos = this.state.cursorCol;
		while (pos < line.length && line[pos] === ' ') pos++;
		while (pos < line.length && line[pos] !== ' ') pos++;
		this.state.cursorCol = pos;
	}

	clearCache(): void {
		// No cache currently
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		this.lastRenderWidth = width;
		const lines: string[] = [];

		// Calculate content width
		const contentWidth = Math.max(1, width - this.paddingX * 2);

		// Add vertical padding
		for (let i = 0; i < this.paddingY; i++) {
			lines.push(' '.repeat(width));
		}

		// Draw content lines with word wrap
		for (let i = 0; i < this.state.lines.length; i++) {
			const line = this.state.lines[i] ?? '';
			const wrapped = wrapText(line, contentWidth);
			for (let j = 0; j < wrapped.length; j++) {
				const lineContent = j === 0 && wrapped.length === 1 ? line : wrapped[j];
				const displayLine = ' '.repeat(this.paddingX) + lineContent.padEnd(contentWidth);
				lines.push(displayLine);
			}
		}

		// Add vertical padding bottom
		for (let i = 0; i < this.paddingY; i++) {
			lines.push(' '.repeat(width));
		}

		return lines;
	}

	handleKey(key: KeyEvent): void {
		const keyName = key.name;
		const raw = key.raw;

		// Ctrl+Z - undo (if Ctrl not pressed)
		if (keyName === 'z' && key.modifiers?.ctrl && !key.modifiers?.shift) {
			this.undo();
			return;
		}

		// Ctrl+Shift+Z or Ctrl+Y - redo
		if ((keyName === 'z' && key.modifiers?.ctrl && key.modifiers?.shift) || keyName === 'y') {
			this.redo();
			return;
		}

		// Escape
		if (keyName === 'Escape') {
			this.onEscape?.();
			return;
		}

		// Ctrl+D - exit/cancel
		if (keyName === 'd' && key.modifiers?.ctrl) {
			this.onCtrlD?.();
			return;
		}

		// Arrow keys and navigation
		if (keyName === 'ArrowUp') {
			if (this.state.cursorLine > 0) this.state.cursorLine--;
			return;
		}
		if (keyName === 'ArrowDown') {
			if (this.state.cursorLine < this.state.lines.length - 1) this.state.cursorLine++;
			return;
		}
		if (keyName === 'ArrowLeft') {
			if (this.state.cursorCol > 0) this.state.cursorCol--;
			return;
		}
		if (keyName === 'ArrowRight') {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			if (this.state.cursorCol < line.length) this.state.cursorCol++;
			return;
		}

		// Home - start of line
		if (keyName === 'Home') {
			this.state.cursorCol = 0;
			return;
		}

		// End - end of line
		if (keyName === 'End') {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			this.state.cursorCol = line.length;
			return;
		}

		// Backspace
		if (keyName === 'Backspace') {
			if (this.state.cursorCol > 0) {
				const line = this.state.lines[this.state.cursorLine] ?? '';
				const newLine = line.slice(0, this.state.cursorCol - 1) + line.slice(this.state.cursorCol);
				this.state.lines[this.state.cursorLine] = newLine;
				this.state.cursorCol--;
				this.pushUndo();
			} else if (this.state.cursorLine > 0) {
				// Merge with previous line
				const currentLine = this.state.lines[this.state.cursorLine] ?? '';
				const prevLine = this.state.lines[this.state.cursorLine - 1] ?? '';
				this.state.cursorCol = prevLine.length;
				this.state.lines[this.state.cursorLine - 1] = prevLine + currentLine;
				this.state.lines.splice(this.state.cursorLine, 1);
				this.state.cursorLine--;
				this.pushUndo();
			}
			return;
		}

		// Delete
		if (keyName === 'Delete') {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			if (this.state.cursorCol < line.length) {
				const newLine = line.slice(0, this.state.cursorCol) + line.slice(this.state.cursorCol + 1);
				this.state.lines[this.state.cursorLine] = newLine;
				this.pushUndo();
			} else if (this.state.cursorLine < this.state.lines.length - 1) {
				// Merge with next line
				const currentLine = this.state.lines[this.state.cursorLine] ?? '';
				const nextLine = this.state.lines[this.state.cursorLine + 1] ?? '';
				this.state.lines[this.state.cursorLine] = currentLine + nextLine;
				this.state.lines.splice(this.state.cursorLine + 1, 1);
				this.pushUndo();
			}
			return;
		}

		// Enter
		if (keyName === 'Enter') {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			const beforeCursor = line.slice(0, this.state.cursorCol);
			const afterCursor = line.slice(this.state.cursorCol);

			// Insert new line
			this.state.lines[this.state.cursorLine] = beforeCursor;
			this.state.lines.splice(this.state.cursorLine + 1, 0, afterCursor);
			this.state.cursorLine++;
			this.state.cursorCol = 0;
			this.pushUndo();

			// Submit if just one line and empty
			if (this.state.lines.length === 1 && beforeCursor.trim() === '') {
				this.onSubmit?.('');
			}
			return;
		}

		// Tab
		if (keyName === 'Tab') {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			const newLine = line.slice(0, this.state.cursorCol) + '  ' + line.slice(this.state.cursorCol);
			this.state.lines[this.state.cursorLine] = newLine;
			this.state.cursorCol += 2;
			this.pushUndo();
			return;
		}

		// Regular character input
		if (raw.length === 1 && raw.charCodeAt(0) >= 32) {
			const line = this.state.lines[this.state.cursorLine] ?? '';
			const newLine = line.slice(0, this.state.cursorCol) + raw + line.slice(this.state.cursorCol);
			this.state.lines[this.state.cursorLine] = newLine;
			this.state.cursorCol++;
			this.lastAction = 'type';
			this.pushUndo();
			return;
		}
	}
}