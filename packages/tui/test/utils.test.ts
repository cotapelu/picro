import { visibleWidth, wrapText, truncateText, stripAnsi, hasAnsi, getSegmenter, extractAnsiCode } from '../src/components/utils.js';

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

// visibleWidth
console.log('\n📏 visibleWidth()');
test('ASCII', () => assertEqual(visibleWidth('hello'), 5));
test('empty', () => assertEqual(visibleWidth(''), 0));
test('CJK', () => assertEqual(visibleWidth('中文'), 4));
test('mixed', () => assertEqual(visibleWidth('a中b'), 4));
test('emoji', () => assertTrue(visibleWidth('😀') === 2));

// ANSI
console.log('\n🎨 ANSI');
test('hasAnsi detects', () => assertTrue(hasAnsi('\x1b[31m')));
test('hasAnsi plain', () => assertFalse(hasAnsi('plain')));
test('stripAnsi removes codes', () => assertEqual(stripAnsi('\x1b[31mred\x1b[0m'), 'red'));

// wrapText
console.log('\n📦 wrapText()');
test('basic wrap', () => {
  const l = wrapText('hello world test', 10);
  assertTrue(l.length >= 2);
});
test('fits in width', () => {
  const l = wrapText('short', 20);
  assertEqual(l.length, 1);
});

// truncateText
console.log('\n✂️ truncateText()');
test('basic truncate', () => {
  const r = truncateText('hello world', 8);
  assertTrue(r.includes('...'));
});
test('fits', () => assertEqual(truncateText('short', 10), 'short'));

// getSegmenter
console.log('\n🔤 getSegmenter()');
test('returns segmenter', () => assertTrue(getSegmenter() !== null));

// Summary
console.log('\n📊 Summary');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`  Total: ${results.length}, Passed: ${passed} ✓, Failed: ${failed} ✗`);
if (failed > 0) {
  results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
