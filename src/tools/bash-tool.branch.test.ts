// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for src/tools/bash-tool.js.
 * Focuses on createBashHandler, createBashToolDefinition, createBashTool, and isBashToolResult.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('node:fs', () => ({ default: {}, existsSync: vi.fn() }));
vi.mock('node:os', () => ({ default: {}, tmpdir: vi.fn() }));
vi.mock('node:path', () => ({ default: {}, join: vi.fn() }));
vi.mock('node:crypto', () => ({ default: {}, randomBytes: vi.fn() }));
vi.mock('child_process', () => ({ default: {}, spawn: vi.fn() }));

import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'child_process';

import {
  createBashToolDefinition,
  createBashTool,
  isBashToolResult,
} from './bash-tool.js';

// Helper to create a mock child process with controllable event emitters
function makeMockChild(opts: {
  data?: string;
  exitCode?: number;
  error?: Error;
  pid?: number;
} = {}) {
  let stdoutCb: (data: Buffer) => void = () => {};
  let stderrCb: (data: Buffer) => void = () => {};
  let closeCb: (code: number) => void = () => {};
  let errorCb: (err: Error) => void = () => {};

  const child: any = {
    pid: opts.pid ?? 123,
    stdout: {
      on: vi.fn((event: string, cb: any) => {
        if (event === 'data') stdoutCb = cb;
      }),
    },
    stderr: {
      on: vi.fn((event: string, cb: any) => {
        if (event === 'data') stderrCb = cb;
      }),
    },
    on: vi.fn((event: string, cb: any) => {
      if (event === 'close') closeCb = cb;
      if (event === 'error') errorCb = cb;
    }),
    // Helpers to simulate events
    _emitData: (d: string) => stdoutCb(Buffer.from(d)),
    _emitErrorData: (d: string) => stderrCb(Buffer.from(d)),
    _emitClose: (code: number) => closeCb(code),
    _emitError: (err: Error) => errorCb(err),
  };

  return child;
}

describe('bash-tool branches', () => {
  let handler: (args: any, context?: any) => Promise<string>;
  let mockChild: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations for Node builtins
    (existsSync as any).mockReturnValue(true);
    (tmpdir as any).mockReturnValue('/tmp');
    (join as any).mockImplementation((dir: string, file: string) => `${dir}/${file}`);
    (randomBytes as any).mockReturnValue({ toString: () => 'abc' } as any);

    // Reset spawn mock
    (spawn as any).mockClear();

    // Create a fresh handler for each test
    const definition = createBashToolDefinition('/test/cwd', {});
    handler = definition.handler;
  });

  describe('createBashToolDefinition', () => {
    it('returns a valid tool definition', () => {
      const def = createBashToolDefinition('/cwd', {});
      expect(def.name).toBe('bash');
      expect(typeof def.handler).toBe('function');
      expect(def.parameters).toEqual({
        type: 'object',
        properties: {
          command: { type: 'string', description: expect.any(String) },
          timeout: { type: 'number', description: expect.any(String) },
        },
        required: ['command'],
      });
    });
  });

  describe('createBashTool', () => {
    it('returns tool with execute alias', () => {
      const tool = createBashTool('/cwd', {});
      expect(tool.execute).toBe(tool.handler);
    });
  });

  describe('createBashHandler command validation', () => {
    it('throws if command is missing', async () => {
      await expect(handler({})).rejects.toThrow('command is required');
    });

    it('throws if command is not a string', async () => {
      await expect(handler({ command: 123 })).rejects.toThrow('command is required');
    });
  });

  describe('cwd existence check', () => {
    it('returns error string when cwd does not exist', async () => {
      (existsSync as any).mockReturnValue(false);
      const result = await handler({ command: 'test' });
      expect(result).toContain('Working directory does not exist');
    });
  });

  describe('successful execution', () => {
    beforeEach(() => {
      mockChild = makeMockChild();
      (spawn as any).mockReturnValue(mockChild);
    });

    it('returns stdout output', async () => {
      const promise = handler({ command: 'echo hello' });
      mockChild._emitData('Hello World');
      mockChild._emitClose(0);
      const result = await promise;
      expect(result).toBe('Hello World');
    });

    it('replaces empty output with placeholder', async () => {
      const promise = handler({ command: 'cmd' });
      mockChild._emitClose(0);
      const result = await promise;
      expect(result).toBe('(empty output)');
    });

    it('appends exit code note for non-zero exit', async () => {
      const promise = handler({ command: 'cmd' });
      mockChild._emitClose(1);
      const result = await promise;
      expect(result).toContain('[Exit code: 1]');
    });

    it('combines stdout and stderr', async () => {
      const promise = handler({ command: 'cmd' });
      mockChild._emitData('out');
      mockChild._emitErrorData('err');
      mockChild._emitClose(0);
      const result = await promise;
      expect(result).toBe('outerr');
    });

    it('truncates output exceeding maxBytes and adds note', async () => {
      const big = 'x'.repeat(200000); // > 100KB
      const promise = handler({ command: 'cmd' });
      mockChild._emitData(big);
      mockChild._emitClose(0);
      const result = await promise;
      expect(result.length).toBeLessThan(big.length);
      expect(result).toContain('[Output truncated,');
    });
  });

  describe('error handling', () => {
    it('returns error string when spawn throws', async () => {
      (spawn as any).mockImplementation(() => {
        throw new Error('spawn failed');
      });
      const result = await handler({ command: 'test' });
      expect(result).toBe('Error: spawn failed');
    });

    it('returns error string when child emits error', async () => {
      mockChild = makeMockChild();
      (spawn as any).mockReturnValue(mockChild);
      const promise = handler({ command: 'test' });
      mockChild._emitError(new Error('child crashed'));
      const result = await promise;
      expect(result).toBe('Error: child crashed');
    });
  });

  describe('timeout handling', () => {
    it('includes timed out note when timeout occurs', async () => {
      vi.useFakeTimers();
      mockChild = makeMockChild();
      (spawn as any).mockReturnValue(mockChild);

      // Mock process.kill to avoid actual signals during timeout
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {});

      // Provide a short timeout (1 second)
      const promise = handler({ command: 'test', timeout: 1 });

      // Advance timers to trigger the timeout (just over 1s)
      await vi.advanceTimersByTimeAsync(1100);

      // After timeout, simulate child close (as if killed)
      mockChild._emitClose(0);

      const result = await promise;
      expect(result).toContain('[Command timed out]');

      // Cleanup
      killSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('isBashToolResult', () => {
    it('returns true for non-empty string', () => {
      expect(isBashToolResult('some output')).toBe(true);
    });
    it('returns false for empty string', () => {
      expect(isBashToolResult('')).toBe(false);
    });
    it('returns false for non-string', () => {
      expect(isBashToolResult(null as any)).toBe(false);
      expect(isBashToolResult(undefined as any)).toBe(false);
      expect(isBashToolResult(123 as any)).toBe(false);
      expect(isBashToolResult({} as any)).toBe(false);
    });
  });
});
