// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for StatsFooter atom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatsFooter, type SessionStats } from './stats-footer';
import type { RenderContext } from '../core/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('StatsFooter', () => {
  let footer: StatsFooter;

  beforeEach(() => {
    footer = new StatsFooter();
  });

  describe('setStats()', () => {
    it('should update stats and refresh items', () => {
      const stats: SessionStats = {
        cwd: '/home/user/project',
        gitBranch: 'main',
        tokens: { input: 123, output: 456 },
        cost: 0.123,
        contextPercent: 45,
        model: { name: 'claude-3', provider: 'Anthropic' },
        autoCompactEnabled: true,
        extensions: [{ name: 'ext1', enabled: true }, { name: 'ext2', enabled: false }],
      };
      footer.setStats(stats);
      // No error thrown
    });
  });

  describe('draw()', () => {
    it('should render stats', () => {
      const stats: SessionStats = {
        cwd: '/test',
        tokens: { input: 100, output: 200 },
        model: { name: 'gpt-4', provider: 'OpenAI' },
      };
      footer.setStats(stats);
      const result = footer.draw(defaultContext);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(l => l.includes('/test'))).toBe(true);
      expect(result.some(l => l.includes('OpenAI/gpt-4'))).toBe(true);
    });

    it('should show auto-compact indicator', () => {
      const stats: SessionStats = {
        cwd: '/',
        autoCompactEnabled: true,
      };
      footer.setStats(stats);
      const result = footer.draw(defaultContext);
      expect(result.some(l => l.includes('[AC]'))).toBe(true);
    });

    it('should show context percent with color', () => {
      const stats: SessionStats = {
        cwd: '/',
        contextPercent: 90, // high -> red
      };
      footer.setStats(stats);
      const result = footer.draw(defaultContext);
      expect(result.some(l => l.includes('\x1b[31m'))).toBe(true);
    });

    it('should handle missing optional fields', () => {
      const stats: SessionStats = {
        cwd: '/',
      };
      footer.setStats(stats);
      expect(() => footer.draw(defaultContext)).not.toThrow();
    });
  });

  describe('clearCache()', () => {
    it('should clear cache (delegated to parent)', () => {
      footer.clearCache();
      // no error
    });
  });
});