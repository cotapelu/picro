import type { UIElement, RenderContext } from '../core/base';

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

    // Theme adaptation: use context.theme if available, fall back to local colors
    let labelAnsi = this.labelColor;
    let fillAnsi = this.fillColor;
    let emptyAnsi = this.emptyColor;
    if (context.theme) {
      if (context.theme.textColor) labelAnsi = context.theme.textColor;
      if (context.theme.accentColor) fillAnsi = context.theme.accentColor;
      if (context.theme.borderColor) emptyAnsi = context.theme.borderColor;
    }

    const barFill = fillAnsi + this.fillChar.repeat(fillCount);
    const barEmpty = emptyAnsi + this.emptyChar.repeat(emptyCount);
    const bar = barFill + barEmpty;

    const label = `${this.percent.toFixed(0)}%`;
    const coloredLabel = labelAnsi + label + '\x1b[0m';

    const core = this.showLabel ? ` ${coloredLabel} ${bar}` : bar;
    const coreLen = core.length;
    const needed = totalWidth - coreLen - 4; // reserve space for reset
    const leftPad = needed > 0 ? needed : 0;
    const line = ' '.repeat(leftPad) + core + '\x1b[0m';

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
