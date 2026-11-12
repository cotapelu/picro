// SPDX-License-Identifier: Apache-2.0
/**
 * Shared selection windowing for the list selectors (model, session, tree).
 *
 * All three computed the same arithmetic inline: clamp the stored index into the
 * current list, then centre a window of at most `maxVisible` rows around it.
 * Keeping it in one place also means the edge cases are tested once:
 *
 * - the stored index can point past the end after the list shrinks (the arrow
 *   handlers bound-check the raw index, so the highlight used to sit still while
 *   the user pressed Up repeatedly to walk it back into the window);
 * - an empty list must never produce a negative index or a negative slice.
 */

export interface SelectWindow {
  /** Selection index clamped into [0, length - 1]; -1 when the list is empty. */
  clamped: number;
  /** First visible row index. */
  start: number;
  /** One past the last visible row index. */
  end: number;
  /** Number of rows the window would like to show. */
  maxVisible: number;
}

export function selectWindow(selected: number, length: number, maxVisible: number): SelectWindow {
  const size = Math.max(1, Math.floor(maxVisible));
  if (length <= 0) {
    return { clamped: -1, start: 0, end: 0, maxVisible: size };
  }
  const clamped = Math.max(0, Math.min(Math.floor(selected) || 0, length - 1));
  const lastStart = Math.max(0, length - size);
  const start = Math.max(0, Math.min(clamped - Math.floor(size / 2), lastStart));
  const end = Math.min(start + size, length);
  return { clamped, start, end, maxVisible: size };
}
