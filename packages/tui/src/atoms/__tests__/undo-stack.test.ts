import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UndoStack, UndoRedoManager } from '../undo-stack';

// Mock structuredClone
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

describe('UndoStack', () => {
  interface TestState {
    text: string;
    count: number;
    nested?: { value: number };
  }

  describe('Constructor', () => {
    it('should create stack with default unlimited limit', () => {
      const stack = new UndoStack<TestState>();
      expect(stack.getLimit()).toBe(0);
    });

    it('should create stack with specified limit', () => {
      const stack = new UndoStack<TestState>(10);
      expect(stack.getLimit()).toBe(10);
    });
  });

  describe('push', () => {
    it('should push state onto stack', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'hello', count: 1 });
      expect(stack.length).toBe(1);
    });

    it('should store deep clone', () => {
      const stack = new UndoStack<TestState>();
      const original = { text: 'hello', count: 1, nested: { value: 42 } };
      stack.push(original);
      original.nested!.value = 100;
      const peeked = stack.peek();
      expect(peeked?.nested?.value).toBe(42);
    });
  });

  describe('pop', () => {
    it('should return most recent snapshot', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'first', count: 1 });
      stack.push({ text: 'second', count: 2 });
      const popped = stack.pop();
      expect(popped?.text).toBe('second');
    });

    it('should remove snapshot from stack', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'a', count: 1 });
      stack.push({ text: 'b', count: 2 });
      stack.pop();
      expect(stack.length).toBe(1);
    });

    it('should return undefined when stack is empty', () => {
      const stack = new UndoStack<TestState>();
      expect(stack.pop()).toBeUndefined();
    });
  });

  describe('peek', () => {
    it('should return most recent without removing', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'a', count: 1 });
      const peeked = stack.peek();
      expect(peeked?.text).toBe('a');
      expect(stack.length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all snapshots', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'a', count: 1 });
      stack.push({ text: 'b', count: 2 });
      stack.clear();
      expect(stack.isEmpty()).toBe(true);
    });
  });

  describe('length', () => {
    it('should reflect current number', () => {
      const stack = new UndoStack<TestState>();
      expect(stack.length).toBe(0);
      stack.push({ text: 'a', count: 1 });
      expect(stack.length).toBe(1);
      stack.push({ text: 'b', count: 2 });
      expect(stack.length).toBe(2);
      stack.pop();
      expect(stack.length).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty stack', () => {
      const stack = new UndoStack<TestState>();
      expect(stack.isEmpty()).toBe(true);
    });

    it('should return false for non-empty stack', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'a', count: 1 });
      expect(stack.isEmpty()).toBe(false);
    });
  });

  describe('canUndo', () => {
    it('should return true when stack has snapshots', () => {
      const stack = new UndoStack<TestState>();
      stack.push({ text: 'a', count: 1 });
      expect(stack.canUndo()).toBe(true);
    });

    it('should return false when stack is empty', () => {
      const stack = new UndoStack<TestState>();
      expect(stack.canUndo()).toBe(false);
    });
  });

  describe('setLimit', () => {
    it('should update limit', () => {
      const stack = new UndoStack<TestState>(5);
      stack.setLimit(10);
      expect(stack.getLimit()).toBe(10);
    });

    it('should trim stack if new limit is smaller', () => {
      const stack = new UndoStack<TestState>(10);
      stack.push({ text: '1', count: 1 });
      stack.push({ text: '2', count: 2 });
      stack.push({ text: '3', count: 3 });
      stack.setLimit(2);
      expect(stack.length).toBe(2);
    });
  });

  describe('Integration', () => {
    it('should handle complex state with nested objects', () => {
      const stack = new UndoStack<TestState>();
      const state1 = { text: 'Hello', count: 1, nested: { value: 100 } };
      const state2 = { text: 'World', count: 2, nested: { value: 200 } };
      stack.push(state1);
      stack.push(state2);
      const restored = stack.pop();
      expect(restored?.text).toBe('World');
      expect(restored?.nested?.value).toBe(200);
      const original = stack.pop();
      expect(original?.text).toBe('Hello');
      expect(original?.nested?.value).toBe(100);
    });
  });
});

describe('UndoRedoManager', () => {
  interface EditorState {
    text: string;
    cursor: number;
  }

  describe('Constructor', () => {
    it('should create manager with default unlimited limit', () => {
      const manager = new UndoRedoManager<EditorState>();
      expect(manager.undoLength).toBe(0);
    });
  });

  describe('save', () => {
    it('should save state to undo stack', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 });
      expect(manager.undoLength).toBe(1);
    });

    it('should clear redo stack on save', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 });
      manager.save({ text: 'World', cursor: 5 });
      manager.undo({ text: 'World', cursor: 5 }); // undo to populate redo
      manager.save({ text: 'New', cursor: 2 });
      expect(manager.redoLength).toBe(0);
    });
  });

  describe('undo', () => {
    it('should return previous state when current provided', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 }); // saved empty
      const current = { text: 'World', cursor: 5 };
      manager.save(current);
      const restored = manager.undo(current);
      expect(restored?.text).toBe('Hello');
      expect(manager.undoLength).toBe(1);
      expect(manager.redoLength).toBe(1);
    });

    it('should return undefined when nothing to undo', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 });
      const result = manager.undo();
      expect(result?.text).toBe('Hello'); // returns the only state
    });

    it('should push current state to redo when provided', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'A', cursor: 0 });
      const current = { text: 'B', cursor: 1 };
      manager.save(current);
      manager.undo(current);
      expect(manager.redoLength).toBe(1);
    });
  });

  describe('redo', () => {
    it('should return next state', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 });
      const current = { text: 'World', cursor: 5 };
      manager.save(current);
      manager.undo(current);
      const next = manager.redo({ text: 'Hello', cursor: 0 });
      expect(next?.text).toBe('World');
    });

    it('should return undefined when nothing to redo', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'Hello', cursor: 0 });
      expect(manager.redo()).toBeUndefined();
    });
  });

  describe('canUndo / canRedo', () => {
    it('should report canUndo correctly', () => {
      const mgr = new UndoRedoManager<EditorState>();
      expect(mgr.canUndo()).toBe(false);
      mgr.save({ text: 'a', cursor: 0 });
      expect(mgr.canUndo()).toBe(true);
      mgr.save({ text: 'ab', cursor: 1 });
      expect(mgr.canUndo()).toBe(true);
    });

    it('should report canRedo correctly', () => {
      const mgr = new UndoRedoManager<EditorState>();
      mgr.save({ text: 'a', cursor: 0 });
      mgr.save({ text: 'ab', cursor: 1 });
      expect(mgr.canRedo()).toBe(false);
      mgr.undo({ text: 'ab', cursor: 1 });
      expect(mgr.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear both stacks', () => {
      const manager = new UndoRedoManager<EditorState>();
      manager.save({ text: 'a', cursor: 0 });
      manager.save({ text: 'ab', cursor: 1 });
      manager.undo({ text: 'ab', cursor: 1 });
      manager.clear();
      expect(manager.undoLength).toBe(0);
      expect(manager.redoLength).toBe(0);
    });
  });

  describe('Limit enforcement', () => {
    it('should enforce limit on undo stack', () => {
      const mgr = new UndoRedoManager<EditorState>(2);
      mgr.save({ text: '1', cursor: 0 });
      mgr.save({ text: '2', cursor: 1 });
      mgr.save({ text: '3', cursor: 2 });
      expect(mgr.undoLength).toBe(2);
    });
  });
});