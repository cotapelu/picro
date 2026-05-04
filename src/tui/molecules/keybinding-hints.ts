import type { UIElement, RenderContext } from '../atoms/base';
import { visibleWidth } from '../atoms/internal-utils';

export interface KeyBinding {
  /** Key combination string, e.g. 'Ctrl+S', 'Cmd+Shift+P' */
  key: string;
  /** Description of action */
  action: string;
}

export interface KeybindingHintsOptions {
  bindings: KeyBinding[];
  /** Maximum width per column (default 20) */
  columnWidth?: number;
  /** Spacing between columns (default 2) */
  spacing?: number;
  /** Color for key text */
  keyColor?: string;
  /** Color for description */
  actionColor?: string;
}

/**
 * KeybindingHints - displays keyboard shortcuts in a grid
 * Commonly used in footer or help panel.
 */
export class KeybindingHints implements UIElement {
  private bindings: KeyBinding[];
  private columnWidth: number;
  private spacing: number;
  private keyColor: string;
  private actionColor: string;

  constructor(options: KeybindingHintsOptions) {
    this.bindings = options.bindings;
    this.columnWidth = options.columnWidth ?? 20;
    this.spacing = options.spacing ?? 2;
    this.keyColor = options.keyColor ?? '\x1b[33m'; // yellow
    this.actionColor = options.actionColor ?? '\x1b[37m'; // white
  }

  setBindings(bindings: KeyBinding[]): void {
    this.bindings = bindings;
    this.clearCache();
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const width = context.width;
    const colWidth = this.columnWidth;
    const spacing = this.spacing;
    const cols = Math.max(1, Math.floor((width + spacing) / (colWidth + spacing)));

    const lines: string[] = [];
    let currentLine = '';
    let currentCol = 0;

    for (let i = 0; i < this.bindings.length; i++) {
      const b = this.bindings[i]!;
      const keyPadded = b.key.padEnd(colWidth);
      const bindingStr = this.keyColor + keyPadded + '\x1b[0m' + this.actionColor + b.action + '\x1b[0m';

      if (currentCol === 0) {
        currentLine = bindingStr;
      } else {
        currentLine += ' '.repeat(spacing) + bindingStr;
      }
      currentCol++;

      if (currentCol >= cols && i < this.bindings.length - 1) {
        lines.push(currentLine);
        currentLine = '';
        currentCol = 0;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Pad lines to full width
    return lines.map(line => {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, '').length;
      if (visible < width) {
        return line + ' '.repeat(width - visible);
      }
      return line;
    });
  }
}
