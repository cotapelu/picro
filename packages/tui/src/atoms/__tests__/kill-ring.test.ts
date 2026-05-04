import { describe, it, expect, beforeEach } from 'vitest';
import { KillRing, defaultKillRing, PushOptions } from '../kill-ring';

describe('KillRing', () => {
  let ring: KillRing;

  beforeEach(() => {
    ring = new KillRing();
  });

  describe('Constructor', () => {
    it('should create empty ring', () => {
      expect(ring.isEmpty()).toBe(true);
      expect(ring.length).toBe(0);
    });
  });

  describe('push', () => {
    it('should add text to ring', () => {
      ring.push('hello', { prepend: false });
      expect(ring.length).toBe(1);
      expect(ring.peek()).toBe('hello');
    });

    it('should accumulate forward deletion (append)', () => {
      ring.push('hello', { prepend: false });
      ring.push(' world', { prepend: false, accumulate: true });
      expect(ring.peek()).toBe('hello world');
      expect(ring.length).toBe(1);
    });

    it('should accumulate backward deletion (prepend)', () => {
      ring.push('world', { prepend: false });
      ring.push('hello ', { prepend: true, accumulate: true });
      expect(ring.peek()).toBe('hello world');
      expect(ring.length).toBe(1);
    });

    it('should not accumulate when accumulate is false', () => {
      ring.push('hello', { prepend: false });
      ring.push(' world', { prepend: false, accumulate: false });
      expect(ring.length).toBe(2);
      expect(ring.peek()).toBe(' world');
    });

    it('should ignore empty text', () => {
      ring.push('', { prepend: false });
      expect(ring.isEmpty()).toBe(true);
    });
  });

  describe('peek', () => {
    it('should return most recent entry', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      expect(ring.peek()).toBe('second');
    });

    it('should return undefined when empty', () => {
      expect(ring.peek()).toBeUndefined();
    });
  });

  describe('peekAt', () => {
    it('should return entry at index from end', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      ring.push('third', { prepend: false });
      expect(ring.peekAt(0)).toBe('third');
      expect(ring.peekAt(1)).toBe('second');
      expect(ring.peekAt(2)).toBe('first');
    });
  });

  describe('rotate', () => {
    it('should move last entry to front', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      ring.push('third', { prepend: false });
      ring.rotate();
      expect(ring.peek()).toBe('second');
    });

    it('should do nothing for single entry', () => {
      ring.push('only', { prepend: false });
      ring.rotate();
      expect(ring.peek()).toBe('only');
      expect(ring.length).toBe(1);
    });

    it('should do nothing for empty ring', () => {
      ring.rotate();
      expect(ring.isEmpty()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      ring.push('a', { prepend: false });
      ring.push('b', { prepend: false });
      ring.clear();
      expect(ring.isEmpty()).toBe(true);
      expect(ring.length).toBe(0);
    });
  });

  describe('length', () => {
    it('should return correct count', () => {
      expect(ring.length).toBe(0);
      ring.push('a', { prepend: false });
      expect(ring.length).toBe(1);
      ring.push('b', { prepend: false });
      expect(ring.length).toBe(2);
    });
  });

  describe('isEmpty', () => {
    it('should return true for new ring', () => {
      expect(ring.isEmpty()).toBe(true);
    });

    it('should return false after push', () => {
      ring.push('test', { prepend: false });
      expect(ring.isEmpty()).toBe(false);
    });

    it('should return true after clear', () => {
      ring.push('test', { prepend: false });
      ring.clear();
      expect(ring.isEmpty()).toBe(true);
    });
  });

  describe('getEntries', () => {
    it('should return all entries in reverse order', () => {
      ring.push('first', { prepend: false });
      ring.push('second', { prepend: false });
      ring.push('third', { prepend: false });
      const entries = ring.getEntries();
      expect(entries).toEqual(['third', 'second', 'first']);
    });
  });

  describe('defaultKillRing', () => {
    it('should be shared instance', () => {
      expect(defaultKillRing).toBeInstanceOf(KillRing);
    });
  });
});