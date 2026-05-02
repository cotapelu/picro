/**
 * Component State Serialization
 * Allows capturing and restoring UI component state for persistence.
 */

import type { UIElement } from './components/base.js';

/**
 * Optional interface for components that support state serialization.
 * Components can implement this to opt-in to state capture/restore.
 */
export interface StatefulComponent {
  /** Serialize component state to a plain object */
  serializeState?(): SerializedState;
  /** Restore component state from a previously serialized object */
  deserializeState?(state: SerializedState): void;
}

export type SerializedState = Record<string, any>;

/**
 * Serialize the entire TUI component tree to a JSON-serializable object.
 * Only components implementing StatefulComponent will have their state captured.
 */
export function serializeUI(root: UIElement): SerializedState {
  const state: SerializedState = {
    components: {},
    version: 1,
    timestamp: Date.now(),
  };

  function walk(element: UIElement, path: string): void {
    const comp = element as StatefulComponent;
    if (comp.serializeState) {
      (state.components as any)[path] = comp.serializeState();
    }
    // Recurse into children if element has children property (ElementContainer)
    if ('children' in element) {
      const children = (element as any).children as UIElement[];
      if (Array.isArray(children)) {
        children.forEach((child, idx) => walk(child, `${path}.children.${idx}`));
      }
    }
    // Recurse into panels if present in TerminalUI (skip for simplicity)
  }

  walk(root, 'root');
  return state;
}

/**
 * Restore serialized state into a TUI component tree.
 * Walks the tree and calls deserializeState on matching components.
 */
export function deserializeUI(root: UIElement, state: SerializedState): void {
  const components = state.components as Record<string, SerializedState> || {};

  function walk(element: UIElement, path: string): void {
    const comp = element as StatefulComponent;
    if (comp.deserializeState && components[path]) {
      comp.deserializeState(components[path]);
    }
    if ('children' in element) {
      const children = (element as any).children as UIElement[];
      if (Array.isArray(children)) {
        children.forEach((child, idx) => walk(child, `${path}.children.${idx}`));
      }
    }
  }

  walk(root, 'root');
}

/**
 * Helper: Merge state objects shallowly.
 */
export function mergeState(base: SerializedState, updates: SerializedState): SerializedState {
  return { ...base, ...updates };
}
