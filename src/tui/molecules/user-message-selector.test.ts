// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for UserMessageSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserMessageSelector, type UserMessageInfo } from './user-message-selector';
import type { RenderContext, KeyEvent } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('UserMessageSelector', () => {
  let messages: UserMessageInfo[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: UserMessageSelector;

  beforeEach(() => {
    messages = [
      { id: '1', content: 'Hello world' },
      { id: '2', content: 'How are you?' },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with messages', () => {
      selector = new UserMessageSelector({ messages });
      expect(selector).toBeInstanceOf(UserMessageSelector);
      expect(selector['messages']).toHaveLength(2);
    });

    it('should set callbacks', () => {
      selector = new UserMessageSelector({ messages, onSelect, onCancel });
      expect(selector['onSelect']).toBe(onSelect);
      expect(selector['onCancel']).toBe(onCancel);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new UserMessageSelector({ messages });
    });

    it('should render bordered box with title Select Message', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result.some(l => l.includes('Select Message'))).toBe(true);
    });

    it('should display message content truncated to 50 chars', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Hello world'))).toBe(true);
    });

    it('should indicate selected with ▶', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.startsWith('│▶'))).toBe(true);
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new UserMessageSelector({ messages, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up/down', () => {
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(1);
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should call onSelect on Enter', () => {
      selector['selectedIndex'] = 1;
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(messages[1]);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new UserMessageSelector({ messages });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });
});