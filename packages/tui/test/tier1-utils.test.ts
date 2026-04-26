/**
 * Tier 1 Test: Utility Functions
 * Tests the most basic utility functions that other components depend on
 */

import { visibleWidth, wrapText, truncateText, stripAnsi, hasAnsi } from '../src/components/internal-utils.js';

console.log('🧪 Tier 1 Test: Utility Functions');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error}`);
    failed++;
  }
}

// Test visibleWidth
test('visibleWidth: ASCII text', () => visibleWidth('Hello') === 5);
test('visibleWidth: Empty string', () => visibleWidth('') === 0);
test('visibleWidth: CJK characters', () => visibleWidth('你好') === 4);
test('visibleWidth: Mixed ASCII and CJK', () => visibleWidth('Hello你好') === 9);
test('visibleWidth: Emoji', () => visibleWidth('🎉') === 2);
test('visibleWidth: ANSI codes ignored', () => visibleWidth('\x1b[31mRed\x1b[0m') === 3);

// Test wrapText
test('wrapText: Basic wrap', () => {
  const lines = wrapText('Hello World', 5);
  return lines.length === 2 && lines[0] === 'Hello' && lines[1] === 'World';
});
test('wrapText: Fits in width', () => {
  const lines = wrapText('Hi', 10);
  return lines.length === 1 && lines[0] === 'Hi';
});
test('wrapText: Empty string', () => {
  const lines = wrapText('', 10);
  return lines.length === 0;
});

// Test truncateText
test('truncateText: Basic truncate', () => {
  const result = truncateText('Hello World', 8);
  return result === 'Hello...';
});
test('truncateText: Fits in width', () => {
  const result = truncateText('Hi', 10);
  return result === 'Hi';
});
test('truncateText: Empty string', () => {
  const result = truncateText('', 10);
  return result === '';
});

// Test stripAnsi
test('stripAnsi: Removes ANSI codes', () => {
  const result = stripAnsi('\x1b[31mRed\x1b[0m');
  return result === 'Red';
});
test('stripAnsi: Plain text unchanged', () => {
  const result = stripAnsi('Hello');
  return result === 'Hello';
});

// Test hasAnsi
test('hasAnsi: Detects ANSI codes', () => {
  return hasAnsi('\x1b[31mRed\x1b[0m') === true;
});
test('hasAnsi: Plain text returns false', () => {
  return hasAnsi('Hello') === false;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Tier 1: All utility functions working correctly!');
  process.exit(0);
} else {
  console.log('❌ Tier 1: Some tests failed!');
  process.exit(1);
}
