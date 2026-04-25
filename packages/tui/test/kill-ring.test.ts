/**
 * Tests for KillRing module
 */
import { KillRing, defaultKillRing } from '../src/kill-ring.js';

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

function assertUndefined(actual: unknown, message?: string): void {
  if (actual !== undefined) throw new Error(message || `Expected undefined, got ${actual}`);
}

console.log('\n🔄 KillRing Tests');
let killRing: KillRing;

// push adds entry to ring
test('push adds entry to ring', () => {
  killRing = new KillRing();
  killRing.push('test', { prepend: false });
  assertEqual(killRing.peek(), 'test');
  assertEqual(killRing.length, 1);
});

// push with accumulate merges consecutive kills
test('push with accumulate merges consecutive kills', () => {
  killRing = new KillRing();
  killRing.push('hello', { prepend: false });
  killRing.push(' world', { prepend: false, accumulate: true });
  assertEqual(killRing.peek(), 'hello world');
  assertEqual(killRing.length, 1);
});

// push with prepend accumulates correctly
test('push with prepend accumulates correctly', () => {
  killRing = new KillRing();
  killRing.push('world', { prepend: false });
  killRing.push('hello ', { prepend: true, accumulate: true });
  assertEqual(killRing.peek(), 'hello world');
});

// peek returns most recent entry
test('peek returns most recent entry', () => {
  killRing = new KillRing();
  killRing.push('first', { prepend: false });
  killRing.push('second', { prepend: false });
  assertEqual(killRing.peek(), 'second');
});

// peekAt returns entries by index
test('peekAt returns entries by index', () => {
  killRing = new KillRing();
  killRing.push('first', { prepend: false });
  killRing.push('second', { prepend: false });
  assertEqual(killRing.peekAt(0), 'second');
  assertEqual(killRing.peekAt(1), 'first');
  assertUndefined(killRing.peekAt(2));
});

// rotate cycles entries
test('rotate cycles entries', () => {
  killRing = new KillRing();
  killRing.push('first', { prepend: false });
  killRing.push('second', { prepend: false });
  killRing.rotate();
  assertEqual(killRing.peek(), 'first');
  killRing.rotate();
  assertEqual(killRing.peek(), 'second');
});

// clear empties the ring
test('clear empties the ring', () => {
  killRing = new KillRing();
  killRing.push('test', { prepend: false });
  killRing.clear();
  assertTrue(killRing.isEmpty());
  assertEqual(killRing.length, 0);
});

// isEmpty returns correct state
test('isEmpty returns correct state', () => {
  killRing = new KillRing();
  assertTrue(killRing.isEmpty());
  killRing.push('test', { prepend: false });
  assertFalse(killRing.isEmpty());
});

function assertFalse(value: boolean, message?: string): void {
  if (value) throw new Error(message || 'Expected false');
}

// getEntries returns entries newest first
test('getEntries returns entries newest first', () => {
  killRing = new KillRing();
  killRing.push('first', { prepend: false });
  killRing.push('second', { prepend: false });
  const entries = killRing.getEntries();
  assertEqual(entries.length, 2);
  assertEqual(entries[0], 'second');
  assertEqual(entries[1], 'first');
});

// peek returns undefined for empty ring
test('peek returns undefined for empty ring', () => {
  killRing = new KillRing();
  assertUndefined(killRing.peek());
});

// defaultKillRing is a shared instance
test('defaultKillRing is a shared instance', () => {
  defaultKillRing.clear();
  defaultKillRing.push('shared', { prepend: false });
  assertEqual(defaultKillRing.peek(), 'shared');
  defaultKillRing.clear();
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
