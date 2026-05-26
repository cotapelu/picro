// SPDX-License-Identifier: Apache-2.0
/**
 * Footer Data Provider for TUI
 *
 * Provides a centralized way to manage footer state and notify Footer component of updates.
 * This decouples the Footer from direct runtime access and allows updates from various sources.
 */

import type { AgentSessionRuntimeInterface } from '../../../../runtime.js';

export interface FooterData {
  cwdBasename: string;
  sessionName: string;
  model: string;
  thinkingLevel: string;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  cost: number;
  autoCompactEnabled: boolean;
  extensionStatuses: Array<{ name: string; status?: string }>;
  performance?: {
    avgCpuUserMS: number;
    avgRSSMB: number;
  };
}

export interface FooterDataProvider {
  /** Get current footer data */
  getData(): FooterData;
  /** Update methods called by InkApp when state changes */
  updateFromRuntime(runtime: AgentSessionRuntimeInterface): void;
  updateExtensionStatuses(statuses: Array<{ name: string; status?: string }>): void;
  updateAutoCompactEnabled(enabled: boolean): void;
  /** Subscribe to changes */
  onChange(callback: (data: FooterData) => void): () => void;
}

/**
 * Simple footer data provider that recomputes data from runtime on demand or when explicitly updated.
 */
export class DefaultFooterDataProvider implements FooterDataProvider {
  private data: FooterData = {
    cwdBasename: '',
    sessionName: '',
    model: 'No model',
    thinkingLevel: 'off',
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    autoCompactEnabled: false,
    extensionStatuses: [],
  };
  private listeners = new Set<(data: FooterData) => void>();

  getData(): FooterData {
    return { ...this.data };
  }

  updateFromRuntime(runtime: AgentSessionRuntimeInterface): void {
    try {
      // cwd basename
      const cwd = runtime.cwd;
      const cwdBasename = cwd ? cwd.split(/[/\\]/).filter(Boolean).pop() || '' : '';

      // session name
      let sessionName = '';
      try {
        const session = runtime.session as any;
        const sessionManager = session?.sessionManager;
        if (sessionManager?.getSessionName) {
          sessionName = sessionManager.getSessionName() || '';
        }
      } catch {}

      // model
      let model = 'No model';
      try {
        const session = runtime.session as any;
        const m = session?.model;
        if (m) model = m.id || m.name || 'Unknown';
      } catch {}

      // thinking level
      let thinkingLevel = 'off';
      try {
        thinkingLevel = runtime.thinkingLevel || 'off';
      } catch {}

      // tokens and cost
      let tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      let cost = 0;
      try {
        const session = runtime.session as any;
        const sessionManager = session?.sessionManager;
        if (sessionManager?.getEntries) {
          const entries = sessionManager.getEntries();
          for (const entry of entries) {
            if (entry.type === 'message' && entry.message?.role === 'assistant') {
              const usage = entry.message.usage || {};
              tokens.input += usage.input || 0;
              tokens.output += usage.output || 0;
              tokens.cacheRead += usage.cacheRead || 0;
              tokens.cacheWrite += usage.cacheWrite || 0;
              if (usage.cost?.total) cost += usage.cost.total;
            }
          }
        }
      } catch {}

      // performance stats (optional)
      let performance: { avgCpuUserMS: number; avgRSSMB: number } | undefined;
      try {
        const session = runtime.session as any;
        const stats = session?.getPerformanceStats?.();
        if (stats && stats.sampleCount > 0) {
          performance = {
            avgCpuUserMS: stats.avgCpuUserMS,
            avgRSSMB: stats.avgRSSMB,
          };
        }
      } catch {}

      // auto-compaction enabled from settings
      let autoCompactEnabled = this.data.autoCompactEnabled;
      try {
        const settings = runtime.settings as any;
        if (settings?.get) {
          autoCompactEnabled = settings.get('autoCompact') !== false; // default true
        }
      } catch {}

      this.data = {
        cwdBasename,
        sessionName,
        model,
        thinkingLevel,
        tokens,
        cost,
        autoCompactEnabled,
        extensionStatuses: this.data.extensionStatuses,
        performance,
      };
      this.notify();
    } catch (err) {
      console.error('Error updating footer data from runtime:', err);
    }
  }

  updateExtensionStatuses(statuses: Array<{ name: string; status?: string }>): void {
    this.data.extensionStatuses = statuses;
    this.notify();
  }

  updateAutoCompactEnabled(enabled: boolean): void {
    this.data.autoCompactEnabled = enabled;
    this.notify();
  }

  onChange(callback: (data: FooterData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const data = this.getData();
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * Create a default footer data provider
 */
export function createFooterDataProvider(): DefaultFooterDataProvider {
  return new DefaultFooterDataProvider();
}
