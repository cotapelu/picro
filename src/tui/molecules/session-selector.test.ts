// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for SessionSelector molecule component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionSelector, type SessionInfo } from './session-selector';
import type { RenderContext, KeyEvent } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(raw: string): KeyEvent {
  return { raw, name: raw, modifiers: {} };
}

describe('SessionSelector', () => {
  let sessions: SessionInfo[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let selector: SessionSelector;

  beforeEach(() => {
    const now = Date.now();
    sessions = [
      { id: '1', name: 'Session A', cwd: '/home/a', updatedAt: new Date(now), path: '/path/a' },
      { id: '2', name: 'Session B', cwd: '/home/b', updatedAt: new Date(now - 1000 * 60 * 5), path: '/path/b' }, // 5 mins ago
      { id: '3', name: 'Session C', cwd: '/home/c', updatedAt: new Date(now - 1000 * 60 * 60 * 2), path: '/path/c' }, // 2 hours ago
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with sessions and callbacks', () => {
      selector = new SessionSelector({ sessions, onSelect, onCancel });
      expect(selector).toBeInstanceOf(SessionSelector);
      expect(selector['sessions']).toHaveLength(3);
    });

    it('should default selectedIndex to 0', () => {
      selector = new SessionSelector({ sessions });
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should initialize isFocused false by default', () => {
      selector = new SessionSelector({ sessions });
      expect(selector.isFocused).toBe(false);
    });

    it('should allow empty sessions array', () => {
      selector = new SessionSelector({ sessions: [] });
      expect(selector['sessions']).toHaveLength(0);
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      selector = new SessionSelector({ sessions });
    });

    it('should render a bordered box', () => {
      const result = selector.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should display title " Sessions "', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Sessions'))).toBe(true);
    });

    it('should list session names', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('Session A'))).toBe(true);
      expect(result.some(l => l.includes('Session B'))).toBe(true);
    });

    it('should show time ago (formatted)', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('now'))).toBe(true);
      expect(result.some(l => l.includes('5m'))).toBe(true);
      expect(result.some(l => l.includes('2h'))).toBe(true);
    });

    it('should indicate selected with ▶ prefix', () => {
      selector['selectedIndex'] = 1;
      const result = selector.draw(defaultContext);
      const selectedLine = result.find(l => l.includes('Session B'));
      expect(selectedLine?.startsWith('│▶')).toBe(true);
    });

    it('should show help text at bottom', () => {
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('↑↓ navigate  Enter select  Esc cancel'))).toBe(true);
    });

    it('should limit visible sessions based on height', () => {
      const many = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`, name: `Sess ${i}`, cwd: `/c${i}`, updatedAt: new Date(),
      }));
      selector = new SessionSelector({ sessions: many });
      const result = selector.draw({ ...defaultContext, height: 10 });
      // Should only render a few sessions
      const sessionLines = result.filter(l => l.includes('Sess '));
      expect(sessionLines.length).toBeLessThanOrEqual(3);
    });

    it('should truncate long session names', () => {
      const longName = 'A'.repeat(100);
      const s: SessionInfo[] = [{ id: 'x', name: longName, cwd: '/', updatedAt: new Date() }];
      selector = new SessionSelector({ sessions: s });
      const result = selector.draw({ ...defaultContext, width: 50 });
      // Each visible line should not exceed width
      result.forEach(l => {
        expect(l.replace(/\x1b\[[0-9;]*m/g, '').length).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      selector = new SessionSelector({ sessions, onSelect, onCancel });
      selector.isFocused = true;
    });

    it('should move selection up with ArrowUp', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('\x1b[A'));
      expect(selector['selectedIndex']).toBe(1);
    });

    it('should move selection down with ArrowDown', () => {
      selector.handleKey(createKeyEvent('\x1b[B'));
      expect(selector['selectedIndex']).toBe(1);
    });

    it('should not move past top', () => {
      selector['selectedIndex'] = 0;
      selector.handleKey(createKeyEvent('up'));
      expect(selector['selectedIndex']).toBe(0);
    });

    it('should not move past bottom', () => {
      selector['selectedIndex'] = 2;
      selector.handleKey(createKeyEvent('down'));
      expect(selector['selectedIndex']).toBe(2);
    });

    it('should call onSelect on Enter', () => {
      selector.handleKey(createKeyEvent('\r'));
      expect(onSelect).toHaveBeenCalledWith(sessions[0]);
    });

    it('should call onCancel on Escape', () => {
      selector.handleKey(createKeyEvent('\x1b'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('formatDate()', () => {
    it('should format "now" for recent', () => {
      selector = new SessionSelector({ sessions });
      const method = (selector as any)['formatDate'];
      const now = Date.now();
      expect(method(new Date(now))).toBe('now');
    });

    it('should format minutes', () => {
      selector = new SessionSelector({ sessions });
      const method = (selector as any)['formatDate'];
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      expect(method(new Date(fiveMinAgo))).toBe('5m');
    });

    it('should format hours', () => {
      selector = new SessionSelector({ sessions });
      const method = (selector as any)['formatDate'];
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(method(new Date(twoHoursAgo))).toBe('2h');
    });

    it('should format days', () => {
      selector = new SessionSelector({ sessions });
      const method = (selector as any)['formatDate'];
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(method(new Date(threeDaysAgo))).toBe('3d');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      selector = new SessionSelector({ sessions });
      expect(() => selector.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty sessions', () => {
      selector = new SessionSelector({ sessions: [] });
      const result = selector.draw(defaultContext);
      // Should still render header/footer maybe
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle unicode in names', () => {
      const unicodeSess: SessionInfo[] = [{ id: '1', name: '😀 Sess', cwd: '/', updatedAt: new Date() }];
      selector = new SessionSelector({ sessions: unicodeSess });
      const result = selector.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });

    it('should handle very long cwd (but we truncate name only)', () => {
      const s: SessionInfo[] = [{ id: '1', name: 'Short', cwd: 'A'.repeat(200), updatedAt: new Date() }];
      selector = new SessionSelector({ sessions: s });
      expect(() => selector.draw(defaultContext)).not.toThrow();
    });
  });
});