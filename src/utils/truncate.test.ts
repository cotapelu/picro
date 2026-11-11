import { describe, it, expect } from 'vitest';
import {
  truncateHead,
  truncateTail,
  truncateLine,
  formatSize,
  DEFAULT_MAX_LINES,
  DEFAULT_MAX_BYTES,
} from './truncate.js';

describe('truncateHead', () => {
  it('returns content unchanged when within limits', () => {
    const content = 'line1\nline2\nline3';
    const result = truncateHead(content, { maxLines: 10, maxBytes: 1000 });
    expect(result.content).toBe(content);
    expect(result.truncated).toBe(false);
    expect(result.truncatedBy).toBeNull();
    expect(result.outputLines).toBe(3);
  });

  it('truncates by lines when exceeding line limit', () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line${i}`).join('\n');
    const result = truncateHead(lines, { maxLines: 3, maxBytes: 1000 });
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('lines');
    expect(result.outputLines).toBe(3);
    expect(result.content.split('\n').length).toBe(3);
  });

  it('truncates by bytes when byte limit hit before line limit', () => {
    const longLine = 'a'.repeat(DEFAULT_MAX_BYTES + 100);
    const content = longLine + '\nsecond';
    const result = truncateHead(content, { maxBytes: DEFAULT_MAX_BYTES });
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('bytes');
    expect(result.firstLineExceedsLimit).toBe(true);
    expect(result.content).toBe('');
  });

  it('handles first line exceeding byte limit', () => {
    const longLine = 'a'.repeat(DEFAULT_MAX_BYTES + 1);
    const result = truncateHead(longLine, { maxBytes: DEFAULT_MAX_BYTES });
    expect(result.firstLineExceedsLimit).toBe(true);
    expect(result.content).toBe('');
    expect(result.outputLines).toBe(0);
  });

  it('outputs correct byte count for ASCII', () => {
    const content = 'hello world';
    const result = truncateHead(content);
    expect(result.totalBytes).toBe(content.length);
    expect(result.outputBytes).toBe(content.length);
  });
});

describe('truncateTail', () => {
  it('returns content unchanged when within limits', () => {
    const content = 'line1\nline2\nline3';
    const result = truncateTail(content, { maxLines: 10, maxBytes: 1000 });
    expect(result.truncated).toBe(false);
  });

  it('truncates by lines from tail', () => {
    const lines = Array.from({ length: 5 }, (_, i) => `line${i}`).join('\n');
    const result = truncateTail(lines, { maxLines: 2, maxBytes: 1000 });
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('lines');
    expect(result.content).toContain('line3');
    expect(result.content.split('\n').length).toBe(2);
  });

  it('truncates by bytes from tail', () => {
    const content = '1234567890\n'.repeat(100);
    const result = truncateTail(content, { maxBytes: 50 });
    expect(result.truncated).toBe(true);
    expect(result.truncatedBy).toBe('bytes');
    expect(result.outputBytes).toBeLessThanOrEqual(50);
  });

  it('handles partial line when bytes limit forces', () => {
    const content = 'short\nlonger line here\n';
    const result = truncateTail(content, { maxBytes: 10, maxLines: 10 });
    expect(result.truncated).toBe(true);
  });
});

describe('truncateLine', () => {
  it('returns line unchanged when within limit', () => {
    const result = truncateLine('short line', 100);
    expect(result.text).toBe('short line');
    expect(result.wasTruncated).toBe(false);
  });

  it('truncates line with ellipsis', () => {
    const result = truncateLine('this is a very long line', 10);
    expect(result.text).toContain('... [truncated]');
    expect(result.wasTruncated).toBe(true);
  });
});

describe('formatSize', () => {
  it('formats bytes correctly', () => {
    expect(formatSize(0)).toBe('0B');
    expect(formatSize(1024)).toBe('1.0KB');
    expect(formatSize(1024 * 1024)).toBe('1.0MB');
  });
});

describe('constants', () => {
  it('DEFAULT_MAX_LINES is defined', () => {
    expect(DEFAULT_MAX_LINES).toBeGreaterThan(0);
  });

  it('DEFAULT_MAX_BYTES is defined', () => {
    expect(DEFAULT_MAX_BYTES).toBeGreaterThan(0);
  });
});
