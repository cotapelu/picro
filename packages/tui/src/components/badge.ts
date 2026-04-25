/**
 * Badge Component
 * Status labels and tags
 */
import type { UIElement, RenderContext } from './base.js';
import { visibleWidth } from './internal-utils.js';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeTheme {
  default: (s: string) => string;
  primary: (s: string) => string;
  success: (s: string) => string;
  warning: (s: string) => string;
  error: (s: string) => string;
  info: (s: string) => string;
}

const defaultTheme: BadgeTheme = {
  default: (s) => `\x1b[48;5;240m\x1b[37m${s}\x1b[0m`,
  primary: (s) => `\x1b[48;5;33m\x1b[97m${s}\x1b[0m`,
  success: (s) => `\x1b[48;5;28m\x1b[97m${s}\x1b[0m`,
  warning: (s) => `\x1b[48;5;208m\x1b[30m${s}\x1b[0m`,
  error: (s) => `\x1b[48;5;196m\x1b[97m${s}\x1b[0m`,
  info: (s) => `\x1b[48;5;25m\x1b[97m${s}\x1b[0m`,
};

export interface BadgeOptions {
  label: string;
  variant?: BadgeVariant;
  theme?: Partial<BadgeTheme>;
  prefix?: string;
  suffix?: string;
}

/**
 * Badge - status label/tag
 * 
 * @example
 * const badge = new Badge({ label: 'New', variant: 'success' });
 * const lines = badge.draw({ width: 80, height: 24 });
 * 
 * // Multiple badges
 * const badges = [
 *   new Badge({ label: 'Bug', variant: 'error' }),
 *   new Badge({ label: 'Feature', variant: 'primary' }),
 * ];
 */
export class Badge implements UIElement {
  private label: string;
  private variant: BadgeVariant;
  private theme: BadgeTheme;
  private prefix: string;
  private suffix: string;

  constructor(options: BadgeOptions) {
    this.label = options.label;
    this.variant = options.variant ?? 'default';
    this.theme = { ...defaultTheme, ...options.theme };
    this.prefix = options.prefix ?? '';
    this.suffix = options.suffix ?? '';
  }

  /**
   * Update label
   */
  setLabel(label: string): void {
    this.label = label;
  }

  /**
   * Update variant
   */
  setVariant(variant: BadgeVariant): void {
    this.variant = variant;
  }

  /**
   * Get raw text without styling
   */
  getText(): string {
    return `${this.prefix}${this.label}${this.suffix}`;
  }

  clearCache(): void {}

  draw(_context: RenderContext): string[] {
    const text = ` ${this.prefix}${this.label}${this.suffix} `;
    const styled = this.theme[this.variant](text);
    return [styled];
  }
}

/**
 * Badge Group - multiple badges in a row
 */
export class BadgeGroup implements UIElement {
  private badges: Badge[];
  private separator: string;

  constructor(badges: Badge[], separator = ' ') {
    this.badges = badges;
    this.separator = separator;
  }

  addBadge(badge: Badge): void {
    this.badges.push(badge);
  }

  clearBadges(): void {
    this.badges = [];
  }

  clearCache(): void {}

  draw(_context: RenderContext): string[] {
    const rendered = this.badges.map(b => b.draw({ width: 80, height: 1 })[0] ?? '');
    const line = rendered.join(this.separator);
    return [line];
  }
}

/**
 * Create a quick badge
 */
export function createBadge(label: string, variant: BadgeVariant = 'default'): Badge {
  return new Badge({ label, variant });
}

/**
 * Status badge with icon
 */
export function statusBadge(status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'): Badge {
  const icons: Record<string, string> = {
    pending: '⏳',
    running: '▶️',
    success: '✅',
    failed: '❌',
    cancelled: '⏹️',
  };
  
  const variants: Record<string, BadgeVariant> = {
    pending: 'warning',
    running: 'info',
    success: 'success',
    failed: 'error',
    cancelled: 'default',
  };

  return new Badge({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    variant: variants[status] ?? 'default',
    prefix: icons[status] ?? '',
  });
}
