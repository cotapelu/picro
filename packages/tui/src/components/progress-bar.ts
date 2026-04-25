/**
 * ProgressBar Component
 * Linear progress indicator
 */
import type { UIElement, RenderContext } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';

export interface ProgressBarTheme {
  bgColor: (s: string) => string;
  fgColor: (s: string) => string;
  filledColor: (s: string) => string;
  emptyColor: (s: string) => string;
  borderColor: (s: string) => string;
  dimColor: (s: string) => string;
  accentColor: (s: string) => string;
}

const defaultTheme: ProgressBarTheme = {
  bgColor: (s) => `\x1b[48;5;235m${s}\x1b[0m`,
  fgColor: (s) => `\x1b[37m${s}\x1b[0m`,
  filledColor: (s) => `\x1b[48;5;33m\x1b[97m${s}\x1b[0m`,
  emptyColor: (s) => `\x1b[48;5;240m${s}\x1b[0m`,
  borderColor: (s) => `\x1b[90m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
  accentColor: (s) => `\x1b[36m${s}\x1b[0m`,
};

export interface ProgressBarOptions {
  /** Progress value 0-100 */
  value: number;
  /** Optional label above progress */
  label?: string;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom width (auto if not set) */
  width?: number;
  /** Height in lines (default: 1) */
  height?: number;
  /** Character used for filled portion */
  filledChar?: string;
  /** Character used for empty portion */
  emptyChar?: string;
  /** Theme */
  theme?: Partial<ProgressBarTheme>;
}

/**
 * ProgressBar - linear progress indicator
 * 
 * @example
 * const bar = new ProgressBar({
 *   value: 45,
 *   label: 'Downloading...',
 *   showPercentage: true,
 * });
 * 
 * // Update progress
 * bar.setValue(67);
 */
export class ProgressBar implements UIElement {
  private value: number;
  private label?: string;
  private showPercentage: boolean;
  private requestedWidth: number;
  private height: number;
  private filledChar: string;
  private emptyChar: string;
  private theme: ProgressBarTheme;
  private cachedLines?: string[];
  private cachedWidth?: number;

  constructor(options: ProgressBarOptions) {
    this.value = Math.max(0, Math.min(100, options.value));
    this.label = options.label;
    this.showPercentage = options.showPercentage ?? true;
    this.requestedWidth = options.width ?? 0;
    this.height = Math.max(1, options.height ?? 1);
    this.filledChar = options.filledChar ?? '█';
    this.emptyChar = options.emptyChar ?? '░';
    this.theme = { ...defaultTheme, ...options.theme };
  }

  /**
   * Update progress value (0-100)
   */
  setValue(value: number): void {
    const newValue = Math.max(0, Math.min(100, value));
    if (this.value !== newValue) {
      this.value = newValue;
      this.cachedLines = undefined;
    }
  }

  /**
   * Get current value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Increment by amount
   */
  increment(amount: number): void {
    this.setValue(this.value + amount);
  }

  /**
   * Set label
   */
  setLabel(label: string | undefined): void {
    this.label = label;
    this.cachedLines = undefined;
  }

  /**
   * Check if complete (100%)
   */
  isComplete(): boolean {
    return this.value >= 100;
  }

  clearCache(): void {
    this.cachedLines = undefined;
  }

  draw(context: RenderContext): string[] {
    const width = this.requestedWidth > 0 ? this.requestedWidth : context.width;
    
    // Use cache
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const lines: string[] = [];
    const contentWidth = width - 8; // Space for percentage and borders

    // Label line
    if (this.label) {
      const labelLine = this.theme.accentColor(truncateText(this.label, width, '…').padEnd(width));
      lines.push(labelLine);
    }

    // Progress bar line
    const percentText = `${Math.round(this.value)}%`;
    const barWidth = this.showPercentage ? contentWidth - percentText.length - 2 : contentWidth;
    
    const filledLength = Math.floor((this.value / 100) * barWidth);
    const emptyLength = barWidth - filledLength;

    let bar = '';
    bar += this.theme.filledColor(this.filledChar.repeat(filledLength));
    bar += this.theme.emptyColor(this.emptyChar.repeat(emptyLength));

    let line = this.theme.bgColor('│') + bar + this.theme.bgColor('│');
    
    if (this.showPercentage) {
      const percentColored = this.theme.accentColor(percentText.padStart(5));
      line += ' ' + percentColored;
    }

    // Pad to full width
    const currentWidth = visibleWidth(line);
    if (currentWidth < width) {
      line += ' '.repeat(width - currentWidth);
    } else if (currentWidth > width) {
      line = truncateText(line, width, '…');
    }

    lines.push(line);

    this.cachedLines = lines;
    this.cachedWidth = width;
    return lines;
  }
}

/**
 * Multi-step progress bar
 */
export class StepperProgress implements UIElement {
  private steps: string[];
  private currentStep: number;
  private theme: ProgressBarTheme;
  private completedChar: string;
  private currentChar: string;
  private pendingChar: string;

  constructor(options: {
    steps: string[];
    currentStep?: number;
    theme?: Partial<ProgressBarTheme>;
    completedChar?: string;
    currentChar?: string;
    pendingChar?: string;
  }) {
    this.steps = options.steps;
    this.currentStep = Math.max(0, Math.min(options.currentStep ?? 0, this.steps.length - 1));
    this.theme = { ...defaultTheme, ...options.theme };
    this.completedChar = options.completedChar ?? '●';
    this.currentChar = options.currentChar ?? '○';
    this.pendingChar = options.pendingChar ?? '○';
  }

  /**
   * Move to next step
   */
  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  /**
   * Go to specific step
   */
  goToStep(step: number): void {
    this.currentStep = Math.max(0, Math.min(step, this.steps.length - 1));
  }

  /**
   * Check if all steps completed
   */
  isComplete(): boolean {
    return this.currentStep >= this.steps.length - 1;
  }

  clearCache(): void {}

  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    const parts: string[] = [];

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]!;
      let part = '';

      if (i < this.currentStep) {
        // Completed
        part += this.theme.accentColor(this.completedChar) + ' ' + this.theme.dimColor(step);
      } else if (i === this.currentStep) {
        // Current
        part += this.theme.filledColor(this.currentChar) + ' ' + this.theme.fgColor(step);
      } else {
        // Pending
        part += this.theme.emptyColor(this.pendingChar) + ' ' + this.theme.dimColor(step);
      }

      parts.push(part);
    }

    const line = parts.join(this.theme.dimColor(' → '));
    lines.push(truncateText(line, context.width, '…'));
    return lines;
  }
}

/**
 * Create a simple progress bar
 */
export function createProgressBar(
  value: number,
  label?: string,
  options: { showPercentage?: boolean; width?: number } = {}
): ProgressBar {
  return new ProgressBar({
    value,
    label,
    showPercentage: options.showPercentage ?? true,
    width: options.width,
  });
}
