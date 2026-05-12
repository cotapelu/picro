// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for CommandPalette organism component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandPalette, type Command } from './command-palette';
import type { RenderContext, KeyEvent } from '../atoms/base';

// Mock keybindings for CommandPalette/SelectList
vi.mock('../atoms/keybindings', () => ({
  getKeybindings: () => ({
    matches: (data: string, action: string) => {
      const map: Record<string, Set<string>> = {
        'tui.select.cancel': new Set(['\u001b', 'Escape', '\x03', 'Ctrl+C']),
        'tui.select.confirm': new Set(['\r', 'Enter']),
        'tui.select.up': new Set(['\u001b[A', 'ArrowUp', 'k']),
        'tui.select.down': new Set(['\u001b[B', 'ArrowDown', 'j']),
        'tui.select.pageup': new Set(['\u001b[5~', 'PageUp']),
        'tui.select.pagedown': new Set(['\u001b[6~', 'PageDown']),
      };
      return map[action]?.has(data) ?? false;
    },
  }),
}));

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

function createKeyEvent(keyName: string): KeyEvent {
  const keyMap: Record<string, { raw: string; name: string }> = {
    ArrowDown: { raw: '\x1b[B', name: 'ArrowDown' },
    ArrowUp: { raw: '\x1b[A', name: 'ArrowUp' },
    Enter: { raw: '\r', name: 'Enter' },
    Escape: { raw: '\x1b', name: 'Escape' },
    PageDown: { raw: '\x1b[6~', name: 'PageDown' },
    PageUp: { raw: '\x1b[5~', name: 'PageUp' },
  };
  const mapped = keyMap[keyName];
  if (mapped) return { raw: mapped.raw, name: mapped.name, modifiers: {} };
  return { raw: keyName, name: keyName, modifiers: {} };
}

describe('CommandPalette', () => {
  let commands: Command[];
  let onSelect: vi.Mock;
  let onCancel: vi.Mock;
  let palette: CommandPalette;

  beforeEach(() => {
    commands = [
      { id: 'new', label: 'New Session', shortcut: 'Ctrl+N', description: 'Start a new session', category: 'Session', onExecute: vi.fn() },
      { id: 'quit', label: 'Quit', shortcut: 'Ctrl+Q', description: 'Exit the application', onExecute: vi.fn() },
      { id: 'settings', label: 'Settings', onExecute: vi.fn() },
    ];
    onSelect = vi.fn();
    onCancel = vi.fn();
  });

  describe('constructor', () => {
    it('should create with commands', () => {
      palette = new CommandPalette({ commands });
      expect(palette).toBeInstanceOf(CommandPalette);
      expect(palette['commands']).toHaveLength(3);
    });

    it('should format commands into SelectList items', () => {
      palette = new CommandPalette({ commands });
      const items = (palette as any)['formatItems'](commands);
      expect(items).toHaveLength(3);
      expect(items[0].label).toContain('[Session]');
      expect(items[0].label).toContain('Ctrl+N');
    });

    it('should accept visibleRows and theme', () => {
      palette = new CommandPalette({ commands, visibleRows: 15, theme: { bgColor: () => '' } });
      expect(palette['selectList']).toBeDefined();
    });

    it('should set callbacks', () => {
      palette = new CommandPalette({ commands, onSelect, onCancel });
      expect(palette['onSelect']).toBe(onSelect);
      expect(palette['onCancel']).toBe(onCancel);
    });

    it('should default visibleRows to 10', () => {
      palette = new CommandPalette({ commands });
      expect((palette as any)['selectList']['visibleRows']).toBe(10);
    });
  });

  describe('setCommands()', () => {
    it('should replace commands and update SelectList', () => {
      palette = new CommandPalette({ commands });
      const newCmds = [{ id: 'x', label: 'X', onExecute: vi.fn() }];
      palette.setCommands(newCmds);
      expect(palette['commands']).toHaveLength(1);
    });
  });

  describe('setFilter()', () => {
    it('should filter commands by label and description', () => {
      palette = new CommandPalette({ commands });
      palette.setFilter('session');
      // Should filter to only New Session
      const filtered = palette.getSelectList().items;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe('new'); // items use value field
    });

    it('should be case-insensitive', () => {
      palette = new CommandPalette({ commands });
      palette.setFilter('SETTINGS');
      expect(palette.getSelectList().items.length).toBe(1);
    });

    it('should match description', () => {
      palette = new CommandPalette({ commands });
      palette.setFilter('exit');
      expect(palette.getSelectList().items.some(i => i.value === 'quit')).toBe(true);
    });

    it('should show all when empty query', () => {
      palette = new CommandPalette({ commands });
      palette.setFilter('');
      // Should show all
      expect(palette.getSelectList().items.length).toBe(3);
    });
  });

  describe('getSelectList()', () => {
    it('should return the internal SelectList', () => {
      palette = new CommandPalette({ commands });
      const sl = palette.getSelectList();
      expect(sl).toBeDefined();
    });
  });

  describe('draw()', () => {
    beforeEach(() => {
      palette = new CommandPalette({ commands });
    });

    it('should return bordered lines', () => {
      const result = palette.draw(defaultContext);
      expect(result[0].startsWith('┌')).toBe(true);
      expect(result[result.length - 1].startsWith('└')).toBe(true);
    });

    it('should include inner SelectList lines', () => {
      const result = palette.draw(defaultContext);
      expect(result.some(line => line.includes('New Session'))).toBe(true);
    });

    it('should pad lines to width and add vertical borders', () => {
      const result = palette.draw(defaultContext);
      result.forEach(line => {
        if (line.startsWith('│') && line.endsWith('│')) {
          // Content lines should be within inner width
          expect(line.length).toBeLessThanOrEqual(defaultContext.width);
        }
      });
    });

    it('should respect width', () => {
      const narrow = { ...defaultContext, width: 20 };
      const result = palette.draw(narrow);
      result.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('handleKey()', () => {
    beforeEach(() => {
      palette = new CommandPalette({ commands, onSelect, onCancel });
    });

    it('should call onCancel on Escape', () => {
      palette.handleKey(createKeyEvent('Escape'));
      expect(onCancel).toHaveBeenCalled();
    });

    it('should call onSelect and onExecute on Enter', () => {
      // By default, selectList selectedIndex=0 -> New Session
      palette.handleKey(createKeyEvent('Enter'));
      expect(onSelect).toHaveBeenCalledWith(commands[0]);
      expect(commands[0].onExecute).toHaveBeenCalled();
    });

    it('should delegate other keys to SelectList', () => {
      // ArrowDown to move selection
      const sl = palette.getSelectList() as any;
      sl.isFocused = true; // ensure SelectList processes keys
      palette.handleKey(createKeyEvent('ArrowDown'));
      expect(sl.selectedIndex).toBe(1);
    });

    it('should handle Return key as Enter', () => {
      palette.handleKey(createKeyEvent('Enter'));
      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      palette = new CommandPalette({ commands });
      expect(() => palette.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty commands array', () => {
      palette = new CommandPalette({ commands: [] });
      const result = palette.draw(defaultContext);
      // Still draws border
      expect(result[0].startsWith('┌')).toBe(true);
    });

    it('should handle commands with no description', () => {
      const cmds = [{ id: 'x', label: 'X', onExecute: vi.fn() }];
      palette = new CommandPalette({ commands: cmds });
      expect(() => palette.draw(defaultContext)).not.toThrow();
    });

    it('should handle very narrow width', () => {
      palette = new CommandPalette({ commands, visibleRows: 5 });
      const narrow = { width: 5, height: 10, theme: {} };
      const result = palette.draw(narrow);
      expect(result).toBeDefined();
    });

    it('should handle unicode in labels', () => {
      const unicodeCmds = [{ id: 'emoji', label: '😀😁😂', onExecute: vi.fn() }];
      palette = new CommandPalette({ commands: unicodeCmds });
      const result = palette.draw(defaultContext);
      expect(result.some(l => l.includes('😀'))).toBe(true);
    });

    it('should call onExecute even if onSelect not provided', () => {
      const onExecute = vi.fn();
      const cmd = { id: 'test', label: 'Test', onExecute };
      palette = new CommandPalette({ commands: [cmd] });
      palette.handleKey(createKeyEvent('Enter'));
      expect(onExecute).toHaveBeenCalled();
    });
  });
});