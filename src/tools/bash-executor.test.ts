// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive unit tests for src/tools/bash-executor.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { executeBash, executeBashLocal, BashResult, BashExecutorOptions } from './bash-executor.js';

// Mock process.kill globally to prevent system-wide signals during tests
beforeAll(() => {
  vi.spyOn(process, 'kill').mockImplementation(() => {});
});

// Mock child_process spawn
vi.mock('child_process', async () => {
  const m = {
    spawn: vi.fn(),
  };
  return { ...m, default: m };
});

// Mock fs, os, path used internally
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    existsSync: vi.fn((path: string) => {
      // Track created temp files; for test isolation, use a Set
      return (globalThis as any)._tempFiles?.has(path) ?? false;
    }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn((path: string, data: string, opts?: any) => {
      if (opts?.flag === 'a' || opts?.flag === 'append') {
        // Append to a file in our in-memory tracking
        const files = (globalThis as any)._tempFilesContent ||= new Map();
        const existing = files.get(path) || '';
        files.set(path, existing + data);
      } else {
        const files = (globalThis as any)._tempFilesContent ||= new Map();
        files.set(path, data);
      }
      // Track existence
      (globalThis as any)._tempFiles ??= new Set();
      (globalThis as any)._tempFiles.add(path);
    }),
    unlinkSync: vi.fn((path: string) => {
      (globalThis as any)._tempFiles?.delete(path);
      (globalThis as any)._tempFilesContent?.delete(path);
    }),
    readFileSync: vi.fn((path: string) => {
      return (globalThis as any)._tempFilesContent?.get(path) ?? '';
    }),
  };
});

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    tmpdir: vi.fn(() => '/tmp'),
  };
});

vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: vi.fn((dir: string, ...parts: string[]) => `${dir}/${parts.join('/')}`),
  };
});

describe('executeBash', () => {
  let mockSpawn: any;
  let cp: any;

  beforeEach(async () => {
    // Reset tracking
    (globalThis as any)._tempFiles = new Set();
    (globalThis as any)._tempFilesContent = new Map();
    cp = await import('child_process');
    mockSpawn = cp.spawn;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic execution', () => {
    it('executes command and returns output and exit code', async () => {
      const child = {
        pid: 123,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('hello '));
          }),
        },
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('echo hello');

      expect(result.output).toBe('hello ');
      expect(result.exitCode).toBe(0);
      expect(result.cancelled).toBe(false);
      expect(result.truncated).toBe(false);
      expect(result.fullOutputPath).toBeUndefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringMatching(/^(bash|cmd\.exe)$/),
        expect.arrayContaining(expect.stringMatching('echo hello')),
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'], cwd: expect.any(String), env: expect.any(Object) })
      );
    });

    it('captures stderr separately', async () => {
      const child = {
        pid: 123,
        stdout: { on: vi.fn() },
        stderr: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('error output'));
          }),
        },
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(1);
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('false command');

      expect(result.stderr).toBe('error output');
      expect(result.exitCode).toBe(1);
    });

    it('handles spawn error', async () => {
      const spawnError = new Error('spawn failed');
      mockSpawn.mockImplementation(() => {
        throw spawnError;
      });

      await expect(executeBash('cmd')).rejects.toThrow('spawn failed');
    });
  });

  describe('options: cwd', () => {
    it('uses provided cwd', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => { if (event === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const customCwd = '/custom/cwd';
      await executeBash('pwd', { cwd: customCwd });

      expect(mockSpawn.mock.calls[0][2].cwd).toBe(customCwd);
    });

    it('defaults to process.cwd() when cwd not provided', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      await executeBash('pwd');
      expect(mockSpawn.mock.calls[0][2].cwd).toBe(process.cwd());
    });
  });

  describe('options: env', () => {
    it('uses provided env', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const customEnv = { MY_VAR: 'value' };
      await executeBash('env', { env: customEnv });

      expect(mockSpawn.mock.calls[0][2].env).toBe(customEnv);
    });
  });

  describe('options: timeout', () => {
    it('kills process on timeout', async () => {
      let onCloseCb: ((code: number) => void) | undefined;
      const child = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') onCloseCb = cb;
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const promise = executeBash('sleep 100', { timeout: 10 });

      // Fast-forward time: call the close event after a small delay to simulate the timeout logic
      await new Promise(resolve => setTimeout(resolve, 20));
      if (onCloseCb) onCloseCb(undefined);

      const result = await promise;
      expect(result.cancelled).toBe(false); // note: not using AbortSignal so cancelled is false even if killed
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('options: signal (AbortSignal)', () => {
    it('cancels execution on signal abort', async () => {
      let onCloseCb: ((code: number) => void) | undefined;
      const child = {
        pid: 5678,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') onCloseCb = cb;
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const controller = new AbortController();
      const promise = executeBash('long-running', { signal: controller.signal });

      controller.abort();

      await new Promise(resolve => setTimeout(resolve, 10));
      if (onCloseCb) onCloseCb(undefined);

      const result = await promise;
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('streaming and onChunk', () => {
    it('calls onChunk for each stdout chunk', async () => {
      const chunks: Buffer[] = [Buffer.from('chunk1'), Buffer.from('chunk2'), Buffer.from('chunk3')];
      let chunkIndex = 0;
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') {
              cb(chunks[chunkIndex]);
              chunkIndex++;
            }
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const onChunk = vi.fn();
      await executeBash('cat', { onChunk });

      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(onChunk).toHaveBeenNthCalledWith(1, 'chunk1');
      expect(onChunk).toHaveBeenNthCalledWith(2, 'chunk2');
      expect(onChunk).toHaveBeenNthCalledWith(3, 'chunk3');
    });

    it('calls onChunk for stderr chunks as well', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('err chunk'));
          }),
        },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const onChunk = vi.fn();
      await executeBash('err', { onChunk });

      expect(onChunk).toHaveBeenCalledWith('err chunk');
    });
  });

  describe('output sanitization', () => {
    it('sanitizes binary output with null bytes', async () => {
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from([0x00, 0x01, 0x02, 0x03]));
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('binary');
      expect(result.output).toContain('?');
    });

    it('keeps valid UTF-8 unchanged', async () => {
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('Hello UTF-8 你好'));
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('echo');
      expect(result.output).toBe('Hello UTF-8 你好');
    });
  });

  describe('truncation (bytes)', () => {
    it('truncates output when exceeding maxBytes', async () => {
      const largeChunk = Buffer.alloc(2 * 1024 * 1024, 'a'); // 2MB
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(largeChunk);
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('big', { maxBytes: 1024 * 1024 }); // 1MB

      expect(result.truncated).toBe(true);
      expect(result.fullOutputPath).toBeDefined();
      // The output should be truncated to maxLines or near maxBytes
    });

    it('creates temp file when truncated', async () => {
      const largeChunk = Buffer.alloc(2 * 1024 * 1024, 'b');
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(largeChunk);
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('big', { maxBytes: 1024 * 1024 });

      // Check that temp file was written
      const fs = await import('fs');
      expect((fs as any).writeFileSync).toHaveBeenCalled();
      expect(result.fullOutputPath).toBeDefined();
    });

    it('cleans up temp file when not truncated', async () => {
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('small'));
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('small', { maxBytes: 1024 * 1024 });

      expect(result.truncated).toBe(false);
      expect(result.fullOutputPath).toBeUndefined();
    });
  });

  describe('truncation (lines)', () => {
    it('truncates when exceeding maxLines', async () => {
      const manyLines = Buffer.from(Array(20000).fill('line\n').join(''));
      const child = {
        pid: 1,
        stdout: {
          on: vi.fn((event, cb) => {
            if (event === 'data') cb(manyLines);
          }),
        },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBash('many', { maxLines: 10000 });

      expect(result.truncated).toBe(true);
    });
  });

  describe('cancellation and exit code', () => {
    it('sets cancelled=false for normal exit', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);
      const result = await executeBash('true');
      expect(result.cancelled).toBe(false);
    });

    it('returns exitCode undefined when process is killed', async () => {
      let closeCb: ((code: number) => void) | undefined;
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, cb) => {
          if (event === 'close') closeCb = cb;
        }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const controller = new AbortController();
      const promise = executeBash('cmd', { signal: controller.signal });

      // Simulate abort before close
      controller.abort();
      await new Promise(r => setTimeout(r, 5));
      if (closeCb) closeCb(undefined); // no exit code

      const result = await promise;
      expect(result.exitCode).toBeUndefined();
    });
  });

  describe('platform-specific shell', () => {
    it('uses bash on Unix-like platforms', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      // Temporarily set platform to non-win32
      const original = process.platform;
      // @ts-ignore
      process.platform = 'linux';

      await executeBash('echo hi');

      expect(mockSpawn).toHaveBeenCalledWith('bash', expect.arrayContaining(['-c', 'echo hi']), expect.anything());

      // restore
      // @ts-ignore
      process.platform = original;
    });

    it('uses cmd.exe on Windows', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const original = process.platform;
      // @ts-ignore
      process.platform = 'win32';

      await executeBash('echo hi');

      expect(mockSpawn).toHaveBeenCalledWith('cmd.exe', expect.arrayContaining(['/c', 'echo hi']), expect.anything());

      // restore
      // @ts-ignore
      process.platform = original;
    });
  });

  describe('executeBashLocal', () => {
    it('forwards to executeBash with cwd', async () => {
      const child = {
        pid: 1,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((ev, cb) => { if (ev === 'close') cb(0); }),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(child);

      const result = await executeBashLocal('pwd', '/custom/cwd');

      expect(result).toBeDefined();
      // verify spawn called with cwd = '/custom/cwd'
      expect(mockSpawn.mock.calls[0][2].cwd).toBe('/custom/cwd');
    });
  });
});
