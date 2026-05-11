// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Rating atom
 */

import { describe, it, expect } from 'vitest';
import { Rating, createRating, ratingDefaultTheme } from './rating';
import type { RenderContext } from './base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Rating', () => {
  describe('constructor', () => {
    it('should create with value and maxStars', () => {
      const rating = new Rating({ value: 3, maxStars: 5 });
      expect(rating.getValue()).toBe(3);
      expect(rating['maxStars']).toBe(5);
    });

    it('should clamp value between 0 and maxStars', () => {
      const rating = new Rating({ value: 10, maxStars: 5 });
      expect(rating.getValue()).toBe(5);
      const rating2 = new Rating({ value: -1, maxStars: 5 });
      expect(rating2.getValue()).toBe(0);
    });

    it('should use default stars=5', () => {
      const rating = new Rating({ value: 2 });
      expect(rating['maxStars']).toBe(5);
    });

    it('should accept custom chars', () => {
      const rating = new Rating({ value: 2, filledChar: 'x', emptyChar: '.' });
      expect(rating['filledChar']).toBe('x');
    });

    it('should merge custom theme', () => {
      const rating = new Rating({ value: 2, theme: { filledStar: (s) => `\x1b[31m${s}\x1b[0m` } });
      expect(rating['theme'].filledStar).not.toBe(ratingDefaultTheme.filledStar);
    });
  });

  describe('setValue()', () => {
    it('should update value with clamping', () => {
      const rating = new Rating({ value: 2, maxStars: 5 });
      rating.setValue(4);
      expect(rating.getValue()).toBe(4);
      rating.setValue(10);
      expect(rating.getValue()).toBe(5);
    });
  });

  describe('draw()', () => {
    it('should render stars with correct count', () => {
      const rating = new Rating({ value: 3, maxStars: 5, showLabel: false });
      const result = rating.draw(defaultContext);
      expect(result[0]).toContain('★');
      // Filled repeats: 3 stars filled
      const matches = result[0].match(/★/g);
      expect(matches?.length).toBe(3);
    });

    it('should show empty stars', () => {
      const rating = new Rating({ value: 0, maxStars: 3, showLabel: false });
      const result = rating.draw(defaultContext);
      expect(result[0]).toContain('☆');
    });

    it('should show half star if allowHalf and value has .5', () => {
      const rating = new Rating({ value: 2.5, maxStars: 5, showLabel: false });
      const result = rating.draw(defaultContext);
      // halfChar default is '½', but halfStar applies color, so expect half char
      expect(result[0]).toContain('½');
    });

    it('should include label if showLabel true', () => {
      const rating = new Rating({ value: 4, maxStars: 5, showLabel: true, label: 'Rating' });
      const result = rating.draw(defaultContext);
      expect(result[0]).toContain('Rating');
    });

    it('should use default label if none provided', () => {
      const rating = new Rating({ value: 3, maxStars: 5, showLabel: true });
      const result = rating.draw(defaultContext);
      expect(result[0]).toContain('3/5');
    });
  });

  describe('clearCache()', () => {
    it('should be no-op', () => {
      const rating = new Rating({ value: 3 });
      expect(() => rating.clearCache()).not.toThrow();
    });
  });

  describe('createRating factory', () => {
    it('should create Rating instance', () => {
      const rating = createRating(4);
      expect(rating).toBeInstanceOf(Rating);
      expect(rating.getValue()).toBe(4);
    });
  });
});