import type { UIElement, RenderContext } from './base';

export interface ProgressBarOptions {
  percent?: number; // 0-100
  value?: number; // alias for percent
  width?: number;
  height?: number; // in lines, default 1
  fillChar?: string;
  emptyChar?: string;
  showLabel?: boolean;
  labelColor?: string;
  fillColor?: string;
  emptyColor?: string;
}

/**
 * ProgressBar - visual progress indicator
 */
export class ProgressBar implements UIElement {
  private percent: number;
  private width: number;
  private height: number;
  private fillChar: string;
  private emptyChar: string;
  private showLabel: boolean;
  private labelColor: string;
  private fillColor: string;
  private emptyColor: string;

  constructor(opts: ProgressBarOptions) {
    const p = opts.percent ?? opts.value ?? 0;
    this.percent = Math.max(0, Math.min(100, p));
    this.width = opts.width ?? 20;
    this.height = opts.height ?? 1;
    this.fillChar = opts.fillChar ?? '█';
    this.emptyChar = opts.emptyChar ?? '░';
    this.showLabel = opts.showLabel ?? true;
    this.labelColor = opts.labelColor ?? '\x1b[37m';
    this.fillColor = opts.fillColor ?? '\x1b[32m';
    this.emptyColor = opts.emptyColor ?? '\x1b[90m';
  }

  setPercent(percent: number): void {
    this.percent = Math.max(0, Math.min(100, percent));
  }

  // Backward compatibility
  setValue(value: number): void { this.setPercent(value); }
  getValue(): number { return this.percent; }
  increment(delta: number): void { this.setPercent(this.percent + delta); }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const totalWidth = context.width;
    const fillCount = Math.round((this.percent / 100) * this.width);
    const emptyCount = this.width - fillCount;

    // Build bar line
    const bar = this.fillColor + this.fillChar.repeat(fillCount) + this.emptyColor + this.emptyChar.repeat(emptyCount) + '\x1b[0m';
    const label = `${this.percent.toFixed(0)}%`;

    // Combine label and bar
    let line = bar;
    if (this.showLabel) {
      line = ` ${label} ${bar} `;
    }
    const padding = Math.max(0, totalWidth - line.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    line = ' '.repeat(leftPad) + line + ' '.repeat(rightPad);

    // If height > 1, pad with empty lines
    const lines: string[] = [line];
    for (let i = 1; i < this.height; i++) {
      lines.push(' '.repeat(totalWidth));
    }
    return lines;
  }
}

/** Factory for quick progress bar with label */
export function createProgressBar(value: number, label?: string): ProgressBar {
  return new ProgressBar({ percent: value });
}

/** Alias for Stepper (from stepper.js) */
import { Stepper } from './stepper';
export { Stepper as StepperProgress };
