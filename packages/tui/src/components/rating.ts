/**
 * Rating Component
 * Star rating display
 */
import type { UIElement, RenderContext } from '../tui.js';
import { visibleWidth } from '../utils.js';

export interface RatingTheme {
  filledStar: (s: string) => string;
  emptyStar: (s: string) => string;
  halfStar: (s: string) => string;
  labelColor: (s: string) => string;
  dimColor: (s: string) => string;
}

const defaultTheme: RatingTheme = {
  filledStar: (s) => `\x1b[33m${s}\x1b[0m`,    // Yellow
  emptyStar: (s) => `\x1b[90m${s}\x1b[0m`,     // Gray
  halfStar: (s) => `\x1b[33m${s}\x1b[0m`,      // Yellow
  labelColor: (s) => `\x1b[37m${s}\x1b[0m`,
  dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
};

export interface RatingOptions {
  value: number; // 0-5
  maxStars?: number;
  showLabel?: boolean;
  label?: string;
  allowHalf?: boolean;
  theme?: Partial<RatingTheme>;
  filledChar?: string;
  emptyChar?: string;
  halfChar?: string;
}

export class Rating implements UIElement {
  private value: number;
  private maxStars: number;
  private showLabel: boolean;
  private label?: string;
  private allowHalf: boolean;
  private theme: RatingTheme;
  private filledChar: string;
  private emptyChar: string;
  private halfChar: string;

  constructor(options: RatingOptions) {
    this.value = Math.max(0, Math.min(options.maxStars ?? 5, options.value));
    this.maxStars = options.maxStars ?? 5;
    this.showLabel = options.showLabel ?? true;
    this.label = options.label;
    this.allowHalf = options.allowHalf ?? true;
    this.theme = { ...defaultTheme, ...options.theme };
    this.filledChar = options.filledChar ?? '★';
    this.emptyChar = options.emptyChar ?? '☆';
    this.halfChar = options.halfChar ?? '½';
  }

  setValue(value: number): void {
    this.value = Math.max(0, Math.min(this.maxStars, value));
  }

  getValue(): number {
    return this.value;
  }

  clearCache(): void {}

  draw(_context: RenderContext): string[] {
    const filled = Math.floor(this.value);
    const hasHalf = this.allowHalf && this.value % 1 >= 0.5;
    const empty = this.maxStars - filled - (hasHalf ? 1 : 0);

    let stars = '';
    stars += this.theme.filledStar(this.filledChar.repeat(filled));
    if (hasHalf) {
      stars += this.theme.halfStar(this.halfChar);
    }
    stars += this.theme.emptyStar(this.emptyChar.repeat(empty));

    let line = stars;
    
    if (this.showLabel) {
      const labelText = this.label ?? `${this.value}/${this.maxStars}`;
      line += ` ${this.theme.labelColor(labelText)}`;
    }

    return [line];
  }
}

export function createRating(value: number, maxStars = 5): Rating {
  return new Rating({ value, maxStars });
}
