// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests for the settings file lock.
 *
 * The stale-lock detection only recognised a PID that parsed as a number, so a
 * lock file that held no PID (crash between creating the file and writing the
 * PID) was re-detected as "live" forever and every later write threw
 * "Failed to acquire lock". It also treated any process.kill() failure as stale,
 * which steals a lock that merely belongs to another user (EPERM).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SettingsManager } from './settings-manager.js';

describe('SettingsManager - lock resilience', () => {
  let cwd: string;
  let agentDir: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'picro-settings-cwd-'));
    agentDir = mkdtempSync(join(tmpdir(), 'picro-settings-agent-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(agentDir, { recursive: true, force: true });
  });

  it('recovers when the lock file holds no PID', async () => {
    const settingsPath = join(agentDir, 'settings.json');
    const lockPath = `${settingsPath}.lock`;
    // Simulate a crash between openSync(lockPath, 'wx') and writeFileSync(lockPath, pid).
    writeFileSync(lockPath, '');

    const manager = SettingsManager.create(cwd, agentDir);
    manager.setDefaultProvider('openai');
    await manager.flush();

    expect(existsSync(settingsPath)).toBe(true);
    const persisted = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(persisted.defaultProvider).toBe('openai');
  });

  it('does not leave the lock file behind after a successful write', async () => {
    const settingsPath = join(agentDir, 'settings.json');
    const manager = SettingsManager.create(cwd, agentDir);
    manager.setTheme('dark');
    await manager.flush();
    expect(existsSync(`${settingsPath}.lock`)).toBe(false);
  });

  it('does not steal a lock owned by a live process (EPERM)', async () => {
    const settingsPath = join(agentDir, 'settings.json');
    const lockPath = `${settingsPath}.lock`;
    // PID 1 always exists and is not killable by an unprivileged user on Linux,
    // so process.kill(1, 0) fails with EPERM: the lock must be treated as live.
    const originalKill = process.kill.bind(process);
    const killSpy = ((pid: number, signal: number | string) => {
      if (pid === 1 && signal === 0) {
        const err: any = new Error('kill EPERM');
        err.code = 'EPERM';
        throw err;
      }
      return originalKill(pid, signal as any);
    }) as typeof process.kill;
    (process as any).kill = killSpy;

    try {
      writeFileSync(lockPath, '1\n');
      const manager = SettingsManager.create(cwd, agentDir);
      manager.setDefaultModel('gpt-4');
      // The write never throws to the caller (enqueueWrite records the failure),
      // but it must NOT delete the other process's lock and overwrite the file.
      await manager.flush();
      expect(existsSync(lockPath)).toBe(true);
      expect(existsSync(settingsPath)).toBe(false);
      const errors = manager.drainErrors();
      expect(errors.some((e) => /Failed to acquire lock/.test(e.error.message))).toBe(true);
    } finally {
      (process as any).kill = originalKill;
    }
  });
});
