import { describe, it, expect, vi } from 'vitest';
import { FileBrowser } from '../file-browser';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('FileBrowser', () => {
  describe('Constructor', () => {
    it('should create file browser', () => {
      const browser = new FileBrowser('/tmp');
      expect(browser).toBeDefined();
    });

    it('should create with hidden files option', () => {
      const browser = new FileBrowser('/tmp', { showHidden: true });
      expect(browser).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render file list', () => {
      const browser = new FileBrowser('/tmp');
      const lines = browser.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should fit width', () => {
      const browser = new FileBrowser('/tmp');
      const lines = browser.draw(ctx(30, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('keyboard', () => {
    it('should navigate', () => {
      const browser = new FileBrowser('/tmp');
      browser.setFocus(true);
      browser.keypress(k('ArrowDown'));
      const lines = browser.draw(ctx());
      expect(lines.length).toBeGreaterThan(0);
    });
  });
});