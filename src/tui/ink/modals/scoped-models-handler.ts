// SPDX-License-Identifier: Apache-2.0
/**
 * Pure key‑handling logic for ScopedModelsSelectorModal.
 * Isolated for unit testing; the component simply applies the returned action.
 */

import type { EnabledIds } from './scoped-models-utils.js';
import { isEnabled, toggle, enableAll, clearAll, move } from './scoped-models-utils.js';
import type { ModelInfo } from './ScopedModelsSelectorModal.js';

export interface ScopedModelsState {
  enabledIds: EnabledIds;
  models: ModelInfo[];
  selectedIndex: number;
  search: string;
}

export type ScopedModelsAction =
  | { type: 'CLOSE' }
  | { type: 'TOGGLE' }
  | { type: 'MOVE'; direction: -1 | 1 }
  | { type: 'SET_ENABLED_IDS'; ids: EnabledIds }
  | { type: 'SET_SELECTED_INDEX'; index: number }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SET_DIRTY'; dirty: boolean }
  | { type: 'SAVE' }
  | { type: 'NOOP' };

/**
 * Compute the next action based on user input.
 */
export function handleScopedModelsKey(
  input: string,
  key: any,
  state: ScopedModelsState
): ScopedModelsAction {
  const { enabledIds, models, selectedIndex, search } = state;

  // Compute filtered items as in component
  const sortedIds = getSortedIds(enabledIds, models.map(m => m.fullId));
  const filteredItems: ModelInfo[] = sortedIds
    .map(id => models.find(m => m.fullId === id))
    .filter((m): m is ModelInfo => m !== undefined && (search === '' || `${m.fullId}`.toLowerCase().includes(search.toLowerCase()) || (m.name && m.name.toLowerCase().includes(search.toLowerCase()))));

  if (key.escape) return { type: 'CLOSE' };

  if (key.return) {
    if (filteredItems.length === 0) return { type: 'NOOP' };
    // Toggle selected model (will be applied by component)
    return { type: 'TOGGLE' };
  }

  // Reorder (must come before plain navigation)
  if (key.upArrow && key.shift) {
    if (enabledIds !== null && filteredItems.length > 0 && selectedIndex < filteredItems.length) {
      const selected = filteredItems[selectedIndex];
      if (selected && isEnabled(enabledIds, selected.fullId)) {
        return { type: 'MOVE', direction: -1 };
      }
    }
    return { type: 'NOOP' };
  }
  if (key.downArrow && key.shift) {
    if (enabledIds !== null && filteredItems.length > 0 && selectedIndex < filteredItems.length) {
      const selected = filteredItems[selectedIndex];
      if (selected && isEnabled(enabledIds, selected.fullId)) {
        return { type: 'MOVE', direction: 1 };
      }
    }
    return { type: 'NOOP' };
  }

  // Plain navigation
  if (key.upArrow) {
    const newIndex = Math.max(0, selectedIndex - 1);
    return { type: 'SET_SELECTED_INDEX', index: newIndex };
  }
  if (key.downArrow) {
    const newIndex = Math.min(filteredItems.length - 1, selectedIndex + 1);
    return { type: 'SET_SELECTED_INDEX', index: newIndex };
  }

  // Bulk operations
  if (key.ctrl && input === 'a') {
    const targetIds = search ? filteredItems.map(i => i.fullId) : undefined;
    return { type: 'SET_ENABLED_IDS', ids: enableAll(enabledIds, models.map(m => m.fullId), targetIds) };
  }
  if (key.ctrl && input === 'x') {
    const targetIds = search ? filteredItems.map(i => i.fullId) : undefined;
    return { type: 'SET_ENABLED_IDS', ids: clearAll(enabledIds, models.map(m => m.fullId), targetIds) };
  }
  if (key.ctrl && input === 'p') {
    if (filteredItems.length === 0) return { type: 'NOOP' };
    const selected = filteredItems[selectedIndex];
    if (!selected) return { type: 'NOOP' };
    const provider = selected.provider;
    const providerIds = models.filter(m => m.provider === provider).map(m => m.fullId);
    const allEnabled = providerIds.every(id => isEnabled(enabledIds, id));
    const newIds = allEnabled ? clearAll(enabledIds, models.map(m => m.fullId), providerIds) : enableAll(enabledIds, models.map(m => m.fullId), providerIds);
    return { type: 'SET_ENABLED_IDS', ids: newIds };
  }

  // Save
  if (key.ctrl && input === 's') {
    return { type: 'SAVE' };
  }

  // Backspace
  if (key.backspace) {
    return { type: 'SET_SEARCH', search: search.slice(0, -1) }; // also reset selectedIndex handled by component separately, could be separate action
  }

  // Type to search (single character, not modifier)
  if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt) {
    return { type: 'SET_SEARCH', search: search + input };
  }

  return { type: 'NOOP' };
}

// Helper to get sorted IDs (inline to avoid circular import)
function getSortedIds(enabledIds: EnabledIds, allIds: string[]): string[] {
  return enabledIds ?? allIds;
}
