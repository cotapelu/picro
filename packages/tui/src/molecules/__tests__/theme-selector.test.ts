import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeSelector, ThemeOption } from '../theme-selector';
import type { RenderContext, KeyEvent } from '../base';

function ctx(w = 80, h = 24): RenderContext {
  return { width: w, height: h };
}

function k(key: string): KeyEvent {
  return { key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

describe('ThemeSelector', () => {
  const themes: ThemeOption[] = [
    { id: 'dark', name: 'Dark', colors: { bg: '#000' } },
    { id: 'light', name: 'Light', colors: { bg: '#fff' } },
  ];

  describe('Constructor', () => {
    it('should create selector', () => {
      const sel = new ThemeSelector(themes, 10);
      expect(sel).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render themes', () => {
      const sel = new ThemeSelector(themes, 10);
      const lines = sel.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should fit width', () => {
      const sel = new ThemeSelector(themes, 10);
      const lines = sel.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.replace(/\x1b\[[0-9;]*m/g, '').length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard', () => {
    it('should navigate', () => {
      const sel = new ThemeSelector(themes, 10);
      sel.setFocus(true);
      sel.keypress(k('ArrowDown'));
      const lines = sel.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });
  });
});