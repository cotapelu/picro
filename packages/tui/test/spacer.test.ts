/**
 * Tests for Spacer component
 */
import { Spacer } from '../src/components/spacer.js';

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

console.log('\n📏 Spacer Tests');

// default 1 line
test('creates spacer with default 1 line', () => {
  const spacer = new Spacer();
  const lines = spacer.draw({ width: 80, height: 24 });
  assertEqual(lines.length, 1);
  assertEqual(lines[0], '');
});

// specified lines
test('creates spacer with specified lines', () => {
  const spacer = new Spacer({ lines: 5 });
  const lines = spacer.draw({ width: 80, height: 24 });
  assertEqual(lines.length, 5);
  lines.forEach(line => {
    assertEqual(line, '');
  });
});

// setLines updates
test('setLines updates line count', () => {
  const spacer = new Spacer({ lines: 3 });
  spacer.setLines(2);
  assertEqual(spacer.getLines(), 2);
});

// zero and negative
test('setLines clamps to zero', () => {
  const spacer = new Spacer({ lines: 5 });
  spacer.setLines(0);
  assertEqual(spacer.getLines(), 0);
  spacer.setLines(-5);
  assertEqual(spacer.getLines(), 0);
});

// clearCache
test('clearCache is safe', () => {
  const spacer = new Spacer();
  spacer.clearCache();
  assertEqual(spacer.getLines(), 1);
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
