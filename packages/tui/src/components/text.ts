/**
 * Text Component
 * 
 * Simple text display component with styling support
 */

import type { UIElement, RenderContext } from './base.js';
import { visibleWidth, wrapTextWithAnsi as wrapText, truncateText, containsRtl, reverseByGraphemes, containsArabic, shapeArabic } from './internal-utils.js';

export type TextCache = {
	width: number;
	lines: string[];
};

/**
 * Text component - displays text with optional styling
 */
export class Text implements UIElement {
	private content: string;
	private color?: string;
	private bgColor?: string;
	private bold?: boolean;
	private dim?: boolean;
	private underline?: boolean;
	private wrap?: boolean;
	private truncate?: boolean;
	private align?: 'left' | 'center' | 'right';
	textDirection?: 'ltr' | 'rtl' | 'auto';

	// Cache for rendered output
	private cache?: TextCache;

	constructor(content: string, options?: {
		color?: string;
		bgColor?: string;
		bold?: boolean;
		dim?: boolean;
		underline?: boolean;
		wrap?: boolean;
		truncate?: boolean;
		align?: 'left' | 'center' | 'right';
	}) {
		this.content = content;
		this.color = options?.color;
		this.bgColor = options?.bgColor;
		this.bold = options?.bold;
		this.dim = options?.dim;
		this.underline = options?.underline;
		this.wrap = options?.wrap;
		this.truncate = options?.truncate;
		this.align = options?.align;
	}

	setContent(content: string): void {
		this.content = content;
		this.clearCache();
	}

	draw(context: RenderContext): string[] {
		const width = context.width;

		// Check cache
		if (this.cache && this.cache.width === width) {
			return this.cache.lines;
		}

		// Split content by newlines first
		let rawLines = this.content.split('\n');

		let lines: string[];

		if (this.wrap) {
			// Wrap each line
			lines = rawLines.flatMap(line => wrapText(line, width));
		} else if (this.truncate) {
			// Truncate each line
			lines = rawLines.map(line => truncateText(line, width));
		} else {
			// Keep lines as-is
			lines = rawLines;
		}

		// Filter out empty lines if content is empty
		if (this.content === '') {
			lines = [];
		}

		// Reshape Arabic text if needed
		lines = lines.map(line => containsArabic(line) ? shapeArabic(line) : line);

		// Apply text direction (RTL) if needed
		const dir = this.textDirection ?? 'auto';
		lines = lines.map(line => {
			let txt = line;
			if (dir === 'rtl' || (dir === 'auto' && containsRtl(txt))) {
				txt = reverseByGraphemes(txt);
			}
			return txt;
		});

		// Apply styling and alignment
		const styledLines = lines.map(line => this.styleLine(line, width));

		// Cache result
		this.cache = {
			width,
			lines: styledLines,
		};

		return styledLines;
	}

	clearCache(): void {
		this.cache = undefined;
	}

	/** Accessibility: get text content */
	describe(): string {
		return this.content;
	}

	/**
	 * Apply styling to a line
	 */
	private styleLine(line: string, width: number): string {
		const styled = this.applyStyles(line);
		const lineWidth = visibleWidth(line);

		// Apply alignment
		switch (this.align) {
			case 'center':
				const leftPad = Math.floor((width - lineWidth) / 2);
				const rightPad = width - lineWidth - leftPad;
				return ' '.repeat(leftPad) + styled + ' '.repeat(rightPad);
			case 'right':
				return ' '.repeat(width - lineWidth) + styled;
			case 'left':
			default:
				// No trailing padding - let the line be its natural width
					return styled;
		}
	}

	/**
	 * Apply ANSI styles to text
	 */
	private applyStyles(text: string): string {
		const styles: string[] = [];

		if (this.color) {
			styles.push(String(this.getColorCode(this.color)));
		}

		if (this.bgColor) {
			styles.push(String(this.getBgColorCode(this.bgColor)));
		}

		if (this.bold) styles.push('1');
		if (this.dim) styles.push('2');
		if (this.underline) styles.push('4');

		if (styles.length > 0) {
			return '\x1b[' + styles.join(';') + 'm' + text + '\x1b[0m';
		}

		return text;
	}

	/**
	 * Get ANSI color code
	 */
	private getColorCode(color: string): number {
		const colorMap: Record<string, number> = {
			black: 30,
			red: 31,
			green: 32,
			yellow: 33,
			blue: 34,
			magenta: 35,
			cyan: 36,
			white: 37,
			brightBlack: 90,
			brightRed: 91,
			brightGreen: 92,
			brightYellow: 93,
			brightBlue: 94,
			brightMagenta: 95,
			brightCyan: 96,
			brightWhite: 97,
		};

		return colorMap[color] || 37;
	}

	/**
	 * Get ANSI background color code
	 */
	private getBgColorCode(color: string): number {
		const colorMap: Record<string, number> = {
			black: 40,
			red: 41,
			green: 42,
			yellow: 43,
			blue: 44,
			magenta: 45,
			cyan: 46,
			white: 47,
			brightBlack: 100,
			brightRed: 101,
			brightGreen: 102,
			brightYellow: 103,
			brightBlue: 104,
			brightMagenta: 105,
			brightCyan: 106,
			brightWhite: 107,
		};

		return colorMap[color] || 40;
	}
}
