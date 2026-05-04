/**
 * Debug Overlay Component
 * Shows runtime metrics and state information
 */
import type { UIElement, RenderContext } from './base';

export class DebugOverlay implements UIElement {
  private data: Record<string, string> = {};

  setData(data: Record<string, string>): void {
    this.data = data;
  }

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const width = context.width;
    for (const [key, value] of Object.entries(this.data)) {
      const line = `${key}: ${value}`;
      lines.push(line.length < width ? line : line.slice(0, width));
    }
    return lines;
  }

  clearCache(): void {
    // no cache
  }
}
