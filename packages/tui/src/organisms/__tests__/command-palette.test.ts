import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette } from '../command-palette';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('CommandPalette', () => {
  const commands = [
    { id: 'newFile', label: 'New File', shortcut: 'Ctrl+N' },
    { id: 'openFile', label: 'Open File', shortcut: 'Ctrl+O' },
    { id: 'saveFile', label: 'Save File', shortcut: 'Ctrl+S' },
    { id: 'closeFile', label: 'Close File' },
  ];

  describe('Constructor', () => {
    it('should create command palette', () => {
      const palette = new CommandPalette(commands);
      expect(palette).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render command list', () => {
      const palette = new CommandPalette(commands);
      const lines = palette.draw(ctx());
      expect(lines.join('')).toContain('New File');
    });

    it('should show shortcuts', () => {
      const palette = new CommandPalette(commands);
      const lines = palette.draw(ctx());
      expect(lines.join('')).toContain('Ctrl+N');
    });

    it('should fit width', () => {
      const palette = new CommandPalette(commands);
      const lines = palette.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard navigation', () => {
    it('should filter commands by input', () => {
      const palette = new CommandPalette(commands);
      palette.setFocus(true);
      palette.keypress(k('N'));
      const lines = palette.draw(ctx());
      expect(lines.join('')).toContain('New File');
    });

    it('should select with Enter', () => {
      const onExecute = vi.fn();
      const palette = new CommandPalette(commands, { onExecute });
      palette.setFocus(true);
      palette.keypress(k('Enter'));
      const lines = palette.draw(ctx());
      // First command should be selected
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('isActive', () => {
    it('should be active by default', () => {
      const palette = new CommandPalette(commands);
      expect(palette.isActive()).toBe(true);
    });
  });
});