/**
 * BorderedLoader Component
 * Shows a loading spinner with message and ability to cancel
 */

import { CURSOR_MARKER } from '../atoms/base';
import type { UIElement, KeyEvent, RenderContext, InteractiveElement } from '../atoms/base';
import { visibleWidth } from '../atoms/internal-utils';

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerFrame = 0;

/**
 * BorderedLoader - bordered box with spinner
 */
export class BorderedLoader implements UIElement, InteractiveElement {
	private tui: any;
	private theme: any;
	private message: string;
	private spinnerIndex = 0;
	private onAbort?: () => void;
	private width = 60;
	private height = 5;
	private spinnerInterval: any;

	public isFocused = false;
	public signal: AbortSignal;

	constructor(tui: any, theme: any, message: string, onAbort?: () => void) {
		this.tui = tui;
		this.theme = theme;
		this.message = message;
		this.onAbort = onAbort;

		const controller = new AbortController();
		this.signal = controller.signal;

		// Advance spinner every 80ms
		this.spinnerInterval = setInterval(() => {
			this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER_FRAMES.length;
			this.tui?.requestRender();
		}, 80);
	}

	// Update message dynamically
	setMessage(message: string): void {
		this.message = message;
		this.tui?.requestRender();
	}

	get width_(): number { return this.width; }
	get height_(): number { return this.height; }

	draw(context: RenderContext): string[] {
		this.width = context.width - 4;
		this.height = 5;

		const lines: string[] = [];
		const frame = SPINNER_FRAMES[this.spinnerIndex];

		// Top border
		lines.push('┌' + '─'.repeat(this.width) + '┐');

		// Spinner line
		const spinnerLine = ` ${frame} ${this.message}`;
		lines.push('│' + spinnerLine.padEnd(this.width) + '│');

		// Empty line
		lines.push('│' + ' '.repeat(this.width) + '│');

		// Hint line
		const hint = 'Press Esc to cancel';
		lines.push('│' + hint.padEnd(this.width) + '│');

		// Bottom border
		lines.push('└' + '─'.repeat(this.width) + '┘');

		if (this.isFocused) {
			lines[1] = CURSOR_MARKER + lines[1];
		}

		return lines;
	}

	handleKey(key: KeyEvent): void {
		if (key.name === 'Escape' || key.raw === '\x03') {
			this.onAbort?.();
			clearInterval(this.spinnerInterval);
		}
	}

	clearCache(): void {
		// No cache
	}

	// Ensure cleanup when disposed
	// (caller should call this when done)
	dispose(): void {
		clearInterval(this.spinnerInterval);
	}
}
