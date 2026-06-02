// SPDX-License-Identifier: Apache-2.0
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock fs existsSync
vi.mock('fs', () => {
  const existsSyncMock = vi.fn();
  return {
    __esModule: true,
    default: { existsSync: existsSyncMock },
    existsSync: existsSyncMock,
  };
});

import { existsSync } from 'fs';

// Mock child_process to prevent actual spawning
vi.mock('child_process', () => {
  const spawnMock = vi.fn(() => ({} as any));
  const spawnSyncMock = vi.fn(() => ({} as any));
  return {
    __esModule: true,
    default: { spawn: spawnMock, spawnSync: spawnSyncMock },
    spawn: spawnMock,
    spawnSync: spawnSyncMock,
  };
});
import { spawn, spawnSync } from 'child_process';

import {
  sanitizeBinaryOutput,
  getShellEnv,
  getShellConfig,
  trackDetachedChildPid,
  untrackDetachedChildPid,
  killProcessTree,
  killTrackedDetachedChildren,
} from './shell';

describe('sanitizeBinaryOutput', () => {
  it('removes null bytes', () => {
    expect(sanitizeBinaryOutput('hello\0world')).toBe('helloworld');
  });

  it('removes other control characters (0x01-0x1F except tab, LF, CR)', () => {
    const result = sanitizeBinaryOutput('line1\nline2\x01\x02');
    expect(result).toContain('\n');
    expect(result).not.toContain('\x01');
  });

  it('preserves printable ASCII', () => {
    expect(sanitizeBinaryOutput('Hello World 123!')).toBe('Hello World 123!');
  });

  it('preserves unicode characters', () => {
    expect(sanitizeBinaryOutput('Hello 你好')).toBe('Hello 你好');
  });

  it('removes Unicode format characters (0xfff9-0xfffb)', () => {
    const str = String.fromCharCode(0xfff9) + 'test' + String.fromCharCode(0xfffb);
    expect(sanitizeBinaryOutput(str)).toBe('test');
  });

  it('preserves tabs and carriage returns', () => {
    expect(sanitizeBinaryOutput('a\tb\rc')).toBe('a\tb\rc');
  });

  it('handles empty string', () => {
    expect(sanitizeBinaryOutput('')).toBe('');
  });
});

describe('getShellEnv', () => {
  it('returns a copy of process.env', () => {
    const env = getShellEnv();
    expect(env).toBeInstanceOf(Object);
    env.TEST_VAR = 'test';
    expect((process.env as any).TEST_VAR).toBeUndefined();
  });

  it('includes essential environment variables', () => {
    const env = getShellEnv();
    expect(env.PATH).toBe(process.env.PATH);
  });
});

describe('detached child tracking', () => {
  it('tracks and untracks PIDs without throwing', () => {
    expect(() => trackDetachedChildPid(12345)).not.toThrow();
    expect(() => untrackDetachedChildPid(12345)).not.toThrow();
    expect(() => untrackDetachedChildPid(99999)).not.toThrow();
  });
});

describe('killProcessTree', () => {
  let platformSpy: any;
  let killSpy: any;

  beforeEach(() => {
    process.env = {};
    // Mock process.platform getter
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    // Spy on process.kill and mock to avoid actual kills
    killSpy = vi.spyOn(process, 'kill').mockImplementation(() => undefined as any);
    // Clear spawn mock
    (spawn as any).mockClear();
    (spawnSync as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Windows: calls taskkill with /F /T /PID', () => {
    platformSpy.mockReturnValue('win32');
    // Ensure spawn mock is a function
    (spawn as any).mockImplementation(() => ({}) as any);

    killProcessTree(12345);

    expect(spawn).toHaveBeenCalledWith('taskkill', ['/F', '/T', '/PID', '12345'], {
      stdio: 'ignore',
      detached: true,
    });
  });

  it('Unix: tries process.kill(-pid, SIGKILL) first', () => {
    // Default platform is linux
    killSpy.mockClear();
    killSpy.mockImplementation((pid: number | string, signal: string) => {
      if (pid === -12345) return undefined; // success
      throw new Error('not found');
    });

    killProcessTree(12345);

    expect(killSpy).toHaveBeenCalledWith(-12345, 'SIGKILL');
    expect(killSpy).toHaveBeenCalledTimes(1);
  });

  it('Unix: falls back to process.kill(pid, SIGKILL) if negative kill throws', () => {
    killSpy.mockClear();
    killSpy.mockImplementation((pid: any, signal: string) => {
      if (pid === -12345) throw new Error('no such process');
      if (pid === 12345) return undefined;
      throw new Error('unexpected');
    });

    killProcessTree(12345);

    expect(killSpy).toHaveBeenCalledWith(-12345, 'SIGKILL');
    expect(killSpy).toHaveBeenCalledWith(12345, 'SIGKILL');
    expect(killSpy).toHaveBeenCalledTimes(2);
  });

  it('Unix: swallows errors if both kill attempts fail', () => {
    killSpy.mockClear();
    killSpy.mockImplementation(() => {
      throw new Error('kill failed');
    });

    expect(() => killProcessTree(12345)).not.toThrow();
    expect(killSpy).toHaveBeenCalledTimes(2);
  });
});

describe('killTrackedDetachedChildren', () => {
  let platformSpy: any;
  let killSpy: any;

  beforeEach(() => {
    // Clear any tracked PIDs from previous tests
    killTrackedDetachedChildren();
    // Track some PIDs
    trackDetachedChildPid(111);
    trackDetachedChildPid(222);
    trackDetachedChildPid(333);

    // Default to Unix
    platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    killSpy = vi.spyOn(process, 'kill').mockImplementation(() => undefined as any);
    // spawn is already a mock function from vi.mock; clear it
    (spawn as any).mockClear?.();
  });

  afterEach(() => {
    // Clean up tracked set
    killTrackedDetachedChildren();
    vi.restoreAllMocks();
  });

  it('calls killProcessTree for each tracked PID (Unix: process.kill)', () => {
    // On unix, killProcessTree uses process.kill(-pid)
    killSpy.mockClear();

    killTrackedDetachedChildren();

    // Three PIDs
    expect(killSpy).toHaveBeenCalledTimes(3);
    expect(killSpy).toHaveBeenNthCalledWith(1, -111, 'SIGKILL');
    expect(killSpy).toHaveBeenNthCalledWith(2, -222, 'SIGKILL');
    expect(killSpy).toHaveBeenNthCalledWith(3, -333, 'SIGKILL');

    // Verify set cleared: add new PID and call again
    trackDetachedChildPid(444);
    killSpy.mockClear();
    killTrackedDetachedChildren();
    expect(killSpy).toHaveBeenCalledTimes(1);
    expect(killSpy).toHaveBeenCalledWith(-444, 'SIGKILL');
  });

  it('calls killProcessTree for each tracked PID (Windows: taskkill)', () => {
    // Switch to Windows
    platformSpy.mockReturnValue('win32');
    // Clear spawn and killSpy
    (spawn as any).mockClear?.();
    killSpy.mockClear?.();

    killTrackedDetachedChildren();

    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'taskkill',
      ['/F', '/T', '/PID', '111'],
      expect.anything()
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      'taskkill',
      ['/F', '/T', '/PID', '222'],
      expect.anything()
    );
    expect(spawn).toHaveBeenNthCalledWith(
      3,
      'taskkill',
      ['/F', '/T', '/PID', '333'],
      expect.anything()
    );

    // Verify set cleared: add new PID and call again
    trackDetachedChildPid(444);
    (spawn as any).mockClear?.();
    killTrackedDetachedChildren();
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'taskkill',
      ['/F', '/T', '/PID', '444'],
      expect.anything()
    );
  });

  describe('getShellConfig', () => {
    it('returns config with shell and args for current platform', () => {
      const config = getShellConfig();
      expect(config).toHaveProperty('shell');
      expect(config).toHaveProperty('args');
      expect(Array.isArray(config.args)).toBe(true);
      if (process.platform === 'win32') {
        expect(config.shell).toBe('cmd.exe');
        expect(config.args).toEqual(['/d', '/c']);
      } else if (process.platform === 'darwin') {
        expect(config.shell).toBe('/bin/bash');
        expect(config.args).toEqual(['-l', '-c']);
      } else {
        // Linux or other Unix-like platforms
        // Accept common shells and args
        if (config.shell === '/bin/bash') {
          expect(config.args).toEqual(['-c']);
        } else if (config.shell === '/bin/sh') {
          expect(config.args).toEqual(['-c']);
        } else {
          // Fallback: just check shell is non-empty string and args is array
          expect(typeof config.shell).toBe('string');
          expect(config.shell.length).toBeGreaterThan(0);
          expect(Array.isArray(config.args)).toBe(true);
        }
      }
    });
  });





  // Additional tests for getShellConfig to increase coverage
  describe('getShellConfig (extended)', () => {
    beforeEach(() => {
      (existsSync as any).mockClear();
      (spawnSync as any).mockClear();
    });

    it('throws when custom shell path does not exist', () => {
      (existsSync as any).mockReturnValue(false);
      expect(() => getShellConfig('/nonexistent')).toThrow('Custom shell path not found: /nonexistent');
    });

    it('returns custom shell path when it exists', () => {
      const custom = '/custom/bash';
      (existsSync as any).mockReturnValueOnce(true);
      const config = getShellConfig(custom);
      expect(config.shell).toBe(custom);
      expect(config.args).toEqual(['-c']);
    });

    describe('on Windows', () => {
      let platformSpy: any;
      beforeEach(() => {
        platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
        delete process.env.ProgramFiles;
        delete process.env['ProgramFiles(x86)'];
        (existsSync as any).mockClear();
        (spawnSync as any).mockClear();
      });

      afterEach(() => {
        platformSpy.mockRestore();
      });

      it('prefers Git Bash in Program Files if exists', () => {
        process.env.ProgramFiles = 'C:\Program Files';
        (existsSync as any).mockReturnValueOnce(true).mockReturnValue(false);
        const config = getShellConfig();
        expect(config.shell).toBe('C:\Program Files\Git\bin\bash.exe');
        expect(config.args).toEqual(['-c']);
      });

      it('falls back to "where bash.exe" if Git Bash not found', () => {
        delete process.env.ProgramFiles;
        (existsSync as any).mockReturnValue(false);
        (spawnSync as any).mockReturnValue({
          status: 0,
          stdout: 'C:\some\bash.exe\r\n',
        });
        const config = getShellConfig();
        expect(config.shell).toBe('C:\some\bash.exe');
        expect(config.args).toEqual(['-c']);
      });

      it('throws when no bash found on Windows', () => {
        delete process.env.ProgramFiles;
        (existsSync as any).mockReturnValue(false);
        (spawnSync as any).mockReturnValue({ status: 1, stdout: '' });
        expect(() => getShellConfig()).toThrow('No bash shell found');
      });
    });

    describe('on Unix when bash not found', () => {
      let platformSpy: any;
      beforeEach(() => {
        platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
        (existsSync as any).mockReturnValue(false);
        (spawnSync as any).mockClear();
      });

      afterEach(() => {
        platformSpy.mockRestore();
      });

      it('falls back to sh', () => {
        (spawnSync as any).mockReturnValue({ status: 1, stdout: '' });
        const config = getShellConfig();
        expect(config.shell).toBe('sh');
        expect(config.args).toEqual(['-c']);
      });
    });
  });


  describe('getShellEnv', () => {
    it('returns a shallow copy of process.env', () => {
      const result = getShellEnv();
      expect(result).not.toBe(process.env);
      expect(result).toEqual(process.env);
    });

    it('includes a custom environment variable', () => {
      const testKey = 'TEST_GET_SHELL_ENV_VAR';
      const testValue = 'test_value';
      process.env[testKey] = testValue;
      const result = getShellEnv();
      expect(result[testKey]).toBe(testValue);
      delete process.env[testKey];
    });

    it('mutations to the returned object do not affect process.env', () => {
      const result = getShellEnv();
      result.CUSTOM_VAR = 'value';
      expect(process.env.CUSTOM_VAR).toBeUndefined();
    });
  });

});
