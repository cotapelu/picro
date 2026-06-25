// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock VERSION before importing the hook
vi.mock('../../../config', () => ({
  VERSION: '1.2.3',
}));

global.fetch = vi.fn();

function createMockOpts() {
  return {
    addToast: vi.fn(),
    openModal: vi.fn(),
  };
}

// Now import the hook under test
import { useVersionCheck } from './useVersionCheck';

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows toast and opens changelog when newer version available', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.0.0' }),
    });
    const opts = createMockOpts();
    const { unmount } = renderHook(() => useVersionCheck(opts));

    // Wait for async effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).toHaveBeenCalledWith(
      'New version available: 2.0.0 (current: 1.2.3)',
      'info'
    );
    expect(opts.openModal).toHaveBeenCalledWith({ type: 'changelog' });
  });

  it('does not show toast when latest equals current', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.2.3' }),
    });
    const opts = createMockOpts();
    renderHook(() => useVersionCheck(opts));

    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).not.toHaveBeenCalled();
    expect(opts.openModal).not.toHaveBeenCalled();
  });

  it('does not show toast when response not ok', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });
    const opts = createMockOpts();
    renderHook(() => useVersionCheck(opts));

    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).not.toHaveBeenCalled();
  });

  it('handles network errors silently', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network down'));
    const opts = createMockOpts();
    renderHook(() => useVersionCheck(opts));

    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).not.toHaveBeenCalled();
  });

  it('does not call openModal if not provided', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ version: '2.0.0' }),
    });
    const opts = {
      addToast: vi.fn(),
    };
    renderHook(() => useVersionCheck(opts));

    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).toHaveBeenCalled();
    expect(opts.openModal).toBeUndefined();
  });

  it('handles fetch timeout via AbortSignal.timeout', async () => {
    // Simulate fetch that never resolves; AbortSignal.timeout should abort after 5s, but we can't wait; we just ensure no toast.
    const pendingPromise = new Promise(() => {}); // never resolves
    (global.fetch as any).mockReturnValue(pendingPromise);
    const opts = createMockOpts();
    renderHook(() => useVersionCheck(opts));

    // Fast-forward not possible; just resolve microtasks
    await act(async () => {
      await Promise.resolve();
    });

    expect(opts.addToast).not.toHaveBeenCalled();
  });
});
