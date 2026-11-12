// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests for ContextBuilder.build().
 *
 * When the mandatory tail (system turns + `minMessages` recent turns) is itself
 * larger than maxTokens, the old implementation retried with the same oversized
 * history forever and died with "Maximum call stack size exceeded".
 */

import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './context-manager.js';

describe('ContextBuilder - token limits', () => {
  it('returns instead of recursing when the kept tail exceeds maxTokens', () => {
    const builder = new ContextBuilder({ maxTokens: 10000, reservedTokens: 1000, minMessages: 5 });
    const base = 'y'.repeat(5000); // ~1250 tokens, leaves room for history
    const turns = Array.from({ length: 6 }, (_, i) => ({
      role: 'user',
      content: [{ type: 'text', text: `z${'z'.repeat(10000)}${i}` }],
      timestamp: Date.now(),
    })) as any;

    const result = builder.build(base, turns);

    expect(result.tokenCount).toBeGreaterThan(10000);
    expect(result.prompt.startsWith(base)).toBe(true);
  });

  it('truncates history when it fits', () => {
    const builder = new ContextBuilder({ maxTokens: 100000, reservedTokens: 1000, minMessages: 2 });
    const turns = Array.from({ length: 20 }, (_, i) => ({
      role: 'user',
      content: [{ type: 'text', text: `m${i}` }],
      timestamp: Date.now(),
    })) as any;

    const result = builder.build('base', turns);

    expect(result.tokenCount).toBeLessThanOrEqual(100000);
    // 20 short messages fit entirely.
    expect(result.prompt).toContain('[Conversation History]');
  });

  it('returns an empty history when the budget is negative', () => {
    const builder = new ContextBuilder({ maxTokens: 100, reservedTokens: 5000, minMessages: 5 });
    const turns = [
      { role: 'user', content: [{ type: 'text', text: 'hello' }], timestamp: 1 },
    ] as any;

    const result = builder.build('base', turns);

    expect(result.prompt).toBe('base');
  });
});
