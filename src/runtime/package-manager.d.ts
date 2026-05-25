/**
 * Package Manager - Load and manage extensions/packages
 *
 * Provides functionality to:
 * - Discover available packages
 * - Install packages from npm
 * - Load package entry points
 * - Resolve package resources
 */
export declare function fetchJson(url: string): Promise<any>;
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
export declare class DefaultPackageManager {
    private packagesDir;
    private registry;
    private npmPath;
    constructor(options?: PackageManagerOptions);
    /**
     * Check if a package is installed
     */
    isInstalled(packageName: string): boolean;
    /**
     * Get installed package info
     */
    getInstalledPackage(packageName: string): ResolvedPackage | null;
    /**
     * List all installed packages
     */
    listInstalled(): ResolvedPackage[];
    /**
     * Install a package from npm
     * This is a simplified implementation - in production would use proper npm programmatic API
     */
    installPackage(source: PackageSource): Promise<ResolvedPackage | null>;
    /**
     * Uninstall a package
     */
    uninstallPackage(packageName: string): Promise<boolean>;
    /**
     * Update an installed package to latest version
     */
    updatePackage(packageName: string): Promise<ResolvedPackage | null>;
    /**
     * Get dependency conflicts among installed packages
     */
    getConflicts(packageName?: string): Promise<string[]>;
    /**
     * Get package metadata from npm registry
     */
    checkPackageHealth(packageName: string): Promise<{
        healthy: boolean;
        issues: string[];
    }>;
    getPackageInfo(name: string): Promise<any | null>;
    /**
     * Search npm registry for packages
     */
    searchPackages(query: string, limit?: number): Promise<Array<{
        name: string;
        version: string;
        description: string;
    }>>;
    /**
     * Resolve a package by name (checks installed, then tries to install)
     */
    resolvePackage(packageName: string, autoInstall?: boolean): Promise<ResolvedPackage | null>;
    /**
     * Get packages directory path
     */
    getPackagesDir(): string;
}
/**
 * Create a default package manager instance
 */
export declare function createPackageManager(options?: PackageManagerOptions): DefaultPackageManager;
//# sourceMappingURL=package-manager.d.ts.map