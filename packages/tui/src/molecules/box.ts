/**
 * Box Component
 * 
 * Container component with padding and background
 */

import type { UIElement, RenderContext } from '../atoms/base.js';
import { visibleWidth } from '../atoms/internal-utils.js';

export type RenderCache = {
	childLines: string[];
	width: number;
	bgSample: string | undefined;
	lines: string[];
};

/**
 * Box component - a container that applies padding and background to all children
 */
export class Box implements UIElement {
	children: UIElement[] = [];
	private paddingX: number;
	private paddingY: number;
	private bgFn?: (text: string) => string;

	// Cache for rendered output
	private cache?: RenderCache;

	constructor(paddingX = 1, paddingY = 1, bgFn?: (text: string) => string) {
		this.paddingX = paddingX;
		this.paddingY = paddingY;
		this.bgFn = bgFn;
	}

	append(element: UIElement): void {
		this.children.push(element);
		this.clearCache();
	}

	remove(element: UIElement): void {
		const index = this.children.indexOf(element);
		if (index !== -1) {
			this.children.splice(index, 1);
			this.clearCache();
		}
	}

	clear(): void {
		this.children = [];
		this.clearCache();
	}

	setBgFn(bgFn?: (text: string) => string): void {
		this.bgFn = bgFn;
		this.clearCache();
	}

	draw(context: RenderContext): string[] {
		const width = context.width;

		// Check cache
		if (this.cache && this.cache.width === width) {
			// Check if background function changed
			const bgSample = this.bgFn ? this.bgFn('') : undefined;
			if (this.cache.bgSample === bgSample) {
				return this.cache.lines;
			}
		}

		// Render children
		const childLines: string[] = [];
		for (const child of this.children) {
			const lines = child.draw({ ...context, width: width - this.paddingX * 2 });
			childLines.push(...lines);
		}

		// Apply padding and background
		const lines: string[] = [];

		// Top padding
		for (let i = 0; i < this.paddingY; i++) {
			const line = ' '.repeat(width);
			lines.push(this.applyBackground(line));
		}

		// Content with side padding
		for (const line of childLines) {
			const paddedLine = ' '.repeat(this.paddingX) + line + ' '.repeat(this.paddingX);
			lines.push(this.applyBackground(paddedLine));
		}

		// Bottom padding
		for (let i = 0; i < this.paddingY; i++) {
			const line = ' '.repeat(width);
			lines.push(this.applyBackground(line));
		}

		// Cache result
		this.cache = {
			childLines,
			width,
			bgSample: this.bgFn ? this.bgFn('') : undefined,
			lines,
		};

		return lines;
	}

	clearCache(): void {
		this.cache = undefined;
		for (const child of this.children) {
			child.clearCache?.();
		}
	}

	/**
	 * Apply background function to a line
	 */
	private applyBackground(line: string): string {
		if (!this.bgFn) return line;
		return this.bgFn(line);
	}
}
