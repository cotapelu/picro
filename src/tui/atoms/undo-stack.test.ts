// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for UndoStack atom
 */

import { describe, it, expect } from 'vitest';
import { UndoStack } from './undo-stack';

describe('UndoStack', () => {
  interface State {
    value: number;
  }

  describe('constructor', () => {
    it('should create unlimited stack by default', () => {
      const stack = new UndoStack<State>();
      expect(stack['limit']).toBe(0);
    });

    it('should accept limit', () => {
      const stack = new UndoStack<State>(5);
      expect(stack['limit']).toBe(5);
    });
  });

  describe('push()', () => {
    it('should add state to stack', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      expect(stack.length).toBe(1);
    });

    it('should clone state (deep copy)', () => {
      const stack = new UndoStack<State>();
      const state = { value: 1, nested: { x: 1 } };
      stack.push(state);
      // Modify original
      state.value = 2;
      state.nested.x = 2;
      const popped = stack.pop();
      expect(popped?.value).toBe(1);
      expect(popped?.nested.x).toBe(1);
    });

    it('should enforce limit by removing oldest', () => {
      const stack = new UndoStack<State>(3);
      stack.push({ value: 1 });
      stack.push({ value: 2 });
      stack.push({ value: 3 });
      stack.push({ value: 4 }); // should shift 1 out
      expect(stack.length).toBe(3);
      // The oldest (1) gone
      stack.pop(); // returns 4
      stack.pop(); // returns 3
      stack.pop(); // returns 2
      expect(stack.pop()).toBeUndefined();
    });
  });

  describe('pop()', () => {
    it('should return and remove most recent', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      stack.push({ value: 2 });
      const popped = stack.pop();
      expect(popped?.value).toBe(2);
      expect(stack.length).toBe(1);
    });

    it('should return undefined when empty', () => {
      const stack = new UndoStack<State>();
      expect(stack.pop()).toBeUndefined();
    });
  });

  describe('peek()', () => {
    it('should return most recent without removing', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      stack.push({ value: 2 });
      const peeked = stack.peek();
      expect(peeked?.value).toBe(2);
      expect(stack.length).toBe(2);
    });

    it('should return undefined when empty', () => {
      const stack = new UndoStack<State>();
      expect(stack.peek()).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should remove all snapshots', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      stack.push({ value: 2 });
      stack.clear();
      expect(stack.length).toBe(0);
      expect(stack.isEmpty()).toBe(true);
    });
  });

  describe('length', () => {
    it('should return count', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      stack.push({ value: 2 });
      stack.push({ value: 3 });
      expect(stack.length).toBe(3);
    });
  });

  describe('isEmpty()', () => {
    it('should return true when empty', () => {
      const stack = new UndoStack<State>();
      expect(stack.isEmpty()).toBe(true);
    });

    it('should return false when not empty', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      expect(stack.isEmpty()).toBe(false);
    });
  });

  describe('canUndo()', () => {
    it('should return true if has snapshots', () => {
      const stack = new UndoStack<State>();
      stack.push({ value: 1 });
      expect(stack.canUndo()).toBe(true);
    });

    it('should return false if empty', () => {
      const stack = new UndoStack<State>();
      expect(stack.canUndo()).toBe(false);
    });
  });
});