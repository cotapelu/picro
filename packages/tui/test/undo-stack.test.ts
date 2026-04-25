/**
 * Tests for UndoStack module
 */
import { UndoStack, UndoRedoManager } from '../src/undo-stack.js';

interface TestResult { name: string; passed: boolean; error?: string; }
const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: message });
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`);
}

function assertTrue(value: boolean, message?: string): void {
  if (!value) throw new Error(message || 'Expected true');
}

function assertFalse(value: boolean, message?: string): void {
  if (value) throw new Error(message || 'Expected false');
}

interface TestState {
  value: string;
  count: number;
}

console.log('\n🔄 UndoStack Tests');

// UndoStack pushes state
test('push adds state', () => {
  const stack = new UndoStack<TestState>();
  stack.push({ value: 'test', count: 1 });
  assertEqual(stack.length, 1);
});

// pop returns most recent
test('pop returns most recent state', () => {
  const stack = new UndoStack<TestState>();
  stack.push({ value: 'first', count: 1 });
  stack.push({ value: 'second', count: 2 });
  const state = stack.pop();
  assertEqual(state?.value, 'second');
  assertEqual(stack.length, 1);
});

// pop returns undefined when empty
test('pop returns undefined when empty', () => {
  const stack = new UndoStack<TestState>();
  assertEqual(stack.pop(), undefined);
});

// clear empties stack
test('clear removes all states', () => {
  const stack = new UndoStack<TestState>();
  stack.push({ value: 'test', count: 1 });
  stack.clear();
  assertEqual(stack.length, 0);
  assertTrue(stack.isEmpty());
});

// canUndo works
test('canUndo returns correct state', () => {
  const stack = new UndoStack<TestState>();
  assertFalse(stack.canUndo());
  stack.push({ value: 'test', count: 1 });
  assertTrue(stack.canUndo());
});

// limit enforces size
test('limit enforces maximum size', () => {
  const stack = new UndoStack<TestState>(2);
  stack.push({ value: 'a', count: 1 });
  stack.push({ value: 'b', count: 2 });
  stack.push({ value: 'c', count: 3 });
  assertEqual(stack.length, 2);
});

// ========== UndoRedoManager ==========
console.log('\n↩️ UndoRedoManager Tests');

// undo returns previous
test('undo returns previous state', () => {
  const manager = new UndoRedoManager<TestState>();
  manager.save({ value: 'first', count: 1 });
  manager.save({ value: 'second', count: 2 });
  const current: TestState = { value: 'current', count: 3 };
  const undoState = manager.undo(current);
  assertEqual(undoState?.value, 'second');
});

// redo works after undo
test('redo works after undo', () => {
  const manager = new UndoRedoManager<TestState>();
  manager.save({ value: 'first', count: 1 });
  manager.save({ value: 'second', count: 2 });
  const undoState = manager.undo({ value: 'current', count: 3 });
  // After undo, undoStack has previous, redoStack has current
  assertEqual(undoState?.value, 'second');
  assertTrue(manager.canRedo());
  // Redo returns the state we were just at
  const redoState = manager.redo({ value: 'after-undo', count: 4 });
  assertEqual(redoState?.value, 'current');
});

// save clears redo
test('save clears redo stack', () => {
  const manager = new UndoRedoManager<TestState>();
  manager.save({ value: 'a', count: 1 });
  manager.save({ value: 'b', count: 2 });
  manager.undo({ value: 'c', count: 3 });
  manager.save({ value: 'new', count: 4 });
  assertEqual(manager.redoLength, 0);
});

// canUndo/canRedo
test('canUndo/canRedo work correctly', () => {
  const manager = new UndoRedoManager<TestState>();
  assertFalse(manager.canUndo());
  assertFalse(manager.canRedo());
  manager.save({ value: 'a', count: 1 });
  assertTrue(manager.canUndo());
});

// clear empties both
test('clear empties both stacks', () => {
  const manager = new UndoRedoManager<TestState>();
  manager.save({ value: 'a', count: 1 });
  manager.save({ value: 'b', count: 2 });
  manager.undo({ value: 'c', count: 3 });
  manager.clear();
  assertEqual(manager.undoLength, 0);
  assertEqual(manager.redoLength, 0);
});

// Summary
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`\n📊 Summary`);
console.log(`  Total: ${results.length}`);
console.log(`  Passed: ${passed} ✓`);
console.log(`  Failed: ${failed} ✗`);
if (failed === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log(`\n⚠️ ${failed} test(s) failed.`);
  process.exit(1);
}
