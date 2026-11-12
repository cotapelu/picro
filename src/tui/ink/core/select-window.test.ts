// SPDX-License-Identifier: Apache-2.0
/**
 * Shared selector windowing.
 *
 * The model/session/tree selectors each computed this arithmetic inline and all
 * three shared the same defect: the stored index was never clamped when the list
 * shrank (the arrow keys bound-check the raw index, so the highlight sat still
 * while Up had to be pressed repeatedly), and an empty list could produce a
 * negative index.
 */

import { describe, it, expect } from 'vitest';
import { selectWindow } from './select-window.js';

describe('selectWindow', () => {
  it('centres the window on the selection', () => {
    const w = selectWindow(5, 20, 10);
    expect(w.clamped).toBe(5);
    expect(w.end - w.start).toBe(10);
    expect(w.start).toBeLessThanOrEqual(5);
    expect(w.end).toBeGreaterThan(5);
  });

  it('clamps the selection to the end of the list', () => {
    const w = selectWindow(11, 3, 10);
    expect(w.clamped).toBe(2);
    expect(w.start).toBe(0);
    expect(w.end).toBe(3);
  });

  it('clamps a stale high index down to the last row, keeping it visible', () => {
    // This is the shrink case: the highlight must stay inside the window.
    const w = selectWindow(9, 3, 10);
    expect(w.clamped).toBe(2);
    expect(w.start).toBe(0);
    expect(w.end).toBe(3);
  });

  it('clamps a negative index up to zero', () => {
    const w = selectWindow(-3, 5, 10);
    expect(w.clamped).toBe(0);
    expect(w.start).toBe(0);
  });

  it('never returns a negative index for an empty list', () => {
    const w = selectWindow(0, 0, 10);
    expect(w.clamped).toBe(-1);
    expect(w.start).toBe(0);
    expect(w.end).toBe(0);
  });

  it('handles a single-item list', () => {
    expect(selectWindow(0, 1, 10)).toEqual({ clamped: 0, start: 0, end: 1, maxVisible: 10 });
  });

  it('keeps the whole list visible when it is shorter than the window', () => {
    const w = selectWindow(0, 4, 10);
    expect(w.start).toBe(0);
    expect(w.end).toBe(4);
  });

  it('shows the last full window when the selection is at the end', () => {
    const w = selectWindow(19, 20, 10);
    expect(w.clamped).toBe(19);
    expect(w.start).toBe(10);
    expect(w.end).toBe(20);
  });

  it('shows the first window when the selection is at the start', () => {
    const w = selectWindow(0, 20, 10);
    expect(w.start).toBe(0);
    expect(w.end).toBe(10);
  });

  it('normalises a fractional or non-finite selection', () => {
    expect(selectWindow(2.7, 10, 5).clamped).toBe(2);
    expect(selectWindow(Number.NaN, 10, 5).clamped).toBe(0);
  });

  it('treats a non-positive maxVisible as one row', () => {
    const w = selectWindow(3, 10, 0);
    expect(w.maxVisible).toBe(1);
    expect(w.end - w.start).toBe(1);
    expect(w.start).toBe(3);
  });

  it('produces a slice that always contains the selection', () => {
    for (let length = 1; length <= 40; length++) {
      for (let selected = -2; selected <= length + 2; selected++) {
        const w = selectWindow(selected, length, 10);
        expect(w.start).toBeGreaterThanOrEqual(0);
        expect(w.end).toBeLessThanOrEqual(length);
        expect(w.end).toBeGreaterThanOrEqual(w.start);
        if (length > 0) {
          expect(w.clamped).toBeGreaterThanOrEqual(0);
          expect(w.clamped).toBeLessThan(length);
          expect(w.clamped).toBeGreaterThanOrEqual(w.start);
          expect(w.clamped).toBeLessThan(w.end);
        }
      }
    }
  });
});
