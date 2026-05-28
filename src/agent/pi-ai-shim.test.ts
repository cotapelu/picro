import { describe, it, expect } from 'vitest';
import { isContextOverflow } from './pi-ai-shim.js';

describe('isContextOverflow', () => {
  it('returns true if stopReason is context_overflow', () => {
    expect(isContextOverflow({ stopReason: 'context_overflow' }, 100000)).toBe(true);
  });

  it('returns true if usage.total exceeds contextWindow', () => {
    const message = {
      usage: { total: 150000, input: 100000, output: 50000 },
    };
    expect(isContextOverflow(message, 100000)).toBe(true);
  });

  it('returns false if usage.total within limit', () => {
    const message = {
      usage: { total: 80000, input: 50000, output: 30000 },
    };
    expect(isContextOverflow(message, 100000)).toBe(false);
  });

  it('returns false when no usage and stopReason not overflow', () => {
    const message = { stopReason: 'stop' };
    expect(isContextOverflow(message, 100000)).toBe(false);
  });

  it('handles undefined message gracefully', () => {
    // @ts-ignore intentional test
    expect(isContextOverflow(undefined, 100000)).toBe(false);
  });

  it('handles null message', () => {
    // @ts-ignore
    expect(isContextOverflow(null, 100000)).toBe(false);
  });

  it('handles zero contextWindow', () => {
    const message = { usage: { total: 100 } };
    expect(isContextOverflow(message, 0)).toBe(true);
  });

  it('returns false when usage is undefined', () => {
    const message = { stopReason: 'stop' };
    expect(isContextOverflow(message, 50000)).toBe(false);
  });
});
