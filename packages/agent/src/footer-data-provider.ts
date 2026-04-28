// SPDX-License-Identifier: Apache-2.0
/**
 * Footer Data Provider
 *
 * Provides read-only data for the footer UI, such as:
 * - Git branch information
 * - Extension status indicators
 * - Session statistics
 * - Other dynamic status info
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Git information for footer
 */
export interface GitInfo {
  /** Current branch name */
  branch: string;
  /** Whether there are uncommitted changes */
  dirty: boolean;
  /** Number of commits ahead of remote */
  ahead?: number;
  /** Number of commits behind remote */
  behind?: number;
}

/**
 * Extension status in footer
 */
export interface ExtensionStatus {
  /** Extension name */
  name: string;
  /** Whether extension is active */
  active: boolean;
  /** Optional status message */
  status?: string;
}

/**
 * Footer data snapshot
 */
export interface FooterData {
  /** Current git info (if in git repo) */
  git?: GitInfo;
  /** Active extensions */
  extensions: ExtensionStatus[];
  /** Session info */
  session?: {
    id: string;
    model: string;
    turns: number;
  };
  /** Custom key-value pairs */
  custom: Record<string, string>;
}

/**
 * Footer data provider interface
 */
export interface FooterDataProvider {
  /** Get current footer data */
  getData(): FooterData;
  /** Subscribe to updates */
  onChange(callback: (data: FooterData) => void): () => void;
}

/**
 * Simple footer data provider with manual updates
 */
export class DefaultFooterDataProvider implements FooterDataProvider {
  private data: FooterData = {
    extensions: [],
    custom: {},
  };
  private listeners = new Set<(data: FooterData) => void>();

  getData(): FooterData {
    return { ...this.data, extensions: [...this.data.extensions] };
  }

  /**
   * Update git info
   */
  setGitInfo(info: GitInfo | undefined): void {
    this.data.git = info;
    this.notify();
  }

  /**
   * Set extension statuses
   */
  setExtensions(extensions: ExtensionStatus[]): void {
    this.data.extensions = extensions;
    this.notify();
  }

  /**
   * Update session info
   */
  setSession(session: FooterData['session']): void {
    this.data.session = session;
    this.notify();
  }

  /**
   * Set custom footer item
   */
  setCustom(key: string, value: string): void {
    this.data.custom[key] = value;
    this.notify();
  }

  /**
   * Remove custom footer item
   */
  removeCustom(key: string): void {
    delete this.data.custom[key];
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
 * Create default footer data provider
 */
export function createFooterDataProvider(): DefaultFooterDataProvider {
  return new DefaultFooterDataProvider();
}

/**
 * Simple utility to read git info from command line
 * Used by modes that want to display git status in footer
 */
export async function getGitInfo(cwd: string = process.cwd()): Promise<GitInfo | null> {
  try {
    const { spawn } = await import('child_process');
    const result = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf-8' });
    if (result.status !== 0) return null;

    const branch = result.stdout?.trim() || 'unknown';

    // Check if dirty
    const statusResult = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' });
    const dirty = statusResult.status === 0 && statusResult.stdout?.trim().length > 0;

    // Get ahead/behind
    const revListResult = spawnSync('git', ['rev-list', '--count', '--left-right', '@{upstream}...HEAD'], {
      cwd,
      encoding: 'utf-8',
    });
    let ahead = 0;
    let behind = 0;
    if (revListResult.status === 0 && revListResult.stdout) {
      const parts = revListResult.stdout.trim().split('\t');
      if (parts.length === 2) {
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    }

    return { branch, dirty, ahead: ahead > 0 ? ahead : undefined, behind: behind > 0 ? behind : undefined };
  } catch {
    return null;
  }
}
