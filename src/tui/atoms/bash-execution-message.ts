import type { UIElement, RenderContext } from '../atoms/base';
import { Text } from '../atoms/text';
import { wrapText, visibleWidth } from '../atoms/internal-utils';

export interface BashExecutionMessageOptions {
  command: string;
  output?: string;
  exitCode?: number | null;
  isRunning?: boolean;
  isCancelled?: boolean;
  expanded?: boolean;
  truncationInfo?: {
    hiddenLines?: number;
    truncated?: boolean;
    fullPath?: string;
  };
  padding?: number;
}

/**
 * BashExecutionMessage - displays bash command execution with streaming output
 * Shows command header, output with syntax highlighting, and status
 */
export class BashExecutionMessage implements UIElement {
  private previewLines = 20;

  constructor(private opts: BashExecutionMessageOptions = { command: '' }) {}

  setOutput(output: string): void {
    this.opts = { ...this.opts, output };
  }

  setComplete(exitCode: number | null, cancelled?: boolean): void {
    this.opts = { ...this.opts, exitCode, isCancelled: cancelled, isRunning: false };
  }

  setExpanded(expanded: boolean): void {
    this.opts = { ...this.opts, expanded: expanded };
  }

  appendOutput(chunk: string): void {
    const current = this.opts.output ?? '';
    this.opts = { ...this.opts, output: current + chunk };
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const padSize = this.opts.padding ?? 1;
    const innerWidth = Math.max(1, width - padSize * 2);
    const lines: string[] = [];

    // Determine color based on status
    let statusColor = '\x1b[36m'; // cyan for running
    if (this.opts.isCancelled) {
      statusColor = '\x1b[33m'; // yellow for cancelled
    } else if (this.opts.exitCode !== undefined && this.opts.exitCode !== null && this.opts.exitCode !== 0) {
      statusColor = '\x1b[31m'; // red for error
    } else if (!this.opts.isRunning) {
      statusColor = '\x1b[32m'; // green for success
    }

    // Top border
    const border = '─'.repeat(innerWidth);
    lines.push(' '.repeat(padSize) + '\x1b[90m' + border + '\x1b[0m');

    // Command header
    const header = `$ ${this.opts.command}`;
    lines.push(' '.repeat(padSize) + statusColor + '\x1b[1m' + header + '\x1b[0m');

    // Output
    if (this.opts.output) {
      const outputLines = this.opts.output.split('\n');
      const displayLines = this.opts.expanded
        ? outputLines
        : outputLines.slice(-this.previewLines);

      const hiddenCount = outputLines.length - displayLines.length;

      if (displayLines.length > 0) {
        // Add output lines with dim color
        const dimOutput = displayLines
          .map(line => '\x1b[90m' + line + '\x1b[0m')
          .join('\n');
        lines.push(' '.repeat(padSize) + dimOutput);
      }

      // Show hidden lines indicator
      if (hiddenCount > 0 && !this.opts.expanded) {
        lines.push(
          ' '.repeat(padSize) +
          '\x1b[90m' +
          `... ${hiddenCount} more lines (press Enter to expand)` +
          '\x1b[0m'
        );
      } else if (hiddenCount > 0 && this.opts.expanded) {
        lines.push(
          ' '.repeat(padSize) +
          '\x1b[90m' +
          `(press Enter to collapse)` +
          '\x1b[0m'
        );
      }
    }

    // Status line
    const statusParts: string[] = [];

    if (this.opts.isRunning) {
      statusParts.push('\x1b[90mRunning...\x1b[0m');
    } else if (this.opts.isCancelled) {
      statusParts.push('\x1b[33m(cancelled)\x1b[0m');
    } else if (this.opts.exitCode !== undefined && this.opts.exitCode !== null) {
      if (this.opts.exitCode === 0) {
        statusParts.push('\x1b[32m✓ Done\x1b[0m');
      } else {
        statusParts.push(`\x1b[31m✗ Exit ${this.opts.exitCode}\x1b[0m`);
      }
    }

    // Truncation warning
    if (this.opts.truncationInfo?.truncated && this.opts.truncationInfo.fullPath) {
      statusParts.push(
        '\x1b[33mOutput truncated. Full output: ' + this.opts.truncationInfo.fullPath + '\x1b[0m'
      );
    }

    if (statusParts.length > 0) {
      lines.push(' '.repeat(padSize) + statusParts.join(' '));
    }

    // Bottom border
    lines.push(' '.repeat(padSize) + '\x1b[90m' + border + '\x1b[0m');

    // Ensure full width for all lines
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
