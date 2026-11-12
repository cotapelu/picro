// SPDX-License-Identifier: Apache-2.0
/**
 * Model search, refresh coordination, render bus and native-modifier probes.
 *
 * These were audited line by line this round and behaved correctly; the tests
 * below lock in the contract (shared in-flight refresh with independent abort,
 * per-subscriber render delivery, "distinct name" detection) so a future
 * regression is caught.
 */

import { describe, it, expect, vi } from 'vitest';
import { getDistinctModelName, getModelSearchText, getModelSelectorSearchText } from './ModelSearch.js';
import { refreshModelCatalogs, type ModelCatalogRuntime, type ModelsRefreshResult } from './ModelCatalogRefresh.js';
import { isNativeModifierPressed } from './NativeModifiers.js';
import { requestRenderBus } from './RenderBus.js';

describe('getModelSearchText', () => {
  it('includes the id, the provider and the combined form', () => {
    const text = getModelSearchText({ id: 'gpt-5', provider: 'openai' });
    expect(text).toContain('gpt-5');
    expect(text).toContain('openai');
    expect(text).toContain('openai/gpt-5');
  });

  it('includes the display name when present', () => {
    expect(getModelSearchText({ id: 'x', provider: 'p', name: 'Pretty Name' })).toContain('Pretty Name');
  });
});

describe('getModelSelectorSearchText', () => {
  it('prefers provider-prefixed queries over bare ids', () => {
    const text = getModelSelectorSearchText({ id: 'gpt-5', provider: 'openrouter' });
    expect(text.startsWith('openrouter')).toBe(true);
    expect(text).toContain('openrouter/gpt-5');
  });
});

describe('getDistinctModelName', () => {
  it('returns the name when it carries words the id does not', () => {
    expect(getDistinctModelName({ id: 'minimax/minimax-m3', name: 'MiniMax M3 [rasmus@openrouter, parasail]' }))
      .toBe('MiniMax M3 [rasmus@openrouter, parasail]');
  });

  it('returns undefined when the name only restates the id', () => {
    expect(getDistinctModelName({ id: 'gpt-5', name: 'GPT-5' })).toBeUndefined();
    expect(getDistinctModelName({ id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' })).toBeUndefined();
  });

  it('treats a single-character word as covered only by an exact token', () => {
    // "4" is not inside "mistral-small-2603" as a token, so the name is distinct.
    expect(getDistinctModelName({ id: 'mistral-small-2603', name: 'Mistral Small 4' })).toBe('Mistral Small 4');
    // But it IS a token of "gpt-4".
    expect(getDistinctModelName({ id: 'gpt-4', name: 'GPT 4' })).toBeUndefined();
  });

  it('returns undefined for an empty or whitespace-only name', () => {
    expect(getDistinctModelName({ id: 'x', name: '' })).toBeUndefined();
    expect(getDistinctModelName({ id: 'x', name: '   ' })).toBeUndefined();
    expect(getDistinctModelName({ id: 'x' })).toBeUndefined();
  });
});

describe('refreshModelCatalogs', () => {
  function runtimeWith(delayMs: number, calls: { n: number }): ModelCatalogRuntime {
    return {
      refresh: () => {
        calls.n++;
        return new Promise<ModelsRefreshResult>((resolve) =>
          setTimeout(() => resolve({ aborted: false, errors: new Map() }), delayMs),
        );
      },
    };
  }

  it('shares a single in-flight refresh between concurrent callers', async () => {
    const calls = { n: 0 };
    const runtime = runtimeWith(30, calls);
    const a = new AbortController();
    const b = new AbortController();
    const p1 = refreshModelCatalogs(runtime, a.signal);
    const p2 = refreshModelCatalogs(runtime, b.signal);
    expect(calls.n).toBe(1);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(calls.n).toBe(1);
  });

  it('aborts one caller without disturbing the others', async () => {
    const calls = { n: 0 };
    const runtime = runtimeWith(40, calls);
    const a = new AbortController();
    const b = new AbortController();
    const p1 = refreshModelCatalogs(runtime, a.signal);
    const p2 = refreshModelCatalogs(runtime, b.signal);

    a.abort();
    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });

    const r2 = await p2;
    expect(r2.aborted).toBe(false);
    expect(calls.n).toBe(1);
  });

  it('starts a fresh refresh once the previous one finished', async () => {
    const calls = { n: 0 };
    const runtime = runtimeWith(5, calls);
    const s = new AbortController();
    await refreshModelCatalogs(runtime, s.signal);
    await refreshModelCatalogs(runtime, s.signal);
    expect(calls.n).toBe(2);
  });

  it('throws synchronously when the caller is already aborted, without starting work', () => {
    const calls = { n: 0 };
    const s = new AbortController();
    s.abort();
    // refreshModelCatalogs() calls signal.throwIfAborted() first, so an
    // already-aborted caller fails fast and no refresh is ever started.
    expect(() => refreshModelCatalogs(runtimeWith(5, calls), s.signal)).toThrow();
    expect(calls.n).toBe(0);
  });

  it('aborts the shared operation when the last waiter goes away', async () => {
    let seenSignal: AbortSignal | undefined;
    const runtime: ModelCatalogRuntime = {
      refresh: ({ signal }) => {
        seenSignal = signal;
        return new Promise<ModelsRefreshResult>(() => {}); // never settles
      },
    };
    const s = new AbortController();
    void refreshModelCatalogs(runtime, s.signal).catch(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(seenSignal?.aborted).toBe(false);
    s.abort();
    await new Promise((r) => setTimeout(r, 5));
    expect(seenSignal?.aborted).toBe(true);
  });
});

describe('requestRenderBus', () => {
  it('delivers to every subscriber', () => {
    let a = 0;
    let b = 0;
    const ta = requestRenderBus.subscribe(() => { a++; });
    const tb = requestRenderBus.subscribe(() => { b++; });
    requestRenderBus.publish();
    expect([a, b]).toEqual([1, 1]);
    requestRenderBus.unsubscribe(ta);
    requestRenderBus.unsubscribe(tb);
  });

  it('stops delivering after unsubscribe', () => {
    let count = 0;
    const token = requestRenderBus.subscribe(() => { count++; });
    requestRenderBus.publish();
    requestRenderBus.unsubscribe(token);
    requestRenderBus.publish();
    expect(count).toBe(1);
  });

  it('a throwing listener does not block the others', () => {
    let good = 0;
    const bad = requestRenderBus.subscribe(() => { throw new Error('boom'); });
    const ok = requestRenderBus.subscribe(() => { good++; });
    expect(() => requestRenderBus.publish()).not.toThrow();
    expect(good).toBe(1);
    requestRenderBus.unsubscribe(bad);
    requestRenderBus.unsubscribe(ok);
  });

  it('unsubscribing an unknown token is a no-op', () => {
    expect(() => requestRenderBus.unsubscribe(Symbol('nope'))).not.toThrow();
  });

  it('returns distinct tokens for distinct subscribers', () => {
    const t1 = requestRenderBus.subscribe(() => {});
    const t2 = requestRenderBus.subscribe(() => {});
    expect(t1).not.toBe(t2);
    requestRenderBus.unsubscribe(t1);
    requestRenderBus.unsubscribe(t2);
  });
});

describe('isNativeModifierPressed', () => {
  it('returns false when no native helper is available', () => {
    expect(isNativeModifierPressed('shift')).toBe(false);
    expect(isNativeModifierPressed('control')).toBe(false);
    expect(isNativeModifierPressed('option')).toBe(false);
    expect(isNativeModifierPressed('command')).toBe(false);
  });

  it('never throws when the platform has no helper', () => {
    expect(() => isNativeModifierPressed('shift')).not.toThrow();
  });
});
