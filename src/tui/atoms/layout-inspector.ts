/**
 * Layout Inspector Component
 * Visual overlay showing terminal layout and component boundaries
 */
import type { UIElement, RenderContext } from './base';

export interface LayoutInfo {
  panels: Array<{ top: number; left: number; width: number; height: number }>;
  scrollTop: number;
  totalBaseLines: number;
  terminalWidth: number;
  terminalHeight: number;
}

export class LayoutInspector implements UIElement {
  constructor(private getLayoutInfo: () => LayoutInfo) {}

  draw(context: RenderContext): string[] {
    const { terminalWidth, terminalHeight, panels, scrollTop, totalBaseLines } = this.getLayoutInfo();
    const width = context.width;
    const height = context.height;

    // Create a blank canvas
    const lines: string[] = Array(height).fill(''.padEnd(width, ' '));

    // Draw outer border (double lines)
    for (let col = 0; col < width; col++) {
      if (col === 0 || col === width - 1) {
        lines[0] = lines[0]!.substring(0, col) + '┌' + lines[0]!.slice(col + 1);
        lines[height - 1] = lines[height - 1]!.substring(0, col) + '└' + lines[height - 1]!.slice(col + 1);
      } else {
        lines[0] = lines[0]!.substring(0, col) + '─' + lines[0]!.slice(col + 1);
        lines[height - 1] = lines[height - 1]!.substring(0, col) + '─' + lines[height - 1]!.slice(col + 1);
      }
    }
    for (let row = 1; row < height - 1; row++) {
      lines[row] = lines[row]!.substring(0, 0) + '│' + lines[row]!.slice(1);
      lines[row] = lines[row]!.substring(0, width - 1) + '│' + lines[row]!.slice(width);
    }
    // Corners
    lines[0] = '┌' + lines[0]!.slice(1, width - 1) + '┐';
    lines[height - 1] = '└' + lines[height - 1]!.slice(1, width - 1) + '┘';

    // Gather stats lines
    const stats: string[] = [];
    stats.push(`Terminal: ${terminalWidth}x${terminalHeight}`);
    stats.push(`Base: ${totalBaseLines} lines, scrollTop=${scrollTop}`);
    stats.push(`Panels: ${panels.length}`);
    if (panels.length > 0) {
      stats.push('Panel regions:');
      panels.forEach((p, i) => {
        stats.push(`  #${i}: t=${p.top} l=${p.left} w=${p.width} h=${p.height}`);
      });
    }

    // Write stats inside the border (starting at row 1)
    for (let i = 0; i < stats.length && 1 + i < height - 1; i++) {
      const line = stats[i];
      const row = 1 + i;
      const maxLen = width - 4;
      const display = line.length <= maxLen ? line : line.substring(0, maxLen) + '…';
      lines[row] = '│ ' + display.padEnd(maxLen) + ' │';
    }

    return lines;
  }

  clearCache(): void {
    // nothing to clear
  }
}
