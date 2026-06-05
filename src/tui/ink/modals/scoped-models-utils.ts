// SPDX-License-Identifier: Apache-2.0

/** Utilities for scoped model selection. */

export type EnabledIds = string[] | null;

/** Check if a model ID is enabled in the current enabled list (null = all enabled). */
export function isEnabled(enabledIds: EnabledIds, id: string): boolean {
  return enabledIds === null || enabledIds.includes(id);
}

/** Toggle a model ID: if enabled, remove it; if disabled, add it. */
export function toggle(enabledIds: EnabledIds, id: string): EnabledIds {
  if (enabledIds === null) return [id];
  const index = enabledIds.indexOf(id);
  if (index >= 0) return [...enabledIds.slice(0, index), ...enabledIds.slice(index + 1)];
  return [...enabledIds, id];
}

/** Enable all IDs, optionally only within a target subset. */
export function enableAll(enabledIds: EnabledIds, allIds: string[], targetIds?: string[]): EnabledIds {
  if (enabledIds === null) return null;
  const targets = targetIds ?? allIds;
  const result = [...enabledIds];
  for (const id of targets) {
    if (!result.includes(id)) result.push(id);
  }
  return result.length === allIds.length ? null : result;
}

/** Clear all IDs, optionally only within a target subset. */
export function clearAll(enabledIds: EnabledIds, allIds: string[], targetIds?: string[]): EnabledIds {
  if (enabledIds === null) {
    return targetIds ? allIds.filter((id) => !targetIds.includes(id)) : [];
  }
  const targets = new Set(targetIds ?? enabledIds);
  return enabledIds.filter((id) => !targets.has(id));
}

/** Move an ID within the enabled list by delta positions. */
export function move(enabledIds: EnabledIds, id: string, delta: number): EnabledIds {
  if (enabledIds === null) return null;
  const list = [...enabledIds];
  const index = list.indexOf(id);
  if (index < 0) return list;
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= list.length) return list;
  // Remove from current position and insert at newIndex
  const result = [...list];
  result.splice(index, 1);
  result.splice(newIndex, 0, id);
  return result;
}

/** Get sorted IDs: enabled first (preserving order), then the rest (in original order). */
export function getSortedIds(enabledIds: EnabledIds, allIds: string[]): string[] {
  if (enabledIds === null) return allIds;
  const enabledSet = new Set(enabledIds);
  return [...enabledIds, ...allIds.filter((id) => !enabledSet.has(id))];
}
