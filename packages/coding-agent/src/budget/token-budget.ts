/**
 * Token Budget Manager
 * Track API usage, enforce limits, and alert on thresholds
 */
import type { Usage } from '@picro/llm';

export interface BudgetConfig {
  /** Daily budget in USD */
  dailyBudget: number;
  /** Monthly budget in USD */
  monthlyBudget: number;
  /** Alert threshold (0-1) */
  alertThreshold: number;
  /** Strict mode - block requests over budget */
  strictMode: boolean;
  /** Provider-specific budgets */
  providerBudgets?: Record<string, number>;
  /** Model-specific budgets */
  modelBudgets?: Record<string, number>;
}

export interface UsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  requestId: string;
}

export interface BudgetStatus {
  dailySpent: number;
  dailyBudget: number;
  dailyPercent: number;
  monthlySpent: number;
  monthlyBudget: number;
  monthlyPercent: number;
  remainingDaily: number;
  remainingMonthly: number;
}

/**
 * Token Budget Manager
 */
export class TokenBudget {
  private config: Required<BudgetConfig>;
  private usageHistory: UsageRecord[] = [];
  private alertsSent: Set<string> = new Set();
  private savePath: string;

  constructor(config: Partial<BudgetConfig> = {}, savePath: string = './.coding-agent/budget.json') {
    this.config = {
      dailyBudget: config.dailyBudget ?? 10,
      monthlyBudget: config.monthlyBudget ?? 100,
      alertThreshold: config.alertThreshold ?? 0.8,
      strictMode: config.strictMode ?? false,
      providerBudgets: config.providerBudgets ?? {},
      modelBudgets: config.modelBudgets ?? {},
    };
    this.savePath = savePath;
    this.load();
  }

  /**
   * Record usage from a request
   */
  recordUsage(usage: Usage, provider: string, model: string, requestId: string): void {
    const record: UsageRecord = {
      timestamp: Date.now(),
      provider,
      model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      costUSD: usage.cost?.total ?? 0,
      requestId,
    };

    this.usageHistory.push(record);
    this.cleanup();
    this.checkAlerts(provider, model);
    this.save();
  }

  /**
   * Check if request should be allowed
   */
  canMakeRequest(provider: string, model: string, estimatedCost?: number): { allowed: boolean; reason?: string } {
    const status = this.getStatus();

    // Check daily budget
    if (status.dailyPercent >= 100 && this.config.strictMode) {
      return { allowed: false, reason: `Daily budget exceeded: $${status.dailySpent.toFixed(2)} / $${status.dailyBudget}` };
    }

    // Check monthly budget
    if (status.monthlyPercent >= 100 && this.config.strictMode) {
      return { allowed: false, reason: `Monthly budget exceeded: $${status.monthlySpent.toFixed(2)} / $${status.monthlyBudget}` };
    }

    // Check provider budget
    const providerBudget = this.config.providerBudgets[provider];
    if (providerBudget !== undefined) {
      const providerSpent = this.getProviderUsage(provider);
      if (providerSpent >= providerBudget && this.config.strictMode) {
        return { allowed: false, reason: `Provider budget exceeded: $${providerSpent.toFixed(2)} / $${providerBudget}` };
      }
    }

    // Check model budget
    const modelBudget = this.config.modelBudgets[model];
    if (modelBudget !== undefined) {
      const modelSpent = this.getModelUsage(model);
      if (modelSpent >= modelBudget && this.config.strictMode) {
        return { allowed: false, reason: `Model budget exceeded: $${modelSpent.toFixed(2)} / $${modelBudget}` };
      }
    }

    // Warn if near limit
    if (status.dailyPercent >= 90) {
      return { allowed: true, reason: `Warning: Daily budget at ${status.dailyPercent.toFixed(1)}%` };
    }

    return { allowed: true };
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    const now = Date.now();
    const dayStart = this.getDayStart(now);
    const monthStart = this.getMonthStart(now);

    const dailySpent = this.usageHistory
      .filter(u => u.timestamp >= dayStart)
      .reduce((sum, u) => sum + u.costUSD, 0);

    const monthlySpent = this.usageHistory
      .filter(u => u.timestamp >= monthStart)
      .reduce((sum, u) => sum + u.costUSD, 0);

    return {
      dailySpent,
      dailyBudget: this.config.dailyBudget,
      dailyPercent: (dailySpent / this.config.dailyBudget) * 100,
      monthlySpent,
      monthlyBudget: this.config.monthlyBudget,
      monthlyPercent: (monthlySpent / this.config.monthlyBudget) * 100,
      remainingDaily: Math.max(0, this.config.dailyBudget - dailySpent),
      remainingMonthly: Math.max(0, this.config.monthlyBudget - monthlySpent),
    };
  }

  /**
   * Generate budget report
   */
  generateReport(): string {
    const status = this.getStatus();
    const providerUsage = this.getProviderBreakdown();
    const modelUsage = this.getModelBreakdown();

    const lines = [
      '═'.repeat(60),
      '  BUDGET REPORT',
      '═'.repeat(60),
      '',
      `📅 Daily:   $${status.dailySpent.toFixed(4)} / $${status.dailyBudget.toFixed(2)} (${status.dailyPercent.toFixed(1)}%)`,
      `📊 Monthly: $${status.monthlySpent.toFixed(4)} / $${status.monthlyBudget.toFixed(2)} (${status.monthlyPercent.toFixed(1)}%)`,
      '',
      '💰 Remaining:',
      `  Daily:   $${status.remainingDaily.toFixed(2)}`,
      `  Monthly: $${status.remainingMonthly.toFixed(2)}`,
    ];

    if (providerUsage.size > 0) {
      lines.push('', '🏢 By Provider:');
      for (const [provider, cost] of providerUsage.entries()) {
        const budget = this.config.providerBudgets[provider];
        const status = budget ? ` ($${cost.toFixed(4)} / $${budget})` : '';
        lines.push(`  ${provider.padEnd(15)} $${cost.toFixed(4)}${status}`);
      }
    }

    if (modelUsage.size > 0) {
      lines.push('', '🤖 By Model:');
      for (const [model, cost] of modelUsage.entries()) {
        const budget = this.config.modelBudgets[model];
        const status = budget ? ` ($${cost.toFixed(4)} / $${budget})` : '';
        lines.push(`  ${model.slice(0, 20).padEnd(20)} $${cost.toFixed(4)}${status}`);
      }
    }

    lines.push('', '═'.repeat(60));
    return lines.join('\n');
  }

  /**
   * Update budget configuration
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
    this.save();
  }

  /**
   * Get provider usage breakdown
   */
  private getProviderBreakdown(): Map<string, number> {
    const dayStart = this.getDayStart(Date.now());
    const breakdown = new Map<string, number>();

    for (const record of this.usageHistory) {
      if (record.timestamp >= dayStart) {
        breakdown.set(record.provider, (breakdown.get(record.provider) ?? 0) + record.costUSD);
      }
    }

    return breakdown;
  }

  /**
   * Get model usage breakdown
   */
  private getModelBreakdown(): Map<string, number> {
    const dayStart = this.getDayStart(Date.now());
    const breakdown = new Map<string, number>();

    for (const record of this.usageHistory) {
      if (record.timestamp >= dayStart) {
        breakdown.set(record.model, (breakdown.get(record.model) ?? 0) + record.costUSD);
      }
    }

    return breakdown;
  }

  /**
   * Get total usage for a provider
   */
  private getProviderUsage(provider: string): number {
    const dayStart = this.getDayStart(Date.now());
    return this.usageHistory
      .filter(u => u.timestamp >= dayStart && u.provider === provider)
      .reduce((sum, u) => sum + u.costUSD, 0);
  }

  /**
   * Get total usage for a model
   */
  private getModelUsage(model: string): number {
    const dayStart = this.getDayStart(Date.now());
    return this.usageHistory
      .filter(u => u.timestamp >= dayStart && u.model === model)
      .reduce((sum, u) => sum + u.costUSD, 0);
  }

  /**
   * Get start of day timestamp
   */
  private getDayStart(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /**
   * Get start of month timestamp
   */
  private getMonthStart(ts: number): number {
    const d = new Date(ts);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /**
   * Send alerts if thresholds exceeded
   */
  private checkAlerts(provider: string, model: string): void {
    const status = this.getStatus();
    const alertKey = `${Date.now()}`;

    if (status.dailyPercent >= this.config.alertThreshold * 100 && !this.alertsSent.has('daily')) {
      console.log(`⚠️  Daily budget at ${status.dailyPercent.toFixed(1)}%`);
      this.alertsSent.add('daily');
    }

    if (status.monthlyPercent >= this.config.alertThreshold * 100 && !this.alertsSent.has('monthly')) {
      console.log(`⚠️  Monthly budget at ${status.monthlyPercent.toFixed(1)}%`);
      this.alertsSent.add('monthly');
    }
  }

  /**
   * Cleanup old records
   */
  private cleanup(): void {
    const monthStart = this.getMonthStart(Date.now());
    this.usageHistory = this.usageHistory.filter(u => u.timestamp >= monthStart);
  }

  /**
   * Save to disk
   */
  private save(): void {
    try {
      const fs = require('fs');
      const data = {
        config: this.config,
        usage: this.usageHistory.slice(-1000), // Keep last 1000
        alerts: Array.from(this.alertsSent),
      };
      fs.mkdirSync(require('path').dirname(this.savePath), { recursive: true });
      fs.writeFileSync(this.savePath, JSON.stringify(data, null, 2));
    } catch {}
  }

  /**
   * Load from disk
   */
  private load(): void {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.savePath)) return;
      const data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'));
      if (data.config) this.config = { ...this.config, ...data.config };
      if (data.usage) this.usageHistory = data.usage;
      if (data.alerts) this.alertsSent = new Set(data.alerts);
    } catch {}
  }

  /**
   * Reset alerts
   */
  resetAlerts(): void {
    this.alertsSent.clear();
  }

  /**
   * Clear all usage history
   */
  clear(): void {
    this.usageHistory = [];
    this.alertsSent.clear();
    this.save();
  }
}

/**
 * Global budget instance
 */
export const tokenBudget = new TokenBudget();
