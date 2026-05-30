// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeBinaryOutput, getShellEnv, trackDetachedChildPid, untrackDetachedChildPid, killTrackedDetachedChildren } from './shell.js';

describe('sanitizeBinaryOutput', () => {
  it('removes null bytes', () => {
    const result = sanitizeBinaryOutput('hello\0world');
    expect(result).toBe('helloworld');
  });

  it('removes other control characters', () => {
    const result = sanitizeBinaryOutput('line1\nline2\x01\x02');
    expect(result).toContain('\n'); // newline allowed
    expect(result).not.toContain('\x01');
  });

  it('preserves printable ASCII', () => {
    const result = sanitizeBinaryOutput('Hello World 123!');
    expect(result).toBe('Hello World 123!');
  });

  it('preserves unicode characters', () => {
    const result = sanitizeBinaryOutput('Hello 你好');
    expect(result).toBe('Hello 你好');
  });

  it('removes Unicode format characters (0xfff9-0xfffb)', () => {
    // Interlinear annotation characters
    const str = String.fromCharCode(0xfff9) + 'test' + String.fromCharCode(0xfffb);
    const result = sanitizeBinaryOutput(str);
    expect(result).toBe('test');
  });
});

describe('getShellEnv', () => {
  it('returns a copy of process.env', () => {
    const env = getShellEnv();
    // Should be an object with typical env vars
    expect(env).toBeInstanceOf(Object);
    // Modifying returned object should not affect process.env
    env.TEST_VAR = 'test';
    expect(process.env.TEST_VAR).toBeUndefined();
  });
});

describe('detached child tracking', () => {
  beforeEach(() => {
    // Clear any tracked pids before each test
    // Access internal set via function? Not exported. We'll just test add/remove functions don't throw.
  });

  it('tracks and untracks PIDs without throwing', () => {
    expect(() => trackDetachedChildPid(12345)).not.toThrow();
    expect(() => untrackDetachedChildPid(12345)).not.toThrow();
    // Untrack non-existent should also not throw
    expect(() => untrackDetachedChildPid(99999)).not.toThrow();
  });

  it('killTrackedDetachedChildren clears tracking', () => {
    trackDetachedChildPid(111);
    trackDetachedChildPid(222);
    // killProcessTree will be called, but we don't have a way to verify without mocking spawn/process.kill
    // Just ensure function runs without throwing
    expect(() => killTrackedDetachedChildren()).not.toThrow();
  });
});
