/**
 * Footer Component
 * Status bar at bottom of terminal
 */
import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth } from '../utils.js';

export interface FooterItem {
  /** Key/shortcut hint */
  key?: string;
  /** Display text */
  label: string;
  /** Handler when item is activated */
  onActivate?: () => void;
}

export interface FooterTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  keyColor: (s: string) => string;
  separator: string;
}

const defaultTheme: FooterTheme = {
  bgColor: (s) => `\x1b[48;5;235m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  keyColor: (s) => `\x1b[33m${s}\x1b[0m`,
  separator: ' │ ',
};

export interface FooterOptions {
  /** Items to display from left */
  leftItems?: FooterItem[];
  /** Items to display on right */
  rightItems?: FooterItem[];
  /** Theme styling */
  theme?: Partial<FooterTheme>;
  /** Height in lines (default: 1) */
  height?: number;
}

/**
 * Footer - status bar component
 * 
 * Displays shortcuts and status at bottom of terminal.
 * Common pattern in terminal UIs.
 * 
 * @example
 * const footer = new Footer({
 *   leftItems: [
 *     { key: 'Tab', label: 'Switch' },
 *     { key: 'Enter', label: 'Select' },
 *   ],
 *   rightItems: [
 *     { label: 'Ready' },
 *   ],
 *   theme: {
 *     bgColor: (s) => `\x1b[44m${s}\x1b[0m`,
 *   }
 * });
 */
export class Footer implements UIElement {
  public leftItems: FooterItem[];
  public rightItems: FooterItem[];
  private theme: FooterTheme;
  private height: number;
  private cachedLines?: string[];
  private cachedWidth?: number;

  constructor(options: FooterOptions = {}) {
    this.leftItems = options.leftItems ?? [];
    this.rightItems = options.rightItems ?? [];
    this.theme = { ...defaultTheme, ...options.theme };
    this.height = Math.max(1, options.height ?? 1);
  }

  /**
   * Update footer items
   */
  setItems(left?: FooterItem[], right?: FooterItem[]): void {
    if (left) this.leftItems = left;
    if (right) this.rightItems = right;
    this.clearCache();
  }

  clearCache(): void {
    this.cachedLines = undefined;
    this.cachedWidth = undefined;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    
    // Use cache
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    
    // Format left side
    const leftParts: string[] = [];
    for (const item of this.leftItems) {
      const keyPart = item.key ? this.theme.keyColor(item.key) : '';
      const labelPart = this.theme.fgColor(item.label);
      if (keyPart) {
        leftParts.push(`${keyPart}${this.theme.separator}${labelPart}`);
      } else {
        leftParts.push(labelPart);
      }
    }
    const leftStr = leftParts.join(this.theme.separator);
    
    // Format right side
    const rightParts: string[] = [];
    for (const item of this.rightItems) {
      const keyPart = item.key ? this.theme.keyColor(item.key) : '';
      const labelPart = this.theme.fgColor(item.label);
      if (keyPart) {
        rightParts.push(`${keyPart}${this.theme.separator}${labelPart}`);
      } else {
        rightParts.push(labelPart);
      }
    }
    const rightStr = rightParts.join(this.theme.separator);
    
    // Combine with padding
    const leftWidth = visibleWidth(leftStr);
    const rightWidth = visibleWidth(rightStr);
    const sepWidth = visibleWidth(this.theme.separator);
    
    let line: string;
    if (leftWidth + rightWidth + sepWidth * 2 < width) {
      // Both fit
      const paddingSpaces = width - leftWidth - rightWidth;
      const pad = ' '.repeat(paddingSpaces);
      line = leftStr + pad + rightStr;
    } else if (leftWidth < width) {
      // Only left fits
      const pad = ' '.repeat(width - leftWidth);
      line = leftStr + pad;
    } else {
      // Truncate
      line = leftStr.substring(0, width);
    }
    
    // Apply background
    const styled = this.theme.bgColor(line);
    lines.push(styled);
    
    // Add empty lines if height > 1
    for (let i = 1; i < this.height; i++) {
      lines.push(this.theme.bgColor(' '.repeat(width)));
    }

    this.cachedLines = lines;
    this.cachedWidth = width;
    return lines;
  }
}
