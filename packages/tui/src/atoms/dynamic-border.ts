/**
 * DynamicBorder Component
 * Decorative border around content
 */

import type { UIElement, RenderContext } from './base.js';

/**
 * DynamicBorder - draws a rounded border around child content
 */
export class DynamicBorder implements UIElement {
	private colorFn?: (text: string) => string;

	constructor(colorFn?: (text: string) => string) {
		this.colorFn = colorFn;
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		const lines: string[] = [];

		// Top border
		lines.push(this.applyColor('┌' + '─'.repeat(width - 2) + '┐'));

		// Content lines (passed by caller, not managed here)
		// This component is typically used as a top/bottom border separately

		// Bottom border
		lines.push(this.applyColor('└' + '─'.repeat(width - 2) + '┘'));

		return lines;
	}

	clearCache(): void {
		// No cache
	}

	private applyColor(text: string): string {
		return this.colorFn ? this.colorFn(text) : text;
	}
}
