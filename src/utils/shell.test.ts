// SPDX-License-Identifier: Apache-2.0
import { vi, describe, it, expect } from 'vitest';

// Mock fs existsSync to avoid real filesystem access during module load
vi.mock('fs', () => ({
  __esModule: true,
  default: {},
  existsSync: vi.fn(),
}));

import { existsSync } from 'fs';
import { sanitizeBinaryOutput, getShellEnv, getShellConfig, trackDetachedChildPid, untrackDetachedChildPid } from './shell';

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

// getShellConfig tests require complex mocking; skipping for now.
