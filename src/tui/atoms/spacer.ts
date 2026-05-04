/**
 * Spacer Component
 * Renders empty lines as spacing between elements
 */
import type { UIElement, RenderContext } from './base';

export interface SpacerOptions {
  lines?: number;
}

/**
 * Spacer component that renders empty lines
 * @example
 * const spacer = new Spacer({ lines: 2 });
 * container.append(spacer);
 */
export class Spacer implements UIElement {
  private lines: number;

  constructor(options: SpacerOptions = {}) {
    this.lines = options.lines ?? 1;
  }

  /**
   * Update the number of empty lines
   */
  setLines(lines: number): void {
    this.lines = Math.max(0, lines);
  }

  /**
   * Get current number of lines
   */
  getLines(): number {
    return this.lines;
  }

  draw(_context: RenderContext): string[] {
    return Array(this.lines).fill('');
  }

  clearCache(): void {
    // No cached state
  }
}
