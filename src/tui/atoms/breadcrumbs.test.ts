// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Breadcrumbs atom
 */

import { describe, it, expect } from 'vitest';
import { Breadcrumbs, breadcrumbsDefaultTheme, type BreadcrumbItem } from './breadcrumbs';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Breadcrumbs', () => {
  const items: BreadcrumbItem[] = [
    { label: 'Home', value: '/' },
    { label: 'Documents', value: '/docs' },
    { label: 'Project', value: '/docs/project' },
  ];

  describe('constructor', () => {
    it('should create with items', () => {
      const b = new Breadcrumbs({ items });
      expect(b['items']).toEqual(items);
    });

    it('should default separator to " / "', () => {
      const b = new Breadcrumbs({ items });
      expect(b['separator']).toBe(' / ');
    });

    it('should accept custom separator', () => {
      const b = new Breadcrumbs({ items, separator: ' > ' });
      expect(b['separator']).toBe(' > ');
    });

    it('should default showHome true', () => {
      const b = new Breadcrumbs({ items });
      expect(b['showHome']).toBe(true);
    });

    it('should default homeIcon to 🏠', () => {
      const b = new Breadcrumbs({ items });
      expect(b['homeIcon']).toBe('🏠');
    });

    it('should merge custom theme', () => {
      const b = new Breadcrumbs({ items, theme: { itemColor: (s) => `\x1b[31m${s}\x1b[0m` } });
      expect(b['theme'].itemColor).not.toBe(breadcrumbsDefaultTheme.itemColor);
    });
  });

  describe('setItems()', () => {
    it('should update items', () => {
      const b = new Breadcrumbs({ items });
      const newItems = [{ label: 'A', value: '/a' }];
      b.setItems(newItems);
      expect(b['items']).toEqual(newItems);
    });
  });

  describe('draw()', () => {
    it('should render line with separators', () => {
      const b = new Breadcrumbs({ items, showHome: false });
      const result = b.draw(defaultContext);
      expect(result[0]).toContain('Home');
      expect(result[0]).toContain('Documents');
      expect(result[0]).toContain('Project');
    });

    it('should include home icon when showHome true', () => {
      const b = new Breadcrumbs({ items, showHome: true });
      const result = b.draw(defaultContext);
      expect(result[0]).toContain('🏠');
    });

    it('should style active (last) item differently', () => {
      const b = new Breadcrumbs({ items });
      const result = b.draw(defaultContext);
      // activeItemColor uses bold white
      expect(result[0]).toContain('\x1b[1;37m');
    });

    it('should apply dim color to separator', () => {
      const b = new Breadcrumbs({ items });
      const result = b.draw(defaultContext);
      expect(result[0]).toContain('\x1b[90m'); // separator dim
    });

    it('should truncate to width', () => {
      const b = new Breadcrumbs({ items, showHome: false });
      const result = b.draw({ ...defaultContext, width: 10 });
      const visible = result[0].replace(/\x1b\[[0-9;]*m/g, '');
      expect(visible.length).toBeLessThanOrEqual(10);
    });

    it('should include icon in label if provided', () => {
      const itemsWithIcon: BreadcrumbItem[] = [{ label: 'File', value: '/f', icon: '📄' }];
      const b = new Breadcrumbs({ items: itemsWithIcon, showHome: false });
      const result = b.draw(defaultContext);
      expect(result[0]).toContain('📄');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const b = new Breadcrumbs({ items });
      expect(() => b.clearCache()).not.toThrow();
    });
  });
});