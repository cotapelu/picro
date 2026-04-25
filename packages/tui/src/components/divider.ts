/**
 * Divider Component
 * Visual separation with optional label
 */
import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth, truncateText } from '../utils.js';

export type DividerStyle = 'single' | 'double' | 'thick' | 'dashed' | 'hidden';

export interface DividerTheme {
  lineColor: (s: string) => string;
  labelColor: (s: string) => string;
  dimColor: (s: string) => string;
}

const defaultTheme: DividerTheme = {
  lineColor: (s) => `\x1b[90m${s}\x1b[0m`,
  labelColor: (s) => `\x1b[37m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

const chars: Record<DividerStyle, { horizontal: string; vertical: string }> = {
  single: { horizontal: '─', vertical: '│' },
  double: { horizontal: '═', vertical: '║' },
  thick: { horizontal: '━', vertical: '┃' },
  dashed: { horizontal: '╌', vertical: '╎' },
  hidden: { horizontal: ' ', vertical: ' ' },
};

export interface DividerOptions {
  /** Optional label centered on divider */
  label?: string;
  /** Line style */
  style?: DividerStyle;
  /** Direction */
  direction?: 'horizontal' | 'vertical';
  /** Custom width (default: 1 for vertical, context width for horizontal) */
  width?: number;
  /** Theme */
  theme?: Partial<DividerTheme>;
  /** Padding around label */
  labelPadding?: number;
}

/**
 * Divider - visual separation with optional label
 * 
 * @example
 * // Simple horizontal divider
 * const div = new Divider({ style: 'single' });
 * 
 * // Labeled divider
 * const div = new Divider({ label: 'Section A', style: 'double' });
 * 
 * // Vertical divider
 * const div = new Divider({ direction: 'vertical', height: 10 });
 */
export class Divider implements UIElement {
  private label?: string;
  private style: DividerStyle;
  private direction: 'horizontal' | 'vertical';
  private requestedWidth: number;
  private theme: DividerTheme;
  private labelPadding: number;

  constructor(options: DividerOptions = {}) {
    this.label = options.label;
    this.style = options.style ?? 'single';
    this.direction = options.direction ?? 'horizontal';
    this.requestedWidth = options.width ?? 0;
    this.theme = { ...defaultTheme, ...options.theme };
    this.labelPadding = options.labelPadding ?? 2;
  }

  /**
   * Update label
   */
  setLabel(label: string | undefined): void {
    this.label = label;
  }

  /**
   * Update style
   */
  setStyle(style: DividerStyle): void {
    this.style = style;
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    if (this.direction === 'horizontal') {
      return this.drawHorizontal(context.width);
    } else {
      return this.drawVertical(context.height);
    }
  }

  private drawHorizontal(width: number): string[] {
    const char = chars[this.style].horizontal;
    
    if (!this.label) {
      // Simple divider
      const line = this.theme.lineColor(char.repeat(width));
      return [line];
    }

    // Labeled divider
    const labelText = ` ${this.label} `;
    const pad = this.labelPadding;
    const totalLabelWidth = visibleWidth(labelText) + pad * 2;
    
    if (totalLabelWidth >= width - 4) {
      // Label too wide, truncate
      const available = width - 4;
      const truncated = truncateText(this.label, available, '…');
      const line = this.theme.lineColor(char + ' ' + truncated + ' ' + char);
      return [line];
    }

    const remaining = width - totalLabelWidth;
    const leftLen = Math.floor(remaining / 2);
    const rightLen = remaining - leftLen;

    const leftPart = char.repeat(leftLen);
    const rightPart = char.repeat(rightLen);
    const labelPart = ' '.repeat(pad) + this.theme.labelColor(labelText) + ' '.repeat(pad);

    const line = this.theme.lineColor(leftPart) + labelPart + this.theme.lineColor(rightPart);
    return [line];
  }

  private drawVertical(height: number): string[] {
    const char = chars[this.style].vertical;
    const lines: string[] = [];
    
    for (let i = 0; i < height; i++) {
      lines.push(this.theme.lineColor(char));
    }
    
    return lines;
  }
}

/**
 * Create a horizontal divider
 */
export function horizontalDivider(label?: string, style: DividerStyle = 'single'): Divider {
  return new Divider({ label, style, direction: 'horizontal' });
}

/**
 * Create a vertical divider
 */
export function verticalDivider(height: number, style: DividerStyle = 'single'): Divider {
  return new Divider({ style, direction: 'vertical', width: 1 });
}

/**
 * Section divider with title
 */
export function sectionDivider(title: string): Divider {
  return new Divider({
    label: title,
    style: 'thick',
    direction: 'horizontal',
  });
}

/**
 * Double line divider for major sections
 */
export function doubleDivider(label?: string): Divider {
  return new Divider({ label, style: 'double', direction: 'horizontal' });
}
