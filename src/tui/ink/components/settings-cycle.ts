// SPDX-License-Identifier: Apache-2.0
/**
 * Advance a cyclic setting value by one step.
 *
 * Kept separate from the component so the cycling rule is testable without Ink's
 * renderer (which does not mount these components in this repo).
 */

/** Next value in a cyclic list; falls back to the first value. */
export function nextCycleValue(values: readonly string[], current: string | undefined): string {
  if (values.length === 0) return current ?? '';
  const index = values.indexOf(current ?? '');
  return values[(index + 1) % values.length]!;
}
