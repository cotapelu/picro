import { describe, it, expect } from 'vitest';
import { now, measure } from './timings.js';

describe('timings (extra)', () => {
  it('now returns a high-resolution time value', () => {
    const t = now();
    expect(typeof t).toBe('number');
    expect(t).toBeGreaterThan(0);
  });

  it('measure returns elapsed time for a sync function', () => {
    const result = measure(() => {});
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('measure propagates errors thrown by the measured function', () => {
    const err = new Error('fail');
    expect(() => measure(() => { throw err; })).toThrow(err);
  });
});
