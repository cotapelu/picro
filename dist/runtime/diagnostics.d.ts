/**
 * Diagnostics - System and runtime information collection
 *
 * Provides utilities to gather diagnostic information for:
 * - Debugging issues
 * - Performance profiling
 * - Support requests
 */
import type { Stats } from 'fs';
/**
 * System information
 */
export interface SystemInfo {
    arch: string;
    platform: string;
    osRelease: string;
    nodeVersion: string;
    hostname: string;
    cpuModel: string;
    cpuCores: number;
    totalMemoryMB: number;
    freeMemoryMB: number;
    memoryUsageMB: number;
}
/**
 * Memory usage snapshot
 */
export interface MemoryInfo {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    upTimeMS: number;
    cpuUsage: NodeJS.CpuUsage;
    eventLoopDelay: number;
}
/**
 * Get system information
 */
export declare function getSystemInfo(): SystemInfo;
/**
 * Get current memory usage of this process
 */
export declare function getMemoryInfo(): MemoryInfo;
/**
 * Get network interfaces information
 */
export interface NetworkInterfaceInfo {
    interface: string;
    address: string;
    netmask?: string;
    family: 'IPv4' | 'IPv6';
    mac?: string;
    internal: boolean;
}
export declare function getNetworkInterfaces(): NetworkInterfaceInfo[];
/**
 * Get performance metrics
 */
export declare function getPerformanceMetrics(): PerformanceMetrics;
/**
 * Get file stats with error handling
 */
export declare function getFileStats(filePath: string): Promise<Stats | null>;
/**
 * Format file size for display
 */
export declare function formatFileSize(bytes: number): string;
/**
 * Check if running in development mode
 */
export declare function isDevelopment(): boolean;
/**
 * Check if running in test mode
 */
export declare function isTest(): boolean;
/**
 * Collect comprehensive diagnostic information
 */
export declare function collectDiagnostics(): Record<string, unknown>;
/**
 * Generate a diagnostic report string
 */
export declare function generateDiagnosticReport(): string;
//# sourceMappingURL=diagnostics.d.ts.map