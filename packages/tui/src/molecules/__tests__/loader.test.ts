import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Loader, LoaderVariant } from '../loader';
import type { RenderContext } from '../base';

function ctx(w = 80, h = 24): RenderContext {
  return { width: w, height: h };
}

describe('Loader', () => {
  describe('Constructor', () => {
    it('should create default loader', () => {
      const loader = new Loader();
      expect(loader).toBeDefined();
    });

    it('should create spinner variant', () => {
      const loader = new Loader({ variant: 'spinner' });
      expect(loader).toBeDefined();
    });

    it('should create dots variant', () => {
      const loader = new Loader({ variant: 'dots' });
      expect(loader).toBeDefined();
    });

    it('should create line variant', () => {
      const loader = new Loader({ variant: 'line' });
      expect(loader).toBeDefined();
    });
  });

  describe('draw', () => {
    it('should render spinner', () => {
      const loader = new Loader({ variant: 'spinner', label: 'Loading' });
      const lines = loader.draw(ctx());
      expect(lines.join('')).toContain('Loading');
    });

    it('should render dots', () => {
      const loader = new Loader({ variant: 'dots', label: 'Loading' });
      const lines = loader.draw(ctx());
      expect(lines.join('')).toContain('Loading');
    });

    it('should fit width', () => {
      const loader = new Loader({ variant: 'spinner', label: 'Loading...' });
      const lines = loader.draw(ctx(20, 24));
      for (const line of lines) {
        expect(line.replace(/\x1b\[[0-9;]*m/g, '').length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('update', () => {
    it('should update frame', () => {
      const loader = new Loader({ variant: 'spinner', label: 'Loading' });
      loader.update();
      const lines = loader.draw(ctx());
      expect(lines.join('')).toContain('Loading');
    });
  });

  describe('isComplete', () => {
    it('should return false by default', () => {
      const loader = new Loader();
      expect(loader.isComplete()).toBe(false);
    });
  });
});