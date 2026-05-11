// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for KillRing atom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KillRing, type PushOptions } from './kill-ring';

describe('KillRing', () => {
  let ring: KillRing;

  beforeEach(() => {
    ring = new KillRing();
  });

  describe('push()', () => {
    it('should add text to ring', () => {
      ring.push('hello', { prepend: false });
      expect(ring.length).toBe(1);
    });

    it('should ignore empty text', () => {
      ring.push('', { prepend: false });
      expect(ring.length).toBe(0);
    });

    it('should accumulate with prepend', () => {
      ring.push('world', { prepend: false });
      ring.push('hello ', { prepend: true, accumulate: true });
      const result = ring.peek();
      expect(result).toBe('hello world');
    });

    it('should accumulate with append (prepend false)', () => {
      ring.push('hello', { prepend: false });
      ring.push(' world', { prepend: false, accumulate: true });
      expect(ring.peek()).toBe('hello world');
    });

    it('should not accumulate if no previous entry', () => {
      ring.push('first', { prepend: false, accumulate: true });
      ring.push('second', { prepend: false, accumulate: true });
      ring.push('third', { prepend: false, accumulate: true });
      // Only last non-accumulate? Actually accumulate only works if there is previous.
      // So second push will accumulate with first? Actually if accumulate and entries.length>0, merge with last.
      // So after first: ['first'], second: merge -> ['firstsecond'], third: merge -> ['firstsecondthird'].
      expect(ring.peek()).toBe('firstsecondthird');
    });
  });

  describe('peek()', () => {
    it('should return undefined when empty', () => {
      expect(ring.peek()).toBeUndefined();
    });

    it('should return most recent entry', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      expect(ring.peek()).toBe('second');
    });
  });

  describe('peekAt()', () => {
    it('should return entry at index from end', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      ring.push('third', { prepend: false });
      expect(ring.peekAt(0)).toBe('third'); // most recent
      expect(ring.peekAt(1)).toBe('second');
      expect(ring.peekAt(2)).toBe('first');
    });

    it('should return undefined for out-of-range', () => {
      ring.push('a', { prepend: false });
      expect(ring.peekAt(-1)).toBeUndefined();
      expect(ring.peekAt(1)).toBeUndefined();
    });
  });

  describe('rotate()', () => {
    it('should rotate last to first', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      ring.push('third', { prepend: false });
      ring.rotate();
      // After rotate: [third, first, second]? Actually pop last -> third, unshift to front => [third, first, second]
      expect(ring.peekAt(0)).toBe('second'); // peek returns last (end of array)
      expect(ring.peekAt(1)).toBe('first');
      expect(ring.peekAt(2)).toBe('third');
    });

    it('should do nothing if only one entry', () => {
      ring.push('only', { prepend: false });
      ring.rotate();
      expect(ring.peek()).toBe('only');
    });

    it('should do nothing if empty', () => {
      ring.rotate();
      expect(ring.length).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      ring.push('a', { prepend: false });
      ring.push('b', { prepend: false });
      ring.clear();
      expect(ring.length).toBe(0);
      expect(ring.isEmpty()).toBe(true);
    });
  });

  describe('length getter', () => {
    it('should return correct count', () => {
      expect(ring.length).toBe(0);
      ring.push('a', { prepend: false });
      ring.push('b', { prepend: false });
      expect(ring.length).toBe(2);
    });
  });

  describe('isEmpty()', () => {
    it('should return true when empty', () => {
      expect(ring.isEmpty()).toBe(true);
    });

    it('should return false when not empty', () => {
      ring.push('a', { prepend: false });
      expect(ring.isEmpty()).toBe(false);
    });
  });
});