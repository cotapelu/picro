// SPDX-License-Identifier: Apache-2.0
/**
 * Comprehensive tests for ProgressBar atom component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressBar, createProgressBar } from './progress-bar';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('ProgressBar', () => {
  let bar: ProgressBar;

  beforeEach(() => {
    bar = new ProgressBar({});
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      expect(bar).toBeInstanceOf(ProgressBar);
      expect(bar.getValue()).toBe(0);
    });

    it('should accept percent', () => {
      const b = new ProgressBar({ percent: 50 });
      expect(b.getValue()).toBe(50);
    });

    it('should accept value as alias for percent', () => {
      const b = new ProgressBar({ value: 75 });
      expect(b.getValue()).toBe(75);
    });

    it('should clamp percent to 0-100', () => {
      const b = new ProgressBar({ percent: 150 });
      expect(b.getValue()).toBe(100);
      const b2 = new ProgressBar({ percent: -10 });
      expect(b2.getValue()).toBe(0);
    });

    it('should accept custom width', () => {
      const b = new ProgressBar({ width: 40 });
      expect(b['width']).toBe(40);
    });

    it('should accept custom height', () => {
      const b = new ProgressBar({ height: 3 });
      expect(b['height']).toBe(3);
    });

    it('should accept custom fill/empty characters', () => {
      const b = new ProgressBar({ fillChar: '=', emptyChar: '-' });
      expect(b['fillChar']).toBe('=');
      expect(b['emptyChar']).toBe('-');
    });

    it('should accept custom colors', () => {
      const b = new ProgressBar({
        labelColor: '\x1b[31m',
        fillColor: '\x1b[32m',
        emptyColor: '\x1b[90m',
      });
      expect(b['labelColor']).toBe('\x1b[31m');
      expect(b['fillColor']).toBe('\x1b[32m');
      expect(b['emptyColor']).toBe('\x1b[90m');
    });

    it('should hide label when showLabel=false', () => {
      const b = new ProgressBar({ showLabel: false });
      expect(b['showLabel']).toBe(false);
    });
  });

  describe('createProgressBar factory', () => {
    it('should create bar with value', () => {
      const b = createProgressBar(30);
      expect(b.getValue()).toBe(30);
    });

    it('should accept optional label param (ignored)', () => {
      const b = createProgressBar(50, 'Progress');
      expect(b).toBeInstanceOf(ProgressBar);
    });
  });

  describe('setPercent()', () => {
    it('should update percent', () => {
      bar.setPercent(60);
      expect(bar.getValue()).toBe(60);
    });

    it('should clamp to 0-100', () => {
      bar.setPercent(120);
      expect(bar.getValue()).toBe(100);
      bar.setPercent(-20);
      expect(bar.getValue()).toBe(0);
    });
  });

  describe('setValue()', () => {
    it('should be alias for setPercent', () => {
      bar.setValue(45);
      expect(bar.getValue()).toBe(45);
    });
  });

  describe('increment()', () => {
    it('should increase percent', () => {
      bar.setPercent(20);
      bar.increment(10);
      expect(bar.getValue()).toBe(30);
    });

    it('should clamp after increment', () => {
      bar.setPercent(90);
      bar.increment(20);
      expect(bar.getValue()).toBe(100);
    });
  });

  describe('getValue()', () => {
    it('should return current percent', () => {
      bar.setPercent(33);
      expect(bar.getValue()).toBe(33);
    });
  });

  describe('draw()', () => {
    it('should render line with bar', () => {
      bar = new ProgressBar({ percent: 50, width: 10, showLabel: false });
      const result = bar.draw(defaultContext);
      expect(result).toHaveLength(1);
      // Should contain fill and empty chars
      expect(result[0]).toContain('█');
      expect(result[0]).toContain('░');
    });

    it('should include label when showLabel=true', () => {
      bar = new ProgressBar({ percent: 50, width: 10, showLabel: true });
      const result = bar.draw(defaultContext);
      expect(result[0]).toContain('50%');
    });

    it('should apply fill color', () => {
      bar = new ProgressBar({ percent: 50, width: 10, fillColor: '\x1b[31m' });
      const result = bar.draw(defaultContext);
      expect(result[0]).toContain('\x1b[31m');
    });

    it('should apply empty color', () => {
      bar = new ProgressBar({ percent: 50, width: 10, emptyColor: '\x1b[90m' });
      const result = bar.draw(defaultContext);
      expect(result[0]).toContain('\x1b[90m');
    });

    it('should apply label color', () => {
      bar = new ProgressBar({ percent: 50, labelColor: '\x1b[33m' });
      const result = bar.draw(defaultContext);
      expect(result[0]).toContain('\x1b[33m');
    });

    it('should reset color at end', () => {
      bar = new ProgressBar({ percent: 50 });
      const result = bar.draw(defaultContext);
      expect(result[0].endsWith('\x1b[0m')).toBe(true);
    });

    it('should center bar in available width', () => {
      bar = new ProgressBar({ percent: 50, width: 10, showLabel: true });
      const result = bar.draw(defaultContext);
      const line = result[0];
      // Should have padding on left and right
      // Not necessarily equal if total width odd
      expect(line.length).toBeLessThanOrEqual(defaultContext.width);
    });

    it('should render multiple lines if height > 1', () => {
      bar = new ProgressBar({ percent: 50, height: 3, showLabel: false });
      const result = bar.draw(defaultContext);
      expect(result.length).toBe(3);
    });

    it('should handle 0%', () => {
      bar = new ProgressBar({ percent: 0, width: 10, showLabel: false });
      const result = bar.draw(defaultContext);
      expect(result[0]).not.toContain('█'); // no fill
      expect(result[0]).toContain('░'); // only empty
    });

    it('should handle 100%', () => {
      bar = new ProgressBar({ percent: 100, width: 10, showLabel: false });
      const result = bar.draw(defaultContext);
      expect(result[0]).toContain('█'.repeat(10));
      expect(result[0]).not.toContain('░');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op (stateless)', () => {
      bar.clearCache();
      // No cache to clear, should not throw
    });
  });

  describe('edge cases', () => {
    it('should handle very small width', () => {
      bar = new ProgressBar({ percent: 50, width: 1 });
      const result = bar.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle very large width', () => {
      bar = new ProgressBar({ percent: 50, width: 200 });
      const result = bar.draw(defaultContext);
      expect(result).toBeDefined();
    });

    it('should handle custom fill/empty chars of different lengths', () => {
      bar = new ProgressBar({ percent: 50, width: 4, fillChar: '=>', emptyChar: '..' });
      const result = bar.draw(defaultContext);
      expect(result).toBeDefined();
    });
  });
});