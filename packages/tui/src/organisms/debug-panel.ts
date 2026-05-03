import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base.js';
import { visibleWidth } from '../atoms/internal-utils.js';

export interface DebugRoundEvent {
  round: number;
  contextBuildingTime: number;
  memoryRetrievalTime: number;
  llmRequestTime: number;
  toolExecutionTime: number;
  totalRoundTime: number;
}

export interface DebugRunEvent {
  totalRunTime: number;
  totalContextBuildingTime: number;
  totalMemoryRetrievalTime: number;
  totalLLMRequestTime: number;
  totalToolExecutionTime: number;
}

export interface DebugPanelOptions {
  width?: number;
  height?: number;
  showRounds?: boolean; // default true
  showRun?: boolean; // default true
}

/**
 * DebugPanel - displays debug timing metrics in an overlay
 */
export class DebugPanel implements UIElement, InteractiveElement {
  public isFocused = false;
  private roundMetrics: DebugRoundEvent[] = [];
  private runMetric?: DebugRunEvent;
  private options: Required<DebugPanelOptions>;

  constructor(options: DebugPanelOptions = {}) {
    this.options = {
      width: options.width ?? 50,
      height: options.height ?? 15,
      showRounds: options.showRounds ?? true,
      showRun: options.showRun ?? true,
    };
  }

  /**
   * Process debug:round:timing event
   */
  onRoundEvent(event: DebugRoundEvent): void {
    this.roundMetrics.push(event);
    // Keep only last N rounds
    if (this.roundMetrics.length > this.options.height - 5) {
      this.roundMetrics = this.roundMetrics.slice(-(this.options.height - 5));
    }
  }

  /**
   * Process debug:run:timing event
   */
  onRunEvent(event: DebugRunEvent): void {
    this.runMetric = event;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.roundMetrics = [];
    this.runMetric = undefined;
  }

  handleKey?(key: KeyEvent): void {
    // Allow panel to be dismissed with Escape
    if (key.name === 'Escape') {
      // Emitting custom event? For now no-op. Caller should handle.
    }
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const width = Math.min(this.options.width, context.width);
    const lines: string[] = [];

    // Border
    const line = '─'.repeat(width - 2);
    lines.push('┌' + line + '┐');

    // Title
    const title = ' Debug Metrics ';
    const titleLine = this.centerPad(title, width);
    lines.push('│' + titleLine + '│');

    // Divider
    lines.push('├' + line + '┤');

    // Content
    let row = 0;
    const maxRows = this.options.height - 2 - (this.options.showRun ? 3 : 0);

    if (this.options.showRun && this.runMetric) {
      this.addSection(lines, 'Run Totals', [
        `Total: ${this.formatMs(this.runMetric.totalRunTime)}`,
        `Context: ${this.formatMs(this.runMetric.totalContextBuildingTime)}`,
        `Memory: ${this.formatMs(this.runMetric.totalMemoryRetrievalTime)}`,
        `LLM: ${this.formatMs(this.runMetric.totalLLMRequestTime)}`,
        `Tools: ${this.formatMs(this.runMetric.totalToolExecutionTime)}`,
      ], width);
    }

    if (this.options.showRounds && this.roundMetrics.length > 0) {
      // Show last round summary (most recent)
      const last = this.roundMetrics[this.roundMetrics.length - 1]!;
      this.addSection(lines, `Round ${last.round}`, [
        `Context: ${this.formatMs(last.contextBuildingTime)}`,
        `Memory: ${this.formatMs(last.memoryRetrievalTime)}`,
        `LLM: ${this.formatMs(last.llmRequestTime)}`,
        `Tools: ${this.formatMs(last.toolExecutionTime)}`,
        `Total: ${this.formatMs(last.totalRoundTime)}`,
      ], width);
    }

    // Fill remaining with round history
    const startIdx = this.roundMetrics.length - (maxRows - 5);
    if (startIdx >= 0 && this.options.showRounds) {
      for (let i = startIdx; i < this.roundMetrics.length; i++) {
        const evt = this.roundMetrics[i]!;
        const short = `R${evt.round}: C${this.formatShort(evt.contextBuildingTime)} M${this.formatShort(evt.memoryRetrievalTime)} L${this.formatShort(evt.llmRequestTime)} T${this.formatShort(evt.toolExecutionTime)}`;
        lines.push('│ ' + short.padEnd(width - 2) + '│');
      }
    }

    // Bottom border
    lines.push('└' + line + '┘');

    return lines;
  }

  private addSection(lines: string[], title: string, rows: string[], width: number): void {
    lines.push('│ \x1b[1;36m' + this.padRight(title, width - 4) + '\x1b[0m │');
    for (const row of rows) {
      lines.push('│ ' + this.padRight(row, width - 4) + ' │');
    }
  }

  private centerPad(text: string, width: number): string {
    const padded = text.padStart((width + text.length) / 2).padEnd(width);
    return '\x1b[1;33m' + padded + '\x1b[0m';
  }

  private padRight(text: string, width: number): string {
    return text.length < width ? text + ' '.repeat(width - text.length) : text.substring(0, width);
  }

  private formatMs(ms: number): string {
    return `${ms.toFixed(1)}ms`;
  }

  private formatShort(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
