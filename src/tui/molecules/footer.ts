/**
 * Footer Component
 * Status bar at bottom of terminal
 */
import type { UIElement, RenderContext, UITheme } from '../core/base';
import { visibleWidth } from '../core/internal-utils';

export interface FooterItem {
  /** Key/shortcut hint */
  key?: string;
  /** Display text */
  label: string;
  /** Optional explicit ANSI color for label (overrides theme) */
  colorAnsi?: string;
  /** Handler when item is activated */
  onActivate?: () => void;
}

export interface FooterTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  keyColor: (s: string) => string;
  separator: string;
}

export const footerDefaultTheme: FooterTheme = {
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
  /** Theme styling (local override) */
  theme?: Partial<FooterTheme>;
  /** Height in lines (default: 1) */
  height?: number;
}

/**
 * Footer - status bar component
 */
export class Footer implements UIElement {
  public leftItems: FooterItem[];
  public rightItems: FooterItem[];
  private theme: FooterTheme;
  private height: number;
  private cachedLines?: string[];
  private cachedWidth?: number;
  // Dynamic status and working message
  private statusMap = new Map<string, string>();
  private workingMessage: string | null = null;

  constructor(options: FooterOptions = {}) {
    this.leftItems = options.leftItems ?? [];
    this.rightItems = options.rightItems ?? [];
    this.theme = { ...footerDefaultTheme, ...options.theme };
    this.height = Math.max(1, options.height ?? 1);
  }

  setItems(left?: FooterItem[], right?: FooterItem[]): void {
    if (left) this.leftItems = left;
    if (right) this.rightItems = right;
    this.clearCache();
  }

  clearCache(): void {
    this.cachedLines = undefined;
    this.cachedWidth = undefined;
  }

  setStatus(key: string, text: string): void {
    this.statusMap.set(key, text);
    this.clearCache();
  }

  clearStatus(key?: string): void {
    if (key) this.statusMap.delete(key);
    else this.statusMap.clear();
    this.clearCache();
  }

  setWorkingMessage(message: string | null): void {
    this.workingMessage = message;
    this.clearCache();
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    if (this.cachedLines && this.cachedWidth === width) return this.cachedLines;

    const lines: string[] = [];

    // Adapter functions: use global context.theme if available, else local theme
    const fgColor = (s: string): string => {
      if (context.theme?.textColor) {
        return context.theme.textColor + s + '\x1b[0m';
      }
      return this.theme.fgColor(s);
    };
    const keyCol = (s: string): string => {
      if (context.theme?.accentColor) {
        return context.theme.accentColor + s + '\x1b[0m';
      }
      return this.theme.keyColor(s);
    };
    const bgCol = (s: string): string => {
      if (context.theme?.bgColor) {
        return context.theme.bgColor + s + '\x1b[0m';
      }
      return this.theme.bgColor(s);
    };

    // Build left side
    const leftParts: string[] = [];
    if (this.workingMessage) leftParts.push(fgColor(this.workingMessage));
    for (const item of this.leftItems) {
      const kp = item.key ? keyCol(item.key) : '';
      const lp = item.colorAnsi ? item.colorAnsi + item.label + '\x1b[0m' : fgColor(item.label);
      leftParts.push(kp ? `${kp}${this.theme.separator}${lp}` : lp);
    }
    const leftStr = leftParts.join(this.theme.separator);

    // Build right side
    const rightParts: string[] = [];
    for (const item of this.rightItems) {
      const kp = item.key ? keyCol(item.key) : '';
      const lp = item.colorAnsi ? item.colorAnsi + item.label + '\x1b[0m' : fgColor(item.label);
      rightParts.push(kp ? `${kp}${this.theme.separator}${lp}` : lp);
    }
    for (const text of this.statusMap.values()) rightParts.push(fgColor(text));
    const rightStr = rightParts.join(this.theme.separator);

    // Combine with padding
    const lw = visibleWidth(leftStr), rw = visibleWidth(rightStr), sw = visibleWidth(this.theme.separator);
    let line: string;
    if (lw + rw + sw * 2 < width) line = leftStr + ' '.repeat(width - lw - rw) + rightStr;
    else if (lw < width) line = leftStr + ' '.repeat(width - lw);
    else line = leftStr.substring(0, width);

    lines.push(bgCol(line));
    for (let i = 1; i < this.height; i++) lines.push(bgCol(' '.repeat(width)));

    this.cachedLines = lines;
    this.cachedWidth = width;
    return lines;
  }
}
