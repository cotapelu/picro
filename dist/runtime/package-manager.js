"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPackageManager = void 0;
exports.fetchJson = fetchJson;
exports.createPackageManager = createPackageManager;
const fs_1 = require("fs");
const path_1 = require("path");
async function fetchJson(url) {
    try {
        const res = await fetch(url);
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
}
/**
 * Default package manager implementation
 * Simple wrapper around npm for package management
 */
class DefaultPackageManager {
    packagesDir;
    registry;
    npmPath;
    constructor(options = {}) {
        this.packagesDir = options.packagesDir ?? (0, path_1.join)(process.cwd(), '.pi', 'packages');
        this.registry = options.registry ?? 'https://registry.npmjs.org';
        this.npmPath = options.npmPath ?? 'npm';
    }
    /**
     * Check if a package is installed
     */
    isInstalled(packageName) {
        const pkgPath = (0, path_1.join)(this.packagesDir, packageName);
        return (0, fs_1.existsSync)(pkgPath);
    }
    /**
     * Get installed package info
     */
    getInstalledPackage(packageName) {
        const pkgPath = (0, path_1.join)(this.packagesDir, packageName);
        if (!(0, fs_1.existsSync)(pkgPath))
            return null;
        try {
            const pkgJsonPath = (0, path_1.join)(pkgPath, 'package.json');
            if (!(0, fs_1.existsSync)(pkgJsonPath))
                return null;
            const pkg = JSON.parse(require('fs').readFileSync(pkgJsonPath, 'utf8'));
            return {
                name: pkg.name,
                version: pkg.version,
                path: pkgPath,
                entryPoint: pkg['pi:extension'] || pkg.main || 'index.js',
            };
        }
        catch {
            return null;
        }
    }
    /**
     * List all installed packages
     */
    listInstalled() {
        const result = [];
        if (!(0, fs_1.existsSync)(this.packagesDir))
            return result;
        try {
            const entries = (0, fs_1.readdirSync)(this.packagesDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pkg = this.getInstalledPackage(entry.name);
                    if (pkg)
                        result.push(pkg);
                }
            }
        }
        catch { }
        return result;
    }
    /**
     * Install a package from npm
     * This is a simplified implementation - in production would use proper npm programmatic API
     */
    async installPackage(source) {
        const { name, version = 'latest' } = source;
        // Ensure packages directory exists
        (0, fs_1.mkdirSync)(this.packagesDir, { recursive: true });
        // Build npm install command
        const pkgSpec = version ? `${name}@${version}` : name;
        const args = ['install', '--prefix', this.packagesDir, '--no-save', pkgSpec];
        // Spawn npm install
        const { spawnSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
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
    async uninstallPackage(packageName) {
        if (!this.isInstalled(packageName))
            return true;
        const { spawnSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const result = spawnSync(this.npmPath, ['uninstall', '--prefix', this.packagesDir, packageName], {
            encoding: 'utf-8',
        });
        return result.status === 0;
    }
    /**
     * Update an installed package to latest version
     */
    async updatePackage(packageName) {
        if (!this.isInstalled(packageName)) {
            throw new Error(`Package ${packageName} is not installed`);
        }
        const { spawnSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
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
    async getConflicts(packageName) {
        const args = ['ls', '--all', '--json'];
        if (packageName)
            args.push(packageName);
        const { spawnSync } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const result = spawnSync(this.npmPath, args, {
            cwd: this.packagesDir,
            encoding: 'utf-8',
        });
        const conflicts = [];
        if (result.status !== 0) {
            try {
                const json = JSON.parse(result.stdout);
                const collectErrors = (node) => {
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
            }
            catch {
                conflicts.push(result.stderr || 'Unknown error');
            }
        }
        return conflicts;
    }
    /**
     * Get package metadata from npm registry
     */
    async checkPackageHealth(packageName) {
        const pkg = this.getInstalledPackage(packageName);
        if (!pkg) {
            return { healthy: false, issues: ['Package not installed'] };
        }
        const issues = [];
        try {
            const pkgJsonPath = (0, path_1.join)(pkg.path, 'package.json');
            const raw = (0, fs_1.readFileSync)(pkgJsonPath, 'utf8');
            const pkgData = JSON.parse(raw);
            if (!pkgData.name)
                issues.push('Missing name in package.json');
            if (!pkgData.version)
                issues.push('Missing version in package.json');
            const entry = pkgData['pi.extension'] || pkgData.main || (pkgData.exports && pkgData.exports['.'] && pkgData.exports['.'].import);
            if (!entry) {
                issues.push('No extension entry point defined (pi.extension, main, or exports)');
            }
            else if (typeof entry === 'string') {
                const entryPath = (0, path_1.join)(pkg.path, entry);
                if (!(0, fs_1.existsSync)(entryPath))
                    issues.push(`Entry point file not found: ${entry}`);
            }
        }
        catch (e) {
            issues.push(`Failed to read package.json: ${e.message}`);
        }
        return { healthy: issues.length === 0, issues };
    }
    async getPackageInfo(name) {
        const url = this.registry.replace(/\/?$/, '') + `/${encodeURIComponent(name)}`;
        return await fetchJson(url);
    }
    /**
     * Search npm registry for packages
     */
    async searchPackages(query, limit = 20) {
        const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
        const data = await fetchJson(url);
        if (!data || !data.objects)
            return [];
        return data.objects.map((obj) => ({
            name: obj.package.name,
            version: obj.package.version,
            description: obj.package.description,
        }));
    }
    /**
     * Resolve a package by name (checks installed, then tries to install)
     */
    async resolvePackage(packageName, autoInstall = true) {
        // Check if already installed
        const installed = this.getInstalledPackage(packageName);
        if (installed)
            return installed;
        // Try to install if autoInstall enabled
        if (autoInstall) {
            return this.installPackage({ name: packageName });
        }
        return null;
    }
    /**
     * Get packages directory path
     */
    getPackagesDir() {
        return this.packagesDir;
    }
}
exports.DefaultPackageManager = DefaultPackageManager;
/**
 * Create a default package manager instance
 */
function createPackageManager(options) {
    return new DefaultPackageManager(options);
}
//# sourceMappingURL=package-manager.js.map