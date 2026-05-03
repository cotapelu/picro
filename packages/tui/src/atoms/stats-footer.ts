import type { UIElement, RenderContext } from './base.js';
import { Footer, type FooterItem } from './footer.js';
import { visibleWidth } from './internal-utils.js';

/**
 * Session statistics for footer display
 */
export interface SessionStats {
  cwd: string;
  gitBranch?: string;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number; // in USD (optional)
  contextPercent?: number; // 0-100
  model?: {
    name: string;
    provider: string;
  };
  autoCompactEnabled?: boolean;
  extensions?: Array<{ name: string; enabled: boolean }>;
}

/**
 * StatsFooter - extends Footer to show session statistics
 */
export class StatsFooter extends Footer {
  private stats?: SessionStats;

  constructor(options?: any) {
    super(options);
  }

  /**
   * Update session statistics
   */
  setStats(stats: SessionStats): void {
    this.stats = stats;
    this.updateItemsFromStats();
    this.clearCache();
  }

  private updateItemsFromStats(): void {
    if (!this.stats) return;

    const rightItems: FooterItem[] = [];

    // Context % (colored)
    if (this.stats.contextPercent !== undefined) {
      const pct = this.stats.contextPercent;
      let ansi = '\x1b[32m'; // green
      if (pct > 80) ansi = '\x1b[31m'; // red
      else if (pct > 50) ansi = '\x1b[33m'; // yellow
      rightItems.push({
        label: `${pct}%`,
        colorAnsi: ansi,
      });
    }

    // Tokens: ↑123 ↓456
    if (this.stats.tokens) {
      const { input, output } = this.stats.tokens;
      rightItems.push({
        label: `↑${this.formatNumber(input)} ↓${this.formatNumber(output)}`,
      });
    }

    // Model provider/name
    if (this.stats.model) {
      rightItems.push({
        label: `${this.stats.model.provider}/${this.stats.model.name}`,
      });
    }

    // Cost
    if (this.stats.cost !== undefined) {
      rightItems.push({
        label: `$${this.stats.cost.toFixed(2)}`,
      });
    }

    // Auto-compact indicator
    if (this.stats.autoCompactEnabled) {
      rightItems.unshift({
        label: '[AC]',
      });
    }

    // Extensions enabled count
    if (this.stats.extensions && this.stats.extensions.length > 0) {
      const enabledCount = this.stats.extensions.filter(e => e.enabled).length;
      rightItems.push({
        label: `ext:${enabledCount}/${this.stats.extensions.length}`,
      });
    }

    // Update right items (keep left items as is)
    this.setItems(undefined, rightItems);
  }

  private formatNumber(n: number): string {
    if (n < 1000) return n.toString();
    if (n < 1000000) return (n / 1000).toFixed(1) + 'k';
    return (n / 1000000).toFixed(1) + 'M';
  }
}
