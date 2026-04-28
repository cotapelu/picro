// SPDX-License-Identifier: Apache-2.0
/**
 * Diagnostics - System and runtime information collection
 *
 * Provides utilities to gather diagnostic information for:
 * - Debugging issues
 * - Performance profiling
 * - Support requests
 */

import { cpus, freemem, totalmem, arch, platform, release, version, hostname } from 'os';
import { existsSync, statSync } from 'fs';import { stat } from 'fs/promises';
import type { Stats } from 'fs';
import { join } from 'path';

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
  rss: number; // Resident set size
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
export function getSystemInfo(): SystemInfo {
  const cpusInfo = cpus();
  const totalMem = totalmem();
  const freeMem = freemem();

  return {
    arch: arch(),
    platform: platform(),
    osRelease: release(),
    nodeVersion: version(),
    hostname: hostname(),
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
export function getMemoryInfo(): MemoryInfo {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers ?? 0,
  };
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const start = process.cpuUsage();
  const end = process.hrtime();

  // Approximate event loop delay (simple check)
  const now = Date.now();
  const scheduled = (global as any).__setImmediateCallback
    ? (global as any).__setImmediateCallback()
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
export async function getFileStats(filePath: string): Promise<Stats | null> {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' ||
         process.env.PI_DEV === '1' ||
         process.argv.includes('--dev');
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test' ||
         process.argv.includes('--test') ||
         process.argv.includes('vitest');
}

/**
 * Collect comprehensive diagnostic information
 */
export function collectDiagnostics(): Record<string, unknown> {
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
    moduleInfo: {
      agentVersion: getPackageVersion() || 'unknown',
    },
  };
}

/**
 * Get package version from package.json
 */
function getPackageVersion(): string | null {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
      return pkg.version;
    }
  } catch {}
  return null;
}

/**
 * Generate a diagnostic report string
 */
export function generateDiagnosticReport(): string {
  const diag = collectDiagnostics() as any; // Cast for simplicity
  const lines: string[] = [];

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
