import type { UIElement, RenderContext } from './base.js';
import { Text } from './text.js';

export interface ToolMessageOptions {
  toolName: string;
  input?: string; // JSON stringified args
  output?: string; // result
  error?: boolean;
  duration?: number; // ms
  padding?: number;
}

/**
 * ToolMessage - displays tool execution info
 * Rendered as a bordered block with tool name and result.
 */
export class ToolMessage implements UIElement {
  constructor(private opts: ToolMessageOptions = { toolName: '' }) {}

  setResult(output: string, duration?: number): void {
    this.opts = { ...this.opts, output, duration };
  }

  setError(error: string): void {
    this.opts = { ...this.opts, output: error, error: true };
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const padSize = this.opts.padding ?? 1;
    const innerWidth = Math.max(1, width - padSize * 2);

    const lines: string[] = [];

    // Header: Tool name + optional duration
    const headerParts = [`[${this.opts.toolName}]`];
    if (this.opts.duration !== undefined) {
      headerParts.push(`${this.opts.duration}ms`);
    }
    const header = headerParts.join(' ');
    const headerColor = this.opts.error ? '\x1b[31m' : '\x1b[36m'; // red for error, cyan for success
    lines.push(' '.repeat(padSize) + headerColor + header + '\x1b[0m');

    // Divider
    const divider = '─'.repeat(innerWidth);
    lines.push(' '.repeat(padSize) + '\x1b[90m' + divider + '\x1b[0m');

    // Content (output)
    if (this.opts.output) {
      const text = new Text(this.opts.output, {
        wrap: true,
        color: this.opts.error ? 'red' : undefined,
      });
      const contentLines = text.draw({ ...context, width: innerWidth });
      lines.push(...contentLines.map(l => ' '.repeat(padSize) + l));
    } else {
      // Empty
      lines.push(' '.repeat(padSize) + '\x1b[90m(no output)\x1b[0m');
    }

    // Ensure total width
    return lines.map(line => {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, '').length;
      if (visible < width) {
        return line + ' '.repeat(width - visible);
      }
      return line;
    });
  }

  clearCache(): void {}
}
