// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for OAuthSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OAuthSelector, type OAuthProvider } from './oauth-selector';
import type { RenderContext, KeyEvent } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('OAuthSelector', () => {
  let providers: OAuthProvider[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: OAuthSelector;

  beforeEach(() => {
    providers = [
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'openai', name: 'OpenAI' },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with default providers if none provided', () => {
      selector = new OAuthSelector({});
      expect(selector['providers']).toContainEqual({ id: 'anthropic', name: 'Anthropic' });
    });

    it('should use custom providers', () => {
      selector = new OAuthSelector({ providers });
      expect(selector['providers']).toEqual(providers);
    });

    it('should set callbacks', () => {
      selector = new OAuthSelector({ providers, onSelect, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onCancel']).toBe(onCancel);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new OAuthSelector({ providers });
    });

    it('should render a bordered box', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('┘')).toBe(true);
    });

    it('should display title', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Select OAuth Provider'))).toBe(true);
    });

    it('should list provider names', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Anthropic'))).toBe(true);
      expect(result.some(l => l.includes('OpenAI'))).toBe(true);
    });

    it('should add help text', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('↑↓ navigate  Enter select  Esc cancel'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new OAuthSelector({ providers, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should navigate up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(providers[0]);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new OAuthSelector({});
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});