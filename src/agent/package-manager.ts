// SPDX-License-Identifier: Apache-2.0
/**
 * Package Manager - Load and manage extensions/packages
 *
 * Provides functionality to:
 * - Discover available packages
 * - Install packages from npm
 * - Load package entry points
 * - Resolve package resources
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url'; // if needed

export async function fetchJson(url: string): Promise<any> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Package source configuration
 */
export interface PackageSource {
  /** Package name or URL */
  name: string;
  /** Version specifier (default: latest) */
  version?: string;
  /** Registry URL (default: npmjs) */
  registry?: string;
}

/**
 * Resolved package with metadata
 */
export interface ResolvedPackage {
  name: string;
  version: string;
  path: string;
  entryPoint?: string;
}

/**
 * Options for package operations
 */
export interface PackageManagerOptions {
  /** Directory for installed packages */
  packagesDir?: string;
  /** npm registry to use */
  registry?: string;
  /** Custom npm executable path */
  npmPath?: string;
}

/**
 * Default package manager implementation
 * Simple wrapper around npm for package management
 */
export class DefaultPackageManager {
  private packagesDir: string;
  private registry: string;
  private npmPath: string;

  constructor(options: PackageManagerOptions = {}) {
    this.packagesDir = options.packagesDir ?? join(process.cwd(), '.pi', 'packages');
    this.registry = options.registry ?? 'https://registry.npmjs.org';
    this.npmPath = options.npmPath ?? 'npm';
  }

  /**
   * Check if a package is installed
   */
  isInstalled(packageName: string): boolean {
    const pkgPath = join(this.packagesDir, packageName);
    return existsSync(pkgPath);
  }

  /**
   * Get installed package info
   */
  getInstalledPackage(packageName: string): ResolvedPackage | null {
    const pkgPath = join(this.packagesDir, packageName);
    if (!existsSync(pkgPath)) return null;

    try {
      const pkgJsonPath = join(pkgPath, 'package.json');
      if (!existsSync(pkgJsonPath)) return null;

      const pkg = JSON.parse(require('fs').readFileSync(pkgJsonPath, 'utf8'));
      return {
        name: pkg.name,
        version: pkg.version,
        path: pkgPath,
        entryPoint: pkg['pi:extension'] || pkg.main || 'index.js',
      };
    } catch {
      return null;
    }
  }

  /**
   * List all installed packages
   */
  listInstalled(): ResolvedPackage[] {
    const result: ResolvedPackage[] = [];
    if (!existsSync(this.packagesDir)) return result;

    try {
      const entries = readdirSync(this.packagesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkg = this.getInstalledPackage(entry.name);
          if (pkg) result.push(pkg);
        }
      }
    } catch {}
    return result;
  }

  /**
   * Install a package from npm
   * This is a simplified implementation - in production would use proper npm programmatic API
   */
  async installPackage(source: PackageSource): Promise<ResolvedPackage | null> {
    const { name, version = 'latest' } = source;

    // Ensure packages directory exists
    mkdirSync(this.packagesDir, { recursive: true });

    // Build npm install command
    const pkgSpec = version ? `${name}@${version}` : name;
    const args = ['install', '--prefix', this.packagesDir, '--no-save', pkgSpec];

    // Spawn npm install
    const { spawnSync } = await import('child_process');
    const result = spawnSync(this.npmPath, args, {
      encoding: 'utf-8',
      timeout: 120000, // 2 minute timeout
    });

    if (result.status !== 0) {
      console.error('Failed to install package:', result.stderr);
      return null;
    }

    // Return installed package info
    return this.getInstalledPackage(name);
  }

  /**
   * Uninstall a package
   */
  async uninstallPackage(packageName: string): Promise<boolean> {
    if (!this.isInstalled(packageName)) return true;

    const { spawnSync } = await import('child_process');
    const result = spawnSync(this.npmPath, ['uninstall', '--prefix', this.packagesDir, packageName], {
      encoding: 'utf-8',
    });

    return result.status === 0;
  }

  /**
   * Update an installed package to latest version
   */
  async updatePackage(packageName: string): Promise<ResolvedPackage | null> {
    if (!this.isInstalled(packageName)) {
      throw new Error(`Package ${packageName} is not installed`);
    }
    const { spawnSync } = await import('child_process');
    const result = spawnSync(this.npmPath, ['update', '--prefix', this.packagesDir, packageName], {
      encoding: 'utf-8',
      timeout: 120000,
    });
    if (result.status !== 0) {
      console.error('Failed to update package:', result.stderr);
      return null;
    }
    return this.getInstalledPackage(packageName);
  }

  /**
   * Get dependency conflicts among installed packages
   */
  async getConflicts(packageName?: string): Promise<string[]> {
    const args = ['ls', '--all', '--json'];
    if (packageName) args.push(packageName);
    const { spawnSync } = await import('child_process');
    const result = spawnSync(this.npmPath, args, {
      cwd: this.packagesDir,
      encoding: 'utf-8',
    });
    const conflicts: string[] = [];
    if (result.status !== 0) {
      try {
        const json = JSON.parse(result.stdout);
        const collectErrors = (node: any) => {
          if (node.error) {
            conflicts.push(`${node.name}: ${node.error}`);
          }
          if (node.dependencies) {
            for (const dep of Object.values(node.dependencies)) {
              collectErrors(dep);
            }
          }
        };
        collectErrors(json);
      } catch {
        conflicts.push(result.stderr || 'Unknown error');
      }
    }
    return conflicts;
  }

  /**
   * Get package metadata from npm registry
   */
  async checkPackageHealth(packageName: string): Promise<{healthy: boolean; issues: string[]}> {
    const pkg = this.getInstalledPackage(packageName);
    if (!pkg) {
      return { healthy: false, issues: ['Package not installed'] };
    }
    const issues: string[] = [];
    try {
      const pkgJsonPath = join(pkg.path, 'package.json');
      const raw = readFileSync(pkgJsonPath, 'utf8');
      const pkgData = JSON.parse(raw);
      if (!pkgData.name) issues.push('Missing name in package.json');
      if (!pkgData.version) issues.push('Missing version in package.json');
      const entry = pkgData['pi.extension'] || pkgData.main || (pkgData.exports && pkgData.exports['.'] && pkgData.exports['.'].import);
      if (!entry) {
        issues.push('No extension entry point defined (pi.extension, main, or exports)');
      } else if (typeof entry === 'string') {
        const entryPath = join(pkg.path, entry);
        if (!existsSync(entryPath)) issues.push(`Entry point file not found: ${entry}`);
      }
    } catch (e: any) {
      issues.push(`Failed to read package.json: ${e.message}`);
    }
    return { healthy: issues.length === 0, issues };
  }

  async getPackageInfo(name: string): Promise<any | null> {
    const url = this.registry.replace(/\/?$/, '') + `/${encodeURIComponent(name)}`;
    return await fetchJson(url);
  }

  /**
   * Search npm registry for packages
   */
  async searchPackages(query: string, limit: number = 20): Promise<Array<{ name: string; version: string; description: string }>> {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
    const data = await fetchJson(url);
    if (!data || !data.objects) return [];
    return data.objects.map((obj: any) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description,
    }));
  }

  /**
   * Resolve a package by name (checks installed, then tries to install)
   */
  async resolvePackage(packageName: string, autoInstall = true): Promise<ResolvedPackage | null> {
    // Check if already installed
    const installed = this.getInstalledPackage(packageName);
    if (installed) return installed;

    // Try to install if autoInstall enabled
    if (autoInstall) {
      return this.installPackage({ name: packageName });
    }

    return null;
  }

  /**
   * Get packages directory path
   */
  getPackagesDir(): string {
    return this.packagesDir;
  }
}

/**
 * Create a default package manager instance
 */
export function createPackageManager(options?: PackageManagerOptions): DefaultPackageManager {
  return new DefaultPackageManager(options);
}
