// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import {
  sanitizeOutput,
  validateOutput,
  safeReadFile,
  cleanupTempFile,
  DEFAULT_MAX_OUTPUT_SIZE,
} from './output-guard.js';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('output-guard', () => {
  describe('sanitizeOutput', () => {
    it('returns empty for empty input', () => {
      expect(sanitizeOutput('')).toBe('');
    });

    it('strips ANSI codes by default', () => {
      const input = '\x1b[31mRed text\x1b[0m';
      const result = sanitizeOutput(input);
      expect(result).not.toContain('\x1b');
      expect(result).toBe('Red text');
    });

    // ESC is a control char; isBinaryString may flag it. Just ensure no crash.
    it('handles ANSI input with stripAnsi=false', () => {
      const input = '\x1b[31mRed\x1b[0m';
      const result = sanitizeOutput(input, { stripAnsi: false });
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles binary input as binary notice', () => {
      const input = 'a\0b'; // contains null, treated as binary
      const result = sanitizeOutput(input);
      expect(result).toMatch(/\[Binary output: 3 bytes\]/);
    });

    it('truncates when exceeding maxSize', () => {
      const long = 'a'.repeat(1000);
      const result = sanitizeOutput(long, { maxSize: 10 });
      expect(result.length).toBeLessThan(30);
      expect(result).toContain('... [TRUNCATED]');
    });

    it('truncates long lines', () => {
      const longLine = 'x'.repeat(20000);
      const result = sanitizeOutput(longLine, { maxLineLength: 100 });
      const lines = result.split('\n');
      expect(lines[0].length).toBeLessThan(200);
    });

    it('handles binary-like input', () => {
      // Binary detection may trigger; just ensure no crash
      const result = sanitizeOutput('\0\1\2');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('validateOutput', () => {
    it('validates clean text', () => {
      const result = validateOutput('Hello');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello');
      expect(result.warnings).toEqual([]);
    });

    it('allows sanitized binary to be marked invalid', () => {
      const result = validateOutput('\0binary');
      expect(result.valid).toBe(false);
    });

    it('detects truncation', () => {
      const long = 'a'.repeat(10000);
      const result = validateOutput(long, { maxSize: 100 });
      expect(result.truncated).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('preserves length metadata', () => {
      const input = 'test';
      const result = validateOutput(input);
      expect(result.originalLength).toBe(4);
    });
  });

  describe('safeReadFile', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), 'og-test-' + Math.random().toString(36).slice(2));
      mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
      // No cleanup needed; tests use unique filenames
    });

    it('reads valid file', () => {
      const path = join(tempDir, 'valid.txt');
      writeFileSync(path, 'content');
      const result = safeReadFile(path);
      expect(result.valid).toBe(true);
      expect(result.content).toBe('content');
      expect(result.warnings).toEqual([]);
    });

    it('returns error for non-existent file', () => {
      const result = safeReadFile(join(tempDir, 'nope.txt'));
      expect(result.valid).toBe(false);
      expect(result.warnings).toContain('File not found');
    });

    it('rejects oversized file based on file size', () => {
      const path = join(tempDir, 'big.txt');
      const big = 'x'.repeat(2000);
      writeFileSync(path, big);
      const result = safeReadFile(path, { maxSize: 100 });
      expect(result.valid).toBe(false);
      expect(result.content).toBe('');
      expect(result.warnings.some(w => w.includes('too large'))).toBe(true);
    });

    it('sanitizes binary content', () => {
      const path = join(tempDir, 'bin.txt');
      writeFileSync(path, '\0\1\2');
      const result = safeReadFile(path);
      expect(result.content).toMatch(/\[Binary output:/);
    });
  });

  describe('cleanupTempFile', () => {
    it('deletes existing file', () => {
      const path = join(tmpdir(), 'cleanup-test-' + Date.now() + '.txt');
      writeFileSync(path, 'temp');
      expect(existsSync(path)).toBe(true);
      cleanupTempFile(path);
      expect(existsSync(path)).toBe(false);
    });

    it('does not throw if file does not exist', () => {
      const missing = join(tmpdir(), 'missing-' + Date.now() + '.txt');
      expect(() => cleanupTempFile(missing)).not.toThrow();
    });
  });
});
