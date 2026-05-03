/**
 * TruncatedText Component
 * Text component that truncates content to fit viewport width
 * Supports ANSI codes and optional padding
 */
import type { UIElement, RenderContext } from './base.js';
import { stripAnsi, truncateText, visibleWidth, wrapText } from './internal-utils.js';

export interface TruncatedTextOptions {
  /** Text content (can contain ANSI codes) */
  text: string;
  /** Horizontal padding (left/right) */
  paddingX?: number;
  /** Vertical padding (top/bottom) */
  paddingY?: number;
  /** Truncation indicator (default: '...') */
  ellipsis?: string;
  /** Whether to wrap to multiple lines if text is too long */
  wrap?: boolean;
}

/**
 * TruncatedText renders text that fits within available width.
 * Handles ANSI codes correctly and supports optional wrapping.
 * 
 * @example
 * // Single line with ellipsis
 * const text = new TruncatedText({ text: longText, ellipsis: '…' });
 * 
 * @example
 * // With padding
 * const text = new TruncatedText({ text: 'Hello', paddingX: 2, paddingY: 1 });
 * 
 * @example
 * // Wrapped multi-line
 * const text = new TruncatedText({ text: longText, wrap: true });
 */
export class TruncatedText implements UIElement {
  private text: string;
  private paddingX: number;
  private paddingY: number;
  private ellipsis: string;
  private wrap: boolean;

  constructor(options: TruncatedTextOptions) {
    this.text = options.text ?? '';
    this.paddingX = Math.max(0, options.paddingX ?? 0);
    this.paddingY = Math.max(0, options.paddingY ?? 0);
    this.ellipsis = options.ellipsis ?? '...';
    this.wrap = options.wrap ?? false;
  }

  /**
   * Update displayed text
   */
  setText(text: string): void {
    this.text = text ?? '';
  }

  /**
   * Get current text
   */
  getText(): string {
    return this.text;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const result: string[] = [];

    // Add vertical padding top
    for (let i = 0; i < this.paddingY; i++) {
      result.push(' '.repeat(width));
    }

    const availableWidth = Math.max(1, width - this.paddingX * 2);

    if (this.wrap) {
      // Wrap text to multiple lines
      const wrapped = wrapText(this.text, availableWidth);
      for (const line of wrapped) {
        result.push(this.padLine(line, width));
      }
    } else {
      // Single line with truncation
      const firstLine = this.text.split('\n')[0] ?? '';
      let displayText = firstLine;

      // Check if truncation is needed
      const textWidth = visibleWidth(firstLine);
      if (textWidth > availableWidth) {
        displayText = truncateText(firstLine, availableWidth - visibleWidth(this.ellipsis)) + this.ellipsis;
      }

      result.push(this.padLine(displayText, width));
    }

    // Add vertical padding bottom
    for (let i = 0; i < this.paddingY; i++) {
      result.push(' '.repeat(width));
    }

    return result;
  }

  /**
   * Pad a line with horizontal padding
   */
  private padLine(text: string, totalWidth: number): string {
    const availableWidth = Math.max(0, totalWidth - this.paddingX * 2);
    
    // Truncate if still too wide (safety check)
    let displayText = text;
    if (visibleWidth(text) > availableWidth) {
      displayText = truncateText(text, availableWidth - visibleWidth(this.ellipsis)) + this.ellipsis;
    }

    const leftPad = ' '.repeat(this.paddingX);
    const rightPad = ' '.repeat(this.paddingX);
    const padded = leftPad + displayText + rightPad;

    // Ensure exact width
    const currentWidth = visibleWidth(padded);
    if (currentWidth < totalWidth) {
      return padded + ' '.repeat(totalWidth - currentWidth);
    }
    if (currentWidth > totalWidth) {
      return truncateText(padded, totalWidth);
    }
    return padded;
  }

  clearCache(): void {
    // No cached state
  }
}
