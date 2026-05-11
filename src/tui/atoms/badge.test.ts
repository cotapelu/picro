// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for Badge atom component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Badge, BadgeGroup, badgeDefaultTheme, type BadgeVariant } from './badge';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Badge', () => {
  let badge: Badge;

  describe('constructor', () => {
    it('should create with required label', () => {
      badge = new Badge({ label: 'Status' });
      expect(badge).toBeInstanceOf(Badge);
    });

    it('should default to variant "default"', () => {
      badge = new Badge({ label: 'Test' });
      expect(badge['variant']).toBe('default');
    });

    it('should accept custom variant', () => {
      badge = new Badge({ label: 'Success', variant: 'success' });
      expect(badge['variant']).toBe('success');
    });

    it('should accept custom theme', () => {
      const customTheme = {
        ...badgeDefaultTheme,
        primary: (s) => `\x1b[31m${s}\x1b[0m`,
      };
      badge = new Badge({ label: 'Custom', variant: 'primary', theme: customTheme });
      expect(badge['theme'].primary).not.toBe(badgeDefaultTheme.primary);
    });

    it('should accept prefix and suffix', () => {
      badge = new Badge({ label: 'Count', prefix: '[', suffix: ']' });
      expect(badge['prefix']).toBe('[');
      expect(badge['suffix']).toBe(']');
    });
  });

  describe('setLabel()', () => {
    it('should update label', () => {
      badge = new Badge({ label: 'Initial' });
      badge.setLabel('Updated');
      expect(badge['label']).toBe('Updated');
    });
  });

  describe('setVariant()', () => {
    it('should update variant', () => {
      badge = new Badge({ label: 'Test', variant: 'default' });
      badge.setVariant('error');
      expect(badge['variant']).toBe('error');
    });

    it('should accept all variant types', () => {
      const variants: BadgeVariant[] = ['default', 'primary', 'success', 'warning', 'error', 'info'];
      variants.forEach(v => {
        const b = new Badge({ label: 'Test', variant: v });
        expect(b['variant']).toBe(v);
      });
    });
  });

  describe('getText()', () => {
    it('should return label only by default', () => {
      badge = new Badge({ label: 'Hello' });
      expect(badge.getText()).toBe('Hello');
    });

    it('should include prefix and suffix', () => {
      badge = new Badge({ label: 'Num', prefix: '<', suffix: '>' });
      expect(badge.getText()).toBe('<Num>');
    });

    it('should return empty string if label empty', () => {
      badge = new Badge({ label: '' });
      expect(badge.getText()).toBe('');
    });
  });

  describe('draw()', () => {
    it('should render a single line', () => {
      badge = new Badge({ label: 'Test' });
      const result = badge.draw(defaultContext);
      expect(result).toHaveLength(1);
    });

    it('should apply padding spaces', () => {
      badge = new Badge({ label: 'X' });
      const result = badge.draw(defaultContext);
      // Should have leading and trailing space
      expect(result[0].startsWith(' ')).toBe(true);
      expect(result[0].endsWith(' ')).toBe(true);
    });

    it('should apply default theme for default variant', () => {
      badge = new Badge({ label: 'Default' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[48;5;240m'); // bg grey
      expect(result[0]).toContain('\x1b[37m'); // fg white
    });

    it('should apply primary theme', () => {
      badge = new Badge({ label: 'Primary', variant: 'primary' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[48;5;33m'); // bg blue
      expect(result[0]).toContain('\x1b[97m'); // fg bright white
    });

    it('should apply success theme', () => {
      badge = new Badge({ label: 'Success', variant: 'success' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[48;5;28m'); // bg green
    });

    it('should apply error theme', () => {
      badge = new Badge({ label: 'Error', variant: 'error' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[48;5;196m'); // bg red
    });

    it('should apply warning theme', () => {
      badge = new Badge({ label: 'Warning', variant: 'warning' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[48;5;208m'); // bg orange
    });

    it('should include prefix and suffix in styled text', () => {
      badge = new Badge({ label: 'Count', prefix: '[', suffix: ']' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('[');
      expect(result[0]).toContain('Count');
      expect(result[0]).toContain(']');
    });

    it('should reset style at end', () => {
      badge = new Badge({ label: 'Test' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toMatch(/\\x1b\[0m$/);
    });

    it('should ignore context width/height', () => {
      badge = new Badge({ label: 'Fixed' });
      const narrow = { width: 5, height: 10 };
      const result = badge.draw(narrow);
      expect(result).toHaveLength(1);
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      badge = new Badge({ label: 'Test' });
      expect(() => badge.clearCache()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty label', () => {
      badge = new Badge({ label: '' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toBe(' \x1b[0m'); // just padding and reset
    });

    it('should handle very long label', () => {
      badge = new Badge({ label: 'A'.repeat(1000) });
      const result = badge.draw(defaultContext);
      expect(result).toBeDefined();
      expect(result[0].length).toBeGreaterThan(1000);
    });

    it('should handle unicode characters', () => {
      badge = new Badge({ label: '😀👍' });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('😀');
    });

    it('should handle custom theme overriding specific variants', () => {
      const theme = {
        default: badgeDefaultTheme.default,
        error: (s) => `\x1b[31m${s}\x1b[0m`, // custom red fg only
      };
      badge = new Badge({ label: 'Error', variant: 'error', theme });
      const result = badge.draw(defaultContext);
      expect(result[0]).toContain('\x1b[31m');
      // Should not have bg from default error theme
      expect(result[0]).not.toContain('\x1b[48;5;196m');
    });
  });
});

describe('BadgeGroup', () => {
  let group: BadgeGroup;

  beforeEach(() => {
    group = new BadgeGroup([]);
  });

  describe('constructor', () => {
    it('should create with badges array', () => {
      const badges = [new Badge({ label: 'A' }), new Badge({ label: 'B' })];
      group = new BadgeGroup(badges);
      expect(group['badges']).toHaveLength(2);
    });

    it('should default to empty array', () => {
      group = new BadgeGroup();
      expect(group['badges']).toHaveLength(0);
    });

    it('should accept custom separator', () => {
      group = new BadgeGroup([], ' | ');
      expect(group['separator']).toBe(' | ');
    });

    it('should default separator to space', () => {
      group = new BadgeGroup([]);
      expect(group['separator']).toBe(' ');
    });
  });

  describe('draw()', () => {
    it('should concatenate badges with separator', () => {
      group = new BadgeGroup([
        new Badge({ label: 'One' }),
        new Badge({ label: 'Two' }),
      ]);
      const result = group.draw(defaultContext);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('One');
      expect(result[0]).toContain('Two');
      expect(result[0]).toContain(group['separator']);
    });

    it('should render single badge without separator', () => {
      group = new BadgeGroup([new Badge({ label: 'Solo' })]);
      const result = group.draw(defaultContext);
      expect(result[0]).toBe('Solo'.replace(/^ /, ' ').replace(/ $/, ' ')); // with padding
    });

    it('should return empty array for no badges', () => {
      group = new BadgeGroup([]);
      const result = group.draw(defaultContext);
      expect(result).toHaveLength(0);
    });

    it('should handle custom separator', () => {
      group = new BadgeGroup([new Badge({ label: 'A' }), new Badge({ label: 'B' })], ' | ');
      const result = group.draw(defaultContext);
      expect(result[0]).toContain('A | B');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      expect(() => group.clearCache()).not.toThrow();
    });
  });
});