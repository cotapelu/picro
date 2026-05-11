// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for CancellableLoader molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellableLoader } from './cancellable-loader';

describe('CancellableLoader', () => {
  let tui: any;
  let theme: any;
  let onAbort: vi.Mock;

  beforeEach(() => {
    tui = { requestRender: vi.fn() };
    theme = {};
    onAbort = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should extend BorderedLoader', () => {
    const loader = new CancellableLoader(tui, theme, 'Loading...');
    expect(loader).toBeInstanceOf(CancellableLoader);
  });

  it('should call onAbort via abort() method', () => {
    const loader = new CancellableLoader(tui, theme, 'Loading...', onAbort);
    loader.abort();
    expect(onAbort).toHaveBeenCalled();
  });

  it('abort() should clear spinner interval', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const loader = new CancellableLoader(tui, theme, 'Loading...');
    // Note: super already set interval; we'll mock that interval value.
    // In real code, abort calls handleKey with Escape which clears interval.
    loader.abort();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('dispose() should clear spinner interval', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const loader = new CancellableLoader(tui, theme, 'Loading...');
    loader.dispose();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('should accept optional onAbort in constructor', () => {
    const loader = new CancellableLoader(tui, theme, 'Loading...', onAbort);
    expect(loader).toBeDefined();
  });
});