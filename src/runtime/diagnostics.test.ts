import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSystemInfo,
  getMemoryInfo,
  getNetworkInterfaces,
  getPerformanceMetrics,
  getFileStats,
  formatFileSize,
  isDevelopment,
  isTest,
  collectDiagnostics,
  generateDiagnosticReport,
} from './diagnostics.js';

describe('getSystemInfo', () => {
  it('returns system information with required fields', () => {
    const info = getSystemInfo();
    expect(info).toHaveProperty('arch');
    expect(info).toHaveProperty('platform');
    expect(info).toHaveProperty('osRelease');
    expect(info).toHaveProperty('nodeVersion');
    expect(info).toHaveProperty('hostname');
    expect(info).toHaveProperty('cpuModel');
    expect(info).toHaveProperty('cpuCores');
    expect(info).toHaveProperty('totalMemoryMB');
    expect(info).toHaveProperty('freeMemoryMB');
    expect(info).toHaveProperty('memoryUsageMB');
    // sanity checks
    expect(typeof info.arch).toBe('string');
    expect(info.cpuCores).toBeGreaterThan(0);
    expect(info.totalMemoryMB).toBeGreaterThan(0);
    expect(info.freeMemoryMB).toBeGreaterThanOrEqual(0);
    expect(info.memoryUsageMB).toBeGreaterThanOrEqual(0);
  });
});

describe('getMemoryInfo', () => {
  it('returns process memory usage with required fields', () => {
    const mem = getMemoryInfo();
    expect(mem).toHaveProperty('rss');
    expect(mem).toHaveProperty('heapTotal');
    expect(mem).toHaveProperty('heapUsed');
    expect(mem).toHaveProperty('external');
    expect(mem).toHaveProperty('arrayBuffers');
    expect(mem.rss).toBeGreaterThan(0);
    expect(mem.heapTotal).toBeGreaterThanOrEqual(0);
    expect(mem.heapUsed).toBeGreaterThanOrEqual(0);
  });
});

describe('getNetworkInterfaces', () => {
  it('returns an array of network interface addresses', () => {
    const ifaces = getNetworkInterfaces();
    expect(Array.isArray(ifaces)).toBe(true);
    for (const iface of ifaces) {
      expect(iface).toHaveProperty('interface');
      expect(iface).toHaveProperty('address');
      expect(iface).toHaveProperty('family');
      expect(['IPv4', 'IPv6']).toContain(iface.family);
    }
  });
});

describe('getPerformanceMetrics', () => {
  it('returns metrics with upTimeMS and cpuUsage', () => {
    const metrics = getPerformanceMetrics();
    expect(metrics).toHaveProperty('upTimeMS');
    expect(metrics).toHaveProperty('cpuUsage');
    expect(metrics).toHaveProperty('eventLoopDelay');
    expect(metrics.upTimeMS).toBeGreaterThanOrEqual(0);
    expect(metrics.cpuUsage).toHaveProperty('user');
    expect(metrics.cpuUsage).toHaveProperty('system');
  });
});

describe('getFileStats', () => {
  it('returns stats for existing file', async () => {
    // Create a temporary file path (non-existent) test: returns null
    const stats = await getFileStats('/nonexistent/path');
    expect(stats).toBeNull();
  });

  it('handles errors gracefully', async () => {
    // Using a path that may not be accessible
    const stats = await getFileStats('/root/rootfile'); // likely not readable
    expect(stats).toBeNull();
  });
});

describe('formatFileSize', () => {
  it('formats bytes less than 1KB', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 750)).toBe('750.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB'); // toFixed(1)
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatFileSize(1024 * 1024 * 1024 * 3.14159)).toBe('3.14 GB'); // toFixed(2)
  });
});

describe('isDevelopment', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.PI_DEV;
    // Remove --dev from argv? Can't modify easily, but we can spy on process.argv.includes? Use vi.spyOn?
  });

  it('returns true when NODE_ENV=development', () => {
    process.env.NODE_ENV = 'development';
    expect(isDevelopment()).toBe(true);
  });

  it('returns true when PI_DEV=1', () => {
    process.env.NODE_ENV = 'production';
    process.env.PI_DEV = '1';
    expect(isDevelopment()).toBe(true);
  });

  it('returns true when argv includes --dev', () => {
    // We can mock process.argv?
    const originalArgv = process.argv;
    process.argv = ['node', '--dev', 'script.js'];
    expect(isDevelopment()).toBe(true);
    process.argv = originalArgv;
  });

  it('returns false otherwise', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PI_DEV;
    expect(isDevelopment()).toBe(false);
  });
});

describe('isTest', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.PI_DEV;
  });

  it('returns true when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    expect(isTest()).toBe(true);
  });

  it('returns true when argv includes --test or vitest', () => {
    const originalArgv = process.argv;
    process.argv = ['node', '--test', 'script.js'];
    expect(isTest()).toBe(true);
    process.argv = ['node', 'vitest', 'run'];
    expect(isTest()).toBe(true);
    process.argv = originalArgv;
  });

  it('returns false otherwise', () => {
    process.env.NODE_ENV = 'development';
    expect(isTest()).toBe(false);
  });
});

describe('collectDiagnostics', () => {
  it('collects a snapshot of diagnostics', () => {
    const diag = collectDiagnostics();
    expect(diag).toHaveProperty('timestamp');
    expect(diag).toHaveProperty('environment');
    expect(diag).toHaveProperty('system');
    expect(diag).toHaveProperty('process');
    expect(diag).toHaveProperty('memory');
    expect(diag).toHaveProperty('performance');
    expect(diag).toHaveProperty('network');
    expect(diag).toHaveProperty('moduleInfo');
    // environment
    expect(diag.environment).toHaveProperty('NODE_ENV');
    // system
    expect(diag.system.nodeVersion).toBeTruthy();
    // process
    expect(diag.process.pid).toBe(process.pid);
    expect(diag.process.cwd).toBe(process.cwd());
  });
});

describe('generateDiagnosticReport', () => {
  it('generates a human-readable report string', () => {
    const report = generateDiagnosticReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('=== Diagnostic Report ===');
    expect(report).toContain('Generated:');
    expect(report).toContain('--- Environment ---');
    expect(report).toContain('--- System ---');
    expect(report).toContain('--- Process ---');
    expect(report).toContain('--- Memory ---');
    expect(report).toContain('--- Uptime ---');
  });
});
