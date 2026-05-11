// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for SessionSearchSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionSearchSelector, type SessionSearchResult } from './session-selector-search';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('SessionSearchSelector', () => {
  let sessions: SessionSearchResult[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: SessionSearchSelector;

  beforeEach(() => {
    sessions = [
      { id: '1', name: 'Alpha', cwd: '/a' },
      { id: '2', name: 'Beta', cwd: '/b' },
      { id: '3', name: 'Gamma', cwd: '/g' },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
    selector = new SessionSearchSelector({ sessions, onSelect, onCancel });
  });

  describe('constructor', () => {
    it('should initialize with all sessions as results', () => {
      expect(selector['results']).toHaveLength(3);
    });

    it('should start with empty search query', () => {
      expect(selector['searchQuery']).toBe('');
    });
  });

  describe('draw()', () => {
    it('should render bordered box with title', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Search Sessions'))).toBe(true);
    });

    it('should show search input line', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Search:'))).toBe(true);
    });

    it('should list sessions', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Alpha'))).toBe(true);
      expect(result.some(l => l.includes('Beta'))).toBe(true);
    });

    it('should filter results based on searchQuery', () => {
      selector['searchQuery'] = 'a'; // matches "Beta"? Actually case-sensitive? It's direct string includes, so 'a' in 'Beta'? No. But in 'Alpha' yes. Also 'Gamma' contains 'a'? No. So only Alpha.
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Alpha'))).toBe(true);
      expect(result.some(l => l.includes('Beta'))).toBe(false);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector.isFocused = true;
    });

    it('should append characters to searchQuery', () => {
      selector.handleKey(createKeyEvent('a'));
      expect(selector['searchQuery']).toBe('a');
    });

    it('should handle backspace', () => {
      selector['searchQuery'] = 'abc';
      selector.handleKey(createKeyEvent('\x7f'));
      expect(selector['searchQuery']).toBe('ab');
    });

    it('should select on Enter', () => {
      selector['selectedIndex'] = 1;
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(sessions[1]);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});