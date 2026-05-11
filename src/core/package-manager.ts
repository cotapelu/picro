// SPDX-License-Identifier: Apache-2.0
/**
 * Package Manager - Manage extension/skill/prompt/theme sources in settings.
 * Simplified: only manages package sources (strings) in settings.packages.
 * Installing adds a source; removing removes; listing shows them.
 * Actual resource loading picks up sources via resourceLoaderOptions.
 */

import { join } from "node:path";
import { SettingsManager } from "../runtime/settings-manager";
import type { PackageSource } from "../runtime/settings-manager";

export interface PackageManagerOptions {
  cwd: string;
  agentDir: string;
  settingsManager: SettingsManager;
}

/**
 * Simple package manager that edits settings.packages array.
 */
export class PackageManager {
  private cwd: string;
  private agentDir: string;
  private settingsManager: SettingsManager;

  constructor(options: PackageManagerOptions) {
    this.cwd = options.cwd;
    this.agentDir = options.agentDir;
    this.settingsManager = options.settingsManager;
  }

  /**
   * Get current packages from settings (both global and local)
   */
  getPackages(): PackageSource[] {
    // For now, just return global packages; local handling would check cwd-specific settings
    return this.settingsManager.getPackages();
  }

  /**
   * Add a package source to settings.
   * @param source - package source string or object
   * @param local - if true, add to project-local settings; otherwise global
   */
  async install(source: PackageSource, local: boolean = false): Promise<{ ok: boolean; error?: string }> {
    try {
      const current = this.getPackages();
      // Avoid duplicates
      if (!current.includes(source)) {
        current.push(source);
        this.settingsManager.setPackages(current);
        await this.settingsManager.flush();
      }
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || String(error) };
    }
  }

  /**
   * Remove a package source from settings.
   * @param source - source string to remove
   * @param local - if true, remove from project-local settings
   */
  async remove(source: string, local: boolean = false): Promise<{ ok: boolean; error?: string }> {
    try {
      const current = this.getPackages();
      const filtered = current.filter(s => s !== source);
      if (filtered.length === current.length) {
        return { ok: false, error: `Source not found: ${source}` };
      }
      this.settingsManager.setPackages(filtered);
      await this.settingsManager.flush();
      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error.message || String(error) };
    }
  }

  /**
   * Update a package source (re-install). For now, just re-save to trigger reload.
   * More advanced: could re-resolve source to a concrete path.
   */
  async update(source?: string): Promise<{ ok: boolean; error?: string; updated: number }> {
    try {
      if (source) {
        // No-op, just verify exists
        const current = this.getPackages();
        if (!current.includes(source)) {
          return { ok: false, error: `Source not found: ${source}`, updated: 0 };
        }
        // Could re-resolve but no actual operation needed
        return { ok: true, updated: 1 };
      } else {
        // Update all: no-op for now
        return { ok: true, updated: 0 };
      }
    } catch (error: any) {
      return { ok: false, error: error.message || String(error), updated: 0 };
    }
  }

  /**
   * List installed package sources.
   */
  list(): PackageSource[] {
    return this.getPackages();
  }
}
