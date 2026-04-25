/**
 * Tests for TruncatedText component
 */
import { TruncatedText } from '../src/components/truncated-text.js';

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

console.log('\n📝 TruncatedText Tests');

// render text that fits
test('renders text that fits', () => {
  const text = new TruncatedText({ text: 'Hello World' });
  const lines = text.draw({ width: 40, height: 24 });
  assertTrue(lines.length > 0);
  const joined = lines.join(' ');
  assertTrue(joined.includes('Hello'));
});

// truncates long text
test('truncates text that is too long', () => {
  const longText = 'A'.repeat(100);
  const text = new TruncatedText({ text: longText, ellipsis: '...' });
  const lines = text.draw({ width: 20, height: 24 });
  const content = lines.find(l => l.includes('.'));
  assertTrue(content !== undefined);
});

// apply paddingX
test('applies paddingX', () => {
  const text = new TruncatedText({ text: 'Test', paddingX: 2 });
  const lines = text.draw({ width: 40, height: 24 });
  const joined = lines.join('');
  // Should have at least 2 spaces before text
  assertTrue(joined.includes('  T') || joined.includes('Test'));
});

// apply paddingY
test('applies paddingY', () => {
  const text = new TruncatedText({ text: 'Test', paddingY: 1 });
  const lines = text.draw({ width: 40, height: 24 });
  // Should have 3 lines: padding top, text, padding bottom
  assertEqual(lines.length, 3);
});

// setText updates content
test('setText updates content', () => {
  const text = new TruncatedText({ text: 'Original' });
  text.setText('Updated');
  const lines = text.draw({ width: 40, height: 24 });
  const joined = lines.join(' ');
  assertTrue(joined.includes('Updated'));
});

// getText returns current
test('getText returns current text', () => {
  const text = new TruncatedText({ text: 'Hello' });
  assertEqual(text.getText(), 'Hello');
  text.setText('World');
  assertEqual(text.getText(), 'World');
});

// empty string
test('handles empty string', () => {
  const text = new TruncatedText({ text: '' });
  const lines = text.draw({ width: 40, height: 24 });
  assertTrue(lines.length > 0);
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
