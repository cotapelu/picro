/**
 * Markdown Component
 * Renders markdown with optional syntax highlighting
 */

import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth, wrapText } from '../utils.js';
import hljs from 'highlight.js';

type MarkdownCache = {
	width: number;
	height: number;
	lines: string[];
	codeCopyRows: Set<number>;
	codeRowToCode: Map<number, string>;
};

/** Token color mapping for syntax highlighting */
const defaultTokenColors: Record<string, string> = {
	keyword: '\x1b[35m', // magenta
	string: '\x1b[32m', // green
	comment: '\x1b[2;33m', // dim yellow
	number: '\x1b[34m', // blue
	function: '\x1b[36m', // cyan
	class: '\x1b[36m',
	title: '\x1b[1;36m', // bold cyan
	built_in: '\x1b[33m', // yellow
	literal: '\x1b[36m',
	type: '\x1b[36m',
	tag: '\x1b[31m', // red
	attribute: '\x1b[36m',
	value: '\x1b[32m',
	default: '\x1b[0m',
};

export class Markdown implements UIElement {
	private content: string;
	private paddingX: number;
	private paddingY: number;
	private cache?: MarkdownCache & { codeCopyRows?: Set<number>; codeRowToCode?: Map<number, string> };

	constructor(content: string, paddingX = 1, paddingY = 1) {
		this.content = content;
		this.paddingX = paddingX;
		this.paddingY = paddingY;
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

		// Render markdown to lines with code blocks info
		const contentWidth = width - this.paddingX * 2;
		const { lines: rawLines, codeBlocks } = this.renderMarkdownWithCodeBlocks(this.content, contentWidth);

		// Add [Copy] hint after code block bottom borders and track copy rows
		const lines: string[] = [];
		const copyHint = ' [Copy]';
		const codeCopyRows = new Set<number>();
		const codeRowToCode = new Map<number, string>();
		let codeBlockIdx = 0;
		for (let i = 0; i < rawLines.length; i++) {
		  const line = rawLines[i];
		  lines.push(line);
		  if (line.startsWith('└') && line.endsWith('┘')) {
		    if (contentWidth >= copyHint.length && codeBlockIdx < codeBlocks.length) {
		      const pad = ' '.repeat(contentWidth - copyHint.length);
		      const hintLine = pad + '\x1b[2m' + copyHint + '\x1b[0m';
		      lines.push(hintLine);
		      const copyRow = lines.length - 1;
		      codeCopyRows.add(copyRow);
		      codeRowToCode.set(copyRow, codeBlocks[codeBlockIdx].code);
		      codeBlockIdx++;
		    }
		  }
		}

		// Apply padding
		const paddedLines: string[] = [];

		// Top padding
		for (let i = 0; i < this.paddingY; i++) {
			paddedLines.push(' '.repeat(width));
		}

		// Content with side padding; also offset copy row indices by paddingY
		for (let i = 0; i < lines.length; i++) {
			const padded = ' '.repeat(this.paddingX) + lines[i] + ' '.repeat(this.paddingX);
			paddedLines.push(padded);
			if (codeCopyRows.has(i)) {
			  const paddedRow = i + this.paddingY;
			  codeCopyRows.delete(i);
			  codeCopyRows.add(paddedRow);
			  const code = codeRowToCode.get(i);
			  if (code) codeRowToCode.set(paddedRow, code);
			}
		}

		// Bottom padding
		for (let i = 0; i < this.paddingY; i++) {
			paddedLines.push(' '.repeat(width));
		}

		this.cache = {
			width,
			height: paddedLines.length,
			lines: paddedLines,
			codeCopyRows,
			codeRowToCode,
		};

		return paddedLines;
	}

	clearCache(): void {
		this.cache = undefined;
	}

	/** Get code for copy button at given padded row index (in cached lines) */
	getCodeAtCopyRow(row: number): string | null {
		return this.cache?.codeRowToCode?.get(row) ?? null;
	}

	/** Check if a padded row contains a copy hint */
	hasCopyHint(row: number): boolean {
		return this.cache?.codeCopyRows?.has(row) ?? false;
	}

	/** Handle mouse click: if click on a copy hint row, return code to copy */
	handleMouse?(event: { row: number; col: number }): void {
		if (this.hasCopyHint(event.row)) {
			const code = this.getCodeAtCopyRow(event.row);
			if (code) {
				try {
					// Emit an event or use global? We'll store the code to be copied by parent
					this._clickedCode = code;
				} catch {}
			}
		}
	}

	/** For internal use: get and clear clicked code after copy */
	private _clickedCode: string | null = null;
	popAndGetClickedCode(): string | null {
		const code = this._clickedCode;
		this._clickedCode = null;
		return code;
	}

	/** Flatten highlight.js tokens into simple {type, content} array */
	private flattenTokens(tokens: any[]): { type: string; content: string }[] {
		const result: { type: string; content: string }[] = [];
		const visit = (toks: any[]) => {
			for (const token of toks) {
				if (typeof token === 'string') {
					result.push({ type: 'text', content: token });
				} else if (token.type && typeof token.content === 'string') {
					result.push({ type: token.type, content: token.content });
				} else if (token.children) {
					visit(token.children);
				}
			}
		};
		visit(tokens);
		return result;
	}

	/** Get ANSI color for token type */
	private getTokenColor(type: string): string {
		// Map token types to ANSI colors
		const colors: Record<string, string> = {
			keyword: '\x1b[35m', // magenta
			string: '\x1b[32m', // green
			comment: '\x1b[2;33m', // dim yellow
			number: '\x1b[34m', // blue
			function: '\x1b[36m', // cyan
			class: '\x1b[36m',
			title: '\x1b[1;36m', // bold cyan
			built_in: '\x1b[33m', // yellow
			literal: '\x1b[36m',
			type: '\x1b[36m',
			tag: '\x1b[31m', // red
			attribute: '\x1b[36m',
			value: '\x1b[32m',
			default: '\x1b[0m',
		};
		// Extract base type (before any dot)
		const baseType = type.split('.')[0];
		return colors[baseType] || colors.default;
	}

	/** Highlight code using highlight.js and return lines with ANSI codes */
	private highlightCode(code: string, lang?: string): string[] {
		// If no language or language not supported, return plain
		if (!lang || !hljs.getLanguage(lang)) {
			return code.split('\n');
		}
		try {
			const result = hljs.highlight(code, { language: lang, ignoreIllegals: true }) as any;
			const tokens = result.tokens || [];
			const flat = this.flattenTokens(tokens);
			// Build lines preserving newlines
			const lines: string[] = [];
			let currentLine = '';
			for (const token of flat) {
				let content = token.content;
				// Split by newline
				const parts = content.split('\n');
				for (let i = 0; i < parts.length; i++) {
					if (i < parts.length - 1) {
						// This part ends with a newline -> push line
						currentLine += this.getTokenColor(token.type) + parts[i];
						lines.push(currentLine + '\x1b[0m'); // reset at end of line
						currentLine = '';
					} else {
						// Last part, no newline
						currentLine += this.getTokenColor(token.type) + parts[i];
					}
				}
			}
			if (currentLine) {
				lines.push(currentLine + '\x1b[0m');
			}
			// Add language label as a dim comment line at top if language known
			if (lang) {
			  const label = '\x1b[2m// ' + lang.toUpperCase() + '\x1b[0m';
			  lines.unshift(label);
			}
			// If code ends with newline, highlight adds empty line, we keep it
			return lines;
		} catch (e) {
			// Fallback to plain
			return code.split('\n');
		}
	}

	private renderMarkdown(content: string, width: number): string[] {
		const { lines } = this.renderMarkdownWithCodeBlocks(content, width);
		return lines;
	}

	/** Render markdown and also return code blocks info */
	private renderMarkdownWithCodeBlocks(content: string, width: number): { lines: string[]; codeBlocks: Array<{ code: string }> } {
		const lines: string[] = [];
		const codeBlocks: Array<{ code: string }> = [];
		const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

		// Split content by code blocks first to preserve them
		const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];
		let lastIndex = 0;
		let match;
		while ((match = codeBlockRegex.exec(content)) !== null) {
			if (match.index > lastIndex) {
				parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
			}
			parts.push({ type: 'code', content: match[2], lang: match[1] || '' });
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < content.length) {
			parts.push({ type: 'text', content: content.slice(lastIndex) });
		}

		// Process each part
		for (const part of parts) {
			if (part.type === 'code') {
				// Store code block content for copy
				codeBlocks.push({ code: part.content });
				// Render code block with borders
				const codeLines = this.highlightCode(part.content, part.lang);
				const contentWidth = width - 4;
				lines.push('┌' + '─'.repeat(width - 2) + '┐');
				for (const codeLine of codeLines) {
					const lineVisWidth = visibleWidth(codeLine);
					let displayLine = codeLine;
					if (lineVisWidth > contentWidth) {
						displayLine = this.truncateLineByWidth(codeLine, contentWidth);
					} else if (lineVisWidth < contentWidth) {
						const pad = ' '.repeat(contentWidth - lineVisWidth);
						displayLine = codeLine + pad;
					}
					lines.push('│ ' + displayLine + ' │');
				}
				lines.push('└' + '─'.repeat(width - 2) + '┘');
				continue;
			}

			// Text part
			const paragraphs = part.content.split(/\n\s*\n/);
			for (let para of paragraphs) {
				const paraLines = para.split('\n');
				for (let line of paraLines) {
					if (line.startsWith('# ')) {
						lines.push(this.styleHeading(line.slice(2), width, 1));
						continue;
					}
					if (line.startsWith('## ')) {
						lines.push(this.styleHeading(line.slice(3), width, 2));
						continue;
					}
					if (line.startsWith('### ')) {
						lines.push(this.styleHeading(line.slice(4), width, 3));
						continue;
					}
					if (line.match(/^[-*_]{3,}$/)) {
						lines.push('─'.repeat(width));
						continue;
					}
					if (line.match(/^[-*+] /)) {
						line = '• ' + line.slice(2);
					}
					const wrapped = wrapText(line, width);
					for (const wrappedLine of wrapped) {
						lines.push(this.styleInline(wrappedLine));
					}
				}
				lines.push(''); // blank line between paragraphs
			}
		}

		return { lines, codeBlocks };
	}

	/** Truncate a line with ANSI codes to a visible width */
	private truncateLineByWidth(line: string, maxVisibleWidth: number): string {
		let visibleCount = 0;
		let result = '';
		let inEscape = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '\x1b') {
				inEscape = true;
				result += ch;
				continue;
			}
			if (inEscape) {
				result += ch;
				if (ch === 'm') {
					inEscape = false;
				}
				continue;
			}
			// Count visible char
			visibleCount++;
			if (visibleCount > maxVisibleWidth) {
				break;
			}
			result += ch;
		}
		// Append reset if cut in middle of colored text
		if (inEscape || visibleCount >= maxVisibleWidth) {
			result += '\x1b[0m';
		}
		return result;
	}

	private styleHeading(text: string, width: number, level: number): string {
		const line = text.padEnd(width);
		switch (level) {
			case 1:
				return '\x1b[1;36m' + line + '\x1b[0m'; // bold cyan
			case 2:
				return '\x1b[1;34m' + line + '\x1b[0m'; // bold blue
			case 3:
				return '\x1b[1;33m' + line + '\x1b[0m'; // bold yellow
			default:
				return line;
		}
	}

	private styleInline(text: string): string {
		// Bold **text**
		let result = text.replace(/\*\*(.*?)\*\*/g, '\x1b[1m$1\x1b[22m');
		// Italic *text* (but not **)
		result = result.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '\x1b[3m$1\x1b[23m');
		// Code `text`
		result = result.replace(/`(.*?)`/g, '\x1b[32m$1\x1b[39m'); // green
		return result;
	}
}
