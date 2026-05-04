import { describe, it, expect, vi } from 'vitest';
import { CancellableLoader } from '../cancellable-loader';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('CancellableLoader', () => {
  describe('Constructor', () => {
    it('should create loader', () => {
      const loader = new CancellableLoader('Loading...');
      expect(loader).toBeDefined();
    });

    it('should create with message', () => {
      const loader = new CancellableLoader('Processing');
      expect(loader).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render', () => {
      const loader = new CancellableLoader('Loading');
      const lines = loader.draw(ctx());
      expect(lines.join('')).toContain('Loading');
    });

    it('should fit width', () => {
      const loader = new CancellableLoader('Loading...');
      const lines = loader.draw(ctx(20, 24));
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(20);
      }
    });

    it('should show cancel hint', () => {
      const loader = new CancellableLoader('Processing');
      const lines = loader.draw(ctx());
      const content = lines.join('');
      expect(content).toContain('ESC');
    });
  });

  describe('keyboard', () => {
    it('should handle Escape to cancel', () => {
      const onCancel = vi.fn();
      const loader = new CancellableLoader('Loading', { onCancel });
      loader.setFocus(true);
      loader.keypress(k('Escape'));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});