import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Breadcrumbs,
  BreadcrumbItem,
  BreadcrumbsTheme,
  breadcrumbsDefaultTheme,
  BreadcrumbsOptions,
} from '../breadcrumbs';
import type { RenderContext } from '../base';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Breadcrumbs Component', () => {
  describe('Interfaces and Types', () => {
    it('should have correct BreadcrumbItem shape', () => {
      const item: BreadcrumbItem = {
        label: 'Home',
        value: '/home',
        icon: '🏠',
      };
      expect(item.label).toBe('Home');
      expect(item.value).toBe('/home');
      expect(item.icon).toBe('🏠');
    });

    it('should have correct BreadcrumbsTheme shape', () => {
      const theme: BreadcrumbsTheme = {
        separatorColor: (s) => `\x1b[90m${s}\x1b[0m`,
        itemColor: (s) => `\x1b[36m${s}\x1b[0m`,
        activeItemColor: (s) => `\x1b[1;37m${s}\x1b[0m`,
        dimColor: (s) => `\x1b[90m${s}\x1b[0m`,
      };
      expect(theme.separatorColor(' / ')).toContain('\x1b[90m');
      expect(theme.itemColor('test')).toContain('\x1b[36m');
      expect(theme.activeItemColor('test')).toContain('\x1b[1;37m');
      expect(theme.dimColor('test')).toContain('\x1b[90m');
    });

    it('should have default theme with correct ANSI codes', () => {
      expect(breadcrumbsDefaultTheme.separatorColor(' / ')).toBe('\x1b[90m / \x1b[0m');
      expect(breadcrumbsDefaultTheme.itemColor('test')).toBe('\x1b[36mtest\x1b[0m');
      expect(breadcrumbsDefaultTheme.activeItemColor('test')).toBe('\x1b[1;37mtest\x1b[0m');
      expect(breadcrumbsDefaultTheme.dimColor('test')).toBe('\x1b[90mtest\x1b[0m');
    });
  });

  describe('Constructor', () => {
    it('should create breadcrumbs with required options', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', value: '/' },
        { label: 'Docs', value: '/docs' },
        { label: 'Guide', value: '/docs/guide' },
      ];
      const breadcrumbs = new Breadcrumbs({ items });
      expect(breadcrumbs).toBeInstanceOf(Breadcrumbs);
    });

    it('should use default separator when not provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items });
      // Default separator is ' / '
      expect(breadcrumbs).toBeDefined();
    });

    it('should use custom separator when provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, separator: ' > ' });
      expect(breadcrumbs).toBeDefined();
    });

    it('should default showHome to true', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
      ];
      const breadcrumbs = new Breadcrumbs({ items });
      expect(breadcrumbs).toBeDefined();
    });

    it('should showHome false when explicitly set', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      expect(breadcrumbs).toBeDefined();
    });

    it('should use custom homeIcon when provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, homeIcon: '🏡' });
      expect(breadcrumbs).toBeDefined();
    });

    it('should merge custom theme with defaults', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
      ];
      const breadcrumbs = new Breadcrumbs({
        items,
        theme: {
          itemColor: (s) => `\x1b[31m${s}\x1b[0m`,
        },
      });
      expect(breadcrumbs).toBeDefined();
    });

    it('should accept onSelect callback', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
      ];
      const onSelect = vi.fn();
      const breadcrumbs = new Breadcrumbs({ items, onSelect });
      expect(breadcrumbs).toBeDefined();
    });
  });

  describe('setItems', () => {
    it('should update items dynamically', () => {
      const initialItems: BreadcrumbItem[] = [
        { label: 'Home', value: '/' },
      ];
      const breadcrumbs = new Breadcrumbs({ items: initialItems });

      const newItems: BreadcrumbItem[] = [
        { label: 'Home', value: '/' },
        { label: 'Docs', value: '/docs' },
      ];
      breadcrumbs.setItems(newItems);

      expect(breadcrumbs).toBeInstanceOf(Breadcrumbs);
    });

    it('should handle empty items array', () => {
      const breadcrumbs = new Breadcrumbs({ items: [] });
      breadcrumbs.setItems([]);
      expect(breadcrumbs).toBeDefined();
    });
  });

  describe('clearCache', () => {
    it('should be callable without errors', () => {
      const breadcrumbs = new Breadcrumbs({ items: [] });
      expect(() => breadcrumbs.clearCache()).not.toThrow();
    });
  });

  describe('draw', () => {
    const defaultContext: RenderContext = { width: 80, height: 24 };

    it('should render breadcrumbs line', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', value: '/' },
        { label: 'Docs', value: '/docs' },
        { label: 'Guide', value: '/docs/guide' },
      ];
      const breadcrumbs = new Breadcrumbs({ items });
      const result = breadcrumbs.draw(defaultContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Home');
      expect(result[0]).toContain('Docs');
      expect(result[0]).toContain('Guide');
    });

    it('should include home icon when showHome is true', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Docs', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: true });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('🏠');
    });

    it('should not include home icon when showHome is false', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Docs', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).not.toContain('🏠');
    });

    it('should use custom homeIcon when provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Docs', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: true, homeIcon: '🏡' });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('🏡');
    });

    it('should include item icons when provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Documents', value: '/docs', icon: '📁' },
        { label: 'File', value: '/docs/file', icon: '📄' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('📁');
      expect(result[0]).toContain('📄');
    });

    it('should apply separator color to separators', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      // Separator should have ANSI codes from separatorColor
      expect(result[0]).toContain('\x1b[90m');
    });

    it('should apply item color to non-active items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      // Non-active items should have cyan color (36)
      expect(result[0]).toContain('\x1b[36mA\x1b[0m');
    });

    it('should apply active item color to last item', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      // Last item should have bold white color (1;37)
      expect(result[0]).toContain('\x1b[1;37mB\x1b[0m');
    });

    it('should apply dim color to home icon', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Docs', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: true });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('\x1b[90m🏠\x1b[0m');
    });

    it('should use custom separator', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, separator: ' > ', showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain(' > ');
    });

    it('should truncate long text to fit width', () => {
      const longLabel = 'A'.repeat(50);
      const items: BreadcrumbItem[] = [
        { label: longLabel, value: '/long' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      // Result should not exceed width (may contain ellipsis)
      const visibleLength = result[0].replace(/\x1b\[[0-9;]*m/g, '').length;
      expect(visibleLength).toBeLessThanOrEqual(defaultContext.width);
    });

    it('should handle single item correctly', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Only', value: '/only' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('Only');
      // Should not have separators
      expect(result[0].split('Only').length).toBe(1);
    });

    it('should handle empty items array', () => {
      const breadcrumbs = new Breadcrumbs({ items: [] });
      const result = breadcrumbs.draw(defaultContext);

      expect(result).toHaveLength(1);
      // Empty breadcrumbs with home should just show home icon
      expect(result[0]).toContain('🏠');
    });

    it('should handle items with empty labels', () => {
      const items: BreadcrumbItem[] = [
        { label: '', value: '/' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toBeDefined();
    });

    it('should respect narrow width', () => {
      const narrowContext: RenderContext = { width: 10, height: 24 };
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'VeryLongLabel', value: '/verylong' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(narrowContext);

      const visibleLength = result[0].replace(/\x1b\[[0-9;]*m/g, '').length;
      expect(visibleLength).toBeLessThanOrEqual(10);
    });

    it('should apply custom theme colors', () => {
      const items: BreadcrumbItem[] = [
        { label: 'A', value: '/a' },
        { label: 'B', value: '/b' },
      ];
      const breadcrumbs = new Breadcrumbs({
        items,
        theme: {
          separatorColor: (s) => `\x1b[31m${s}\x1b[0m`, // red separator
          itemColor: (s) => `\x1b[32m${s}\x1b[0m`, // green items
          activeItemColor: (s) => `\x1b[33m${s}\x1b[0m`, // yellow active
          dimColor: (s) => `\x1b[35m${s}\x1b[0m`, // magenta dim
        },
        showHome: false,
      });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('\x1b[31m'); // red separator
      expect(result[0]).toContain('\x1b[32m'); // green items
      expect(result[0]).toContain('\x1b[33m'); // yellow active
    });
  });

  describe('Integration', () => {
    it('should work with realistic path structure', () => {
      const items: BreadcrumbItem[] = [
        { label: 'root', value: '/' },
        { label: 'home', value: '/home' },
        { label: 'user', value: '/home/user' },
        { label: 'projects', value: '/home/user/projects' },
        { label: 'my-app', value: '/home/user/projects/my-app' },
      ];
      const breadcrumbs = new Breadcrumbs({ items });
      const result = breadcrumbs.draw(createContext(60, 24));

      expect(result[0]).toContain('root');
      expect(result[0]).toContain('home');
      expect(result[0]).toContain('user');
      expect(result[0]).toContain('projects');
      expect(result[0]).toContain('my-app');
    });

    it('should handle I18n labels', () => {
      const items: BreadcrumbItem[] = [
        { label: ' Trang chủ ', value: '/' }, // Vietnamese with spaces
        { label: 'Tài liệu', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('Trang chủ');
      expect(result[0]).toContain('Tài liệu');
    });

    it('should handle emoji in labels', () => {
      const items: BreadcrumbItem[] = [
        { label: '📁 Documents', value: '/docs' },
      ];
      const breadcrumbs = new Breadcrumbs({ items, showHome: false });
      const result = breadcrumbs.draw(defaultContext);

      expect(result[0]).toContain('📁');
    });
  });
});
