"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Diagnostics - System and runtime information collection
 *
 * Provides utilities to gather diagnostic information for:
 * - Debugging issues
 * - Performance profiling
 * - Support requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemInfo = getSystemInfo;
exports.getMemoryInfo = getMemoryInfo;
exports.getNetworkInterfaces = getNetworkInterfaces;
exports.getPerformanceMetrics = getPerformanceMetrics;
exports.getFileStats = getFileStats;
exports.formatFileSize = formatFileSize;
exports.isDevelopment = isDevelopment;
exports.isTest = isTest;
exports.collectDiagnostics = collectDiagnostics;
exports.generateDiagnosticReport = generateDiagnosticReport;
const os_1 = require("os");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = require("path");
/**
 * Get system information
 */
function getSystemInfo() {
    const cpusInfo = (0, os_1.cpus)();
    const totalMem = (0, os_1.totalmem)();
    const freeMem = (0, os_1.freemem)();
    return {
        arch: (0, os_1.arch)(),
        platform: (0, os_1.platform)(),
        osRelease: (0, os_1.release)(),
        nodeVersion: (0, os_1.version)(),
        hostname: (0, os_1.hostname)(),
        cpuModel: cpusInfo.length > 0 ? cpusInfo[0].model : 'Unknown',
        cpuCores: cpusInfo.length,
        totalMemoryMB: Math.round(totalMem / 1024 / 1024),
        freeMemoryMB: Math.round(freeMem / 1024 / 1024),
        memoryUsageMB: Math.round((totalMem - freeMem) / 1024 / 1024),
    };
}
/**
 * Get current memory usage of this process
 */
function getMemoryInfo() {
    const usage = process.memoryUsage();
    return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers ?? 0,
    };
}
function getNetworkInterfaces() {
    const ifaces = (0, os_1.networkInterfaces)();
    const result = [];
    for (const [iface, addresses] of Object.entries(ifaces)) {
        if (!addresses)
            continue;
        for (const addr of addresses) {
            if (addr.family === 'IPv4' || addr.family === 'IPv6') {
                result.push({
                    interface: iface,
                    address: addr.address,
                    netmask: addr.netmask,
                    family: addr.family,
                    mac: addr.mac,
                    internal: addr.internal,
                });
            }
        }
    }
    return result;
}
/**
 * Get performance metrics
 */
function getPerformanceMetrics() {
    const start = process.cpuUsage();
    const end = process.hrtime();
    // Approximate event loop delay (simple check)
    const now = Date.now();
    const scheduled = global.__setImmediateCallback
        ? global.__setImmediateCallback()
        : 0;
    return {
        upTimeMS: process.uptime() * 1000,
        cpuUsage: start,
        eventLoopDelay: 0, // Placeholder - would need proper measurement
    };
}
/**
 * Get file stats with error handling
 */
async function getFileStats(filePath) {
    try {
        return await (0, promises_1.stat)(filePath);
    }
    catch {
        return null;
    }
}
/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes < 1024)
        return bytes + ' B';
    if (bytes < 1024 * 1024)
        return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024)
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}
/**
 * Check if running in development mode
 */
function isDevelopment() {
    return process.env.NODE_ENV === 'development' ||
        process.env.PI_DEV === '1' ||
        process.argv.includes('--dev');
}
/**
 * Check if running in test mode
 */
function isTest() {
    return process.env.NODE_ENV === 'test' ||
        process.argv.includes('--test') ||
        process.argv.includes('vitest');
}
/**
 * Collect comprehensive diagnostic information
 */
function collectDiagnostics() {
    const mem = getMemoryInfo();
    const sys = getSystemInfo();
    const perf = getPerformanceMetrics();
    return {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            PI_DEV: process.env.PI_DEV,
            TERM: process.env.TERM,
            TERM_PROGRAM: process.env.TERM_PROGRAM,
        },
        system: sys,
        process: {
            pid: process.pid,
            ppid: process.ppid,
            uid: process.getuid?.(),
            gid: process.getgid?.(),
            cwd: process.cwd(),
            execPath: process.execPath,
        },
        memory: {
            rssMB: Math.round(mem.rss / 1024 / 1024),
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        },
        performance: {
            upTimeMS: perf.upTimeMS,
            cpuUserMS: perf.cpuUsage.user,
            cpuSystemMS: perf.cpuUsage.system,
        },
        network: getNetworkInterfaces(),
        moduleInfo: {
            agentVersion: getPackageVersion() || 'unknown',
        },
    };
}
/**
 * Get package version from package.json
 */
function getPackageVersion() {
    try {
        const pkgPath = (0, path_1.join)(process.cwd(), 'package.json');
        if ((0, fs_1.existsSync)(pkgPath)) {
            const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
            return pkg.version;
        }
    }
    catch { }
    return null;
}
/**
 * Generate a diagnostic report string
 */
function generateDiagnosticReport() {
    const diag = collectDiagnostics(); // Cast for simplicity
    const lines = [];
    lines.push('=== Diagnostic Report ===');
    lines.push(`Generated: ${diag.timestamp}`);
    lines.push('');
    lines.push('--- Environment ---');
    Object.entries(diag.environment).forEach(([k, v]) => lines.push(`${k}: ${v}`));
    lines.push('');
    lines.push('--- System ---');
    lines.push(`OS: ${diag.system.platform} ${diag.system.osRelease} (${diag.system.arch})`);
    lines.push(`Node: ${diag.system.nodeVersion}`);
    lines.push(`Host: ${diag.system.hostname}`);
    lines.push(`CPU: ${diag.system.cpuModel} (${diag.system.cpuCores} cores)`);
    lines.push(`Memory: ${diag.system.memoryUsageMB}MB used / ${diag.system.totalMemoryMB}MB total`);
    if (diag.network && diag.network.length) {
        lines.push('Network Interfaces:');
        for (const iface of diag.network) {
            lines.push(`  ${iface.interface} (${iface.family}): ${iface.address}` + (iface.internal ? ' [internal]' : ''));
        }
    }
    lines.push('');
    lines.push('--- Process ---');
    lines.push(`PID: ${diag.process.pid}`);
    lines.push(`CWD: ${diag.process.cwd}`);
    lines.push('');
    lines.push('--- Memory ---');
    lines.push(`RSS: ${diag.memory.rssMB}MB`);
    lines.push(`Heap Used: ${diag.memory.heapUsedMB}MB / ${diag.memory.heapTotalMB}MB`);
    lines.push('');
    lines.push('--- Uptime ---');
    lines.push(`Up: ${(diag.performance.upTimeMS / 1000).toFixed(1)}s`);
    lines.push('');
    return lines.join('\n');
}
//# sourceMappingURL=diagnostics.js.map