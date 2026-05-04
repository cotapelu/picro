/**
 * Animation components for TUI
 * Provides simple visual effects: Blink, Slide
 */

import type { UIElement, RenderContext } from './base';

/**
 * Blink - toggles visibility of its child on a regular interval.
 */
export class Blink implements UIElement {
  private visible = true;
  private timer?: any;

  constructor(
    private child: UIElement,
    private intervalMs: number = 500
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { this.visible = !this.visible; }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.visible = true;
  }

  draw(context: RenderContext): string[] {
    if (!this.visible) return [];
    return this.child.draw(context);
  }

  clearCache(): void {
    this.child.clearCache?.();
  }
}

/**
 * Slide - slides the child horizontally from right to left over a duration.
 * The child appears to enter from the right edge.
 */
export class Slide implements UIElement {
  private startTime = Date.now();

  constructor(
    private child: UIElement,
    private durationMs: number = 300
  ) {}

  draw(context: RenderContext): string[] {
    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(1, elapsed / this.durationMs);
    // Slide from right: start with left padding = width, end at 0
    const leftPad = Math.floor((1 - progress) * context.width);
    const childLines = this.child.draw(context);
    const lines: string[] = [];
    for (const line of childLines) {
      lines.push(' '.repeat(leftPad) + line);
    }
    return lines;
  }

  clearCache(): void {
    this.child.clearCache?.();
  }
}
