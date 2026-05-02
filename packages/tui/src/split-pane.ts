/**
 * SplitPane layout manager
 * Divides space between two children with a draggable divider.
 * Supports horizontal (left/right) and vertical (top/bottom) orientation.
 */

import type { UIElement, RenderContext, InteractiveElement, KeyEvent } from './components/base.js';
import { CURSOR_MARKER } from './components/base.js';
import { matchesKey } from './components/keys.js';

export type SplitOrientation = 'horizontal' | 'vertical';

export interface SplitPaneOptions {
  first: UIElement;
  second: UIElement;
  orientation?: SplitOrientation;
  /** Initial position of divider as a fraction (0-1) from top/left */
  initialPosition?: number;
  /** Minimum size for the first pane (cells) */
  minFirst?: number;
  /** Minimum size for the second pane (cells) */
  minSecond?: number;
}

export class SplitPane implements UIElement, InteractiveElement {
  public isFocused = false;
  private orientation: SplitOrientation;
  private position: number; // in cells (pixels? we'll use terminal cells) between 0 and total
  private minFirst: number;
  private minSecond: number;
  private totalSize: number = 0; // width or height of container
  private dragging = false;
  private first: UIElement;
  private second: UIElement;

  constructor(options: SplitPaneOptions) {
    this.first = options.first;
    this.second = options.second;
    this.orientation = options.orientation ?? 'horizontal';
    this.minFirst = options.minFirst ?? 3;
    this.minSecond = options.minSecond ?? 3;
    this.position = 0; // will be set on first draw based on initialPosition
    this.initialPosition = options.initialPosition ?? 0.5;
  }
  private initialPosition: number;

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const width = context.width;
    const height = context.height;

    // Determine total size and position in cells
    const isHorizontal = this.orientation === 'horizontal';
    const total = isHorizontal ? width : height;
    this.totalSize = total;

    // Initialize position on first draw
    if (this.position === 0) {
      this.position = Math.floor(this.initialPosition * total);
    }

    // Clamp position respecting mins
    const maxPos = total - this.minSecond;
    const minPos = this.minFirst;
    if (this.position > maxPos) this.position = maxPos;
    if (this.position < minPos) this.position = minPos;

    // Render first pane
    const firstSize = isHorizontal ? this.position : height;
    const firstCtx: RenderContext = isHorizontal ? { width: this.position, height } : { width, height: this.position };
    const firstLines = this.first.draw(firstCtx);

    // Render second pane
    const secondStart = this.position + 1; // divider occupies one cell
    const secondSize = isHorizontal ? total - this.position - 1 : height - this.position - 1;
    const secondCtx: RenderContext = isHorizontal ? { width: total - this.position - 1, height } : { width, height: secondSize };
    const secondLines = this.second.draw(secondCtx);

    // Merge lines
    if (isHorizontal) {
      // For each row, combine left part and right part
      for (let row = 0; row < height; row++) {
        const left = (firstLines[row] ?? '').padEnd(this.position);
        const divider = this.dragging ? CURSOR_MARKER : '┼';
        const right = (secondLines[row] ?? '').padEnd(total - this.position - 1);
        lines.push(left + divider + right);
      }
    } else {
      // Vertical: first pane on top, then divider row, then second pane
      for (let row = 0; row < this.position; row++) {
        lines.push(firstLines[row] ?? '');
      }
      // Divider line
      const dividerLine = Array(width).fill('─').join('');
      if (this.dragging) {
        // Replace a segment with cursor marker
        const mid = Math.floor(width / 2);
        const arr = dividerLine.split('');
        arr[mid] = CURSOR_MARKER;
        lines.push(arr.join(''));
      } else {
        lines.push(dividerLine);
      }
      for (let row = 0; row < secondSize; row++) {
        lines.push(secondLines[row] ?? '');
      }
    }

    return lines;
  }

  handleKey(key: KeyEvent): void {
    // Move divider with arrow keys
    const delta = matchesKey(key.raw, 'right') || matchesKey(key.raw, 'down') ? 1 :
                  matchesKey(key.raw, 'left') || matchesKey(key.raw, 'up') ? -1 : 0;
    if (delta !== 0) {
      this.position = Math.max(this.minFirst, Math.min(this.totalSize - this.minSecond, this.position + delta));
      this.first.clearCache?.();
      this.second.clearCache?.();
    }
  }

  clearCache(): void {
    this.first.clearCache?.();
    this.second.clearCache?.();
  }
}
