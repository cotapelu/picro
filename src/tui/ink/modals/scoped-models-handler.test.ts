import { describe, it, expect } from 'vitest';
import {
  handleScopedModelsKey,
  type ScopedModelsState,
  type ScopedModelsAction,
} from './scoped-models-handler.js';
import type { ModelInfo } from './ScopedModelsSelectorModal.js';

function createState(overrides: Partial<ScopedModelsState> = {}): ScopedModelsState {
  return {
    enabledIds: null,
    models: [],
    selectedIndex: 0,
    search: '',
    ...overrides,
  };
}

function model(id: string, provider: string, name?: string): ModelInfo {
  return { fullId: `${provider}/${id}`, provider, id, name };
}

function keys(obj: any): string[] {
  return Object.keys(obj).sort();
}

describe('handleScopedModelsKey', () => {
  describe('Escape', () => {
    it('returns CLOSE', () => {
      const state = createState();
      const action = handleScopedModelsKey('', { escape: true }, state);
      expect(action.type).toBe('CLOSE');
    });
  });

  describe('Return (toggle)', () => {
    it('returns TOGGLE when filteredItems non-empty', () => {
      const models = [model('gpt-4', 'openai')];
      const state = createState({ models, selectedIndex: 0, search: '' });
      const action = handleScopedModelsKey('', { return: true }, state);
      expect(action.type).toBe('TOGGLE');
    });

    it('returns NOOP when filteredItems empty', () => {
      const state = createState({ models: [], selectedIndex: 0, search: '' });
      const action = handleScopedModelsKey('', { return: true }, state);
      expect(action.type).toBe('NOOP');
    });
  });

  describe('Shift+Up/Down (reorder)', () => {
    const models = [
      model('gpt-4', 'openai'),
      model('gpt-3.5', 'openai'),
    ];
    const base: ScopedModelsState = {
      enabledIds: ['openai/gpt-4', 'openai/gpt-3.5'],
      models,
      selectedIndex: 0,
      search: '',
    };

    it('returns MOVE direction -1 for Shift+Up', () => {
      const action = handleScopedModelsKey('', { shift: true, upArrow: true }, base);
      expect(action.type).toBe('MOVE');
      expect(action.direction).toBe(-1);
    });

    it('returns MOVE direction 1 for Shift+Down', () => {
      const action = handleScopedModelsKey('', { shift: true, downArrow: true }, base);
      expect(action.type).toBe('MOVE');
      expect(action.direction).toBe(1);
    });

    it('returns NOOP when enabledIds is null (all enabled mode)', () => {
      const state = createState({ models, selectedIndex: 0, search: '' }); // enabledIds null
      const action = handleScopedModelsKey('', { shift: true, upArrow: true }, state);
      expect(action.type).toBe('NOOP');
    });

    it('returns NOOP when filteredItems empty', () => {
      const state = createState({ enabledIds: ['x'], models: [], selectedIndex: 0, search: '' });
      const action = handleScopedModelsKey('', { shift: true, downArrow: true }, state);
      expect(action.type).toBe('NOOP');
    });
  });

  describe('Plain navigation', () => {
    const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
    const base: ScopedModelsState = { enabledIds: null, models, selectedIndex: 0, search: '' };

    it('decrements index on upArrow, clamped to 0', () => {
      let state = base;
      state.selectedIndex = 1;
      const action = handleScopedModelsKey('', { upArrow: true }, state);
      expect(action.type).toBe('SET_SELECTED_INDEX');
      expect(action.index).toBe(0);
    });

    it('does not go below 0', () => {
      const state = createState({ ...base, selectedIndex: 0 });
      const action = handleScopedModelsKey('', { upArrow: true }, state);
      expect(action.type).toBe('SET_SELECTED_INDEX');
      expect(action.index).toBe(0);
    });

    it('increments index on downArrow', () => {
      const state = createState({ ...base, selectedIndex: 0 });
      const action = handleScopedModelsKey('', { downArrow: true }, state);
      expect(action.type).toBe('SET_SELECTED_INDEX');
      expect(action.index).toBe(1);
    });

    it('clamps to max (filteredItems length - 1)', () => {
      const state = createState({ ...base, selectedIndex: 1 }); // only 2 items
      const action = handleScopedModelsKey('', { downArrow: true }, state);
      expect(action.type).toBe('SET_SELECTED_INDEX');
      expect(action.index).toBe(1);
    });
  });

  describe('Ctrl+A (enable all)', () => {
    it('returns null when already all enabled (enabledIds null)', () => {
      const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
      const state = createState({ models, enabledIds: null });
      const action = handleScopedModelsKey('a', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      expect(action.ids).toBeNull(); // remains all-enabled
    });

    it('adds missing models when some disabled (may result in all enabled → null)', () => {
      const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
      const state = createState({ models, enabledIds: ['openai/gpt-4'] });
      const action = handleScopedModelsKey('a', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      // After adding missing, we get all models enabled, which utils returns null
      expect(action.ids).toBeNull();
    });

    it('adds filtered subset when search present and some disabled', () => {
      const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
      const state = createState({ models, enabledIds: ['openai/gpt-4'], search: 'gpt' });
      const action = handleScopedModelsKey('a', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      expect(action.ids).toEqual(['openai/gpt-4']); // already contains, maybe unchanged? Actually search filtered target is only openai/gpt-4, and it's already in list, so after enableAll would result in same array, or maybe null if it becomes all? allIds length 2, result length 1, so not all; returns array. Likely stays ['openai/gpt-4'].
    });
  });

  describe('Ctrl+X (clear all)', () => {
    it('clears all when enabledIds not null and no search', () => {
      const models = [model('gpt-4', 'openai')];
      const state = createState({ models, enabledIds: ['openai/gpt-4'] });
      const action = handleScopedModelsKey('x', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      expect(action.ids).toEqual([]); // cleared to empty
    });

    it('returns complement when all enabled and search present', () => {
      const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
      // all enabled (null) and search 'gpt' targets openai/gpt-4; clearing that yields remaining anthropic/claude-3
      const state = createState({ models, enabledIds: null, search: 'gpt' });
      const action = handleScopedModelsKey('x', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      expect(action.ids).toEqual(['anthropic/claude-3']);
    });

    it('clears only filtered when some enabled and search present', () => {
      const models = [model('gpt-4', 'openai'), model('claude-3', 'anthropic')];
      // enabledIds includes both; search 'gpt' targets openai/gpt-4; clearing target yields anthropic/claude-3
      const state = createState({ models, enabledIds: ['openai/gpt-4', 'anthropic/claude-3'], search: 'gpt' });
      const action = handleScopedModelsKey('x', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      expect(action.ids).toEqual(['anthropic/claude-3']);
    });
  });

  describe('Ctrl+P (toggle provider)', () => {
    const models = [
      model('gpt-4', 'openai'),
      model('gpt-3.5', 'openai'),
      model('claude-3', 'anthropic'),
    ];

    it('clears provider models when all provider models are enabled, preserving other providers', () => {
      const state = createState({
        models,
        enabledIds: ['openai/gpt-4', 'openai/gpt-3.5', 'anthropic/claude-3'],
        selectedIndex: 0, // selects openai/gpt-4
        search: '',
      });
      const action = handleScopedModelsKey('p', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      // Provider openai models cleared, anthropic remains
      expect(action.ids).toEqual(['anthropic/claude-3']);
    });

    it('enables all provider models when not all enabled, may result in all enabled → null', () => {
      const state = createState({
        models,
        enabledIds: ['openai/gpt-4', 'anthropic/claude-3'], // missing openai/gpt-3.5
        selectedIndex: 0,
        search: '',
      });
      const action = handleScopedModelsKey('p', { ctrl: true }, state);
      expect(action.type).toBe('SET_ENABLED_IDS');
      // After enabling the missing openai model, all three models become enabled => null (all enabled state)
      expect(action.ids).toBeNull();
    });

    it('returns NOOP when no selected item', () => {
      const state = createState({
        models,
        enabledIds: [],
        selectedIndex: 10, // out of range
        search: '',
      });
      const action = handleScopedModelsKey('p', { ctrl: true }, state);
      expect(action.type).toBe('NOOP');
    });
  });

  describe('Ctrl+S (save)', () => {
    it('returns SAVE', () => {
      const state = createState();
      const action = handleScopedModelsKey('s', { ctrl: true }, state);
      expect(action.type).toBe('SAVE');
    });
  });

  describe('Backspace', () => {
    it('returns SET_SEARCH with truncated string', () => {
      const state = createState({ search: 'abc' });
      const action = handleScopedModelsKey('', { backspace: true }, state);
      expect(action.type).toBe('SET_SEARCH');
      expect(action.search).toBe('ab');
    });
  });

  describe('Type character', () => {
    it('returns SET_SEARCH appending character for single char input', () => {
      const state = createState({ search: '' });
      const action = handleScopedModelsKey('g', {}, state);
      expect(action.type).toBe('SET_SEARCH');
      expect(action.search).toBe('g');
    });

    it('ignores input length > 1', () => {
      const state = createState({ search: '' });
      const action = handleScopedModelsKey('abc', {}, state);
      expect(action.type).toBe('NOOP');
    });

    it('ignores when modifier keys pressed', () => {
      const state = createState({ search: '' });
      const action = handleScopedModelsKey('g', { ctrl: true }, state);
      expect(action.type).toBe('NOOP');
    });
  });

  describe('Default', () => {
    it('returns NOOP for unhandled keys', () => {
      const state = createState();
      const action = handleScopedModelsKey('', { other: true }, state);
      expect(action.type).toBe('NOOP');
    });
  });
});
