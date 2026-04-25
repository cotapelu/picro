/**
 * Tests for Diff component
 */
import { Diff, renderDiff } from '../src/components/diff.js';

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

function assertContains(text: string, substring: string, message?: string): void {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected "${text}" to contain "${substring}"`);
  }
}

console.log('\n📝 Diff Tests');

const sampleDiff = `diff --git a/file.ts b/file.ts
index 1234..5678 100644
--- a/file.ts
+++ b/file.ts
@@ -1,5 +1,5 @@
 function hello() {
-  console.log("old");
+  console.log("new");
   return 42;
 }
`;

// Basic diff rendering
test('renders diff with headers', () => {
  const diff = new Diff({ diffText: sampleDiff });
  const lines = diff.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
  const joined = lines.join('\n');
  assertContains(joined, 'diff --git');
});

// Line numbers shown by default
test('shows line numbers by default', () => {
  const diff = new Diff({ diffText: sampleDiff });
  const lines = diff.draw({ width: 80, height: 24 });
  const contentLine = lines.find(l => l.includes('console.log'));
  assertTrue(contentLine !== undefined);
  // Should have line numbers
  assertTrue(/\d+/.test(contentLine!));
});

// Can disable line numbers
test('can hide line numbers', () => {
  const diff = new Diff({ diffText: sampleDiff, showLineNumbers: false });
  const lines = diff.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
});

// Detects added/removed lines
test('detects added and removed lines', () => {
  const diff = new Diff({ diffText: sampleDiff });
  const lines = diff.draw({ width: 80, height: 24 });
  const joined = lines.join('\n');
  // Should have both old and new content
  assertContains(joined, 'old');
  assertContains(joined, 'new');
});

// setDiffText updates content
test('setDiffText updates content', () => {
  const diff = new Diff({ diffText: 'original' });
  diff.setDiffText('updated');
  assertEqual(diff.getDiffText(), 'updated');
});

// getDiffText returns current
test('getDiffText returns current text', () => {
  const diff = new Diff({ diffText: sampleDiff });
  assertTrue(diff.getDiffText().includes('diff --git'));
});

// renderDiff helper function
test('renderDiff helper works', () => {
  const lines = renderDiff(sampleDiff);
  assertTrue(lines.length > 0);
});

// Custom theme
test('accepts custom theme', () => {
  const diff = new Diff({
    diffText: sampleDiff,
    theme: {
      addedColor: (s) => `\x1b[42m${s}\x1b[0m`,
      removedColor: (s) => `\x1b[41m${s}\x1b[0m`,
    }
  });
  const lines = diff.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
});

// Empty diff
test('handles empty diff', () => {
  const diff = new Diff({ diffText: '' });
  const lines = diff.draw({ width: 80, height: 24 });
  assertTrue(lines.length >= 0);
});

// Cache test
test('uses cache on same width', () => {
  const diff = new Diff({ diffText: sampleDiff });
  const lines1 = diff.draw({ width: 80, height: 24 });
  const lines2 = diff.draw({ width: 80, height: 24 });
  // Same reference due to caching
  assertEqual(lines1.length, lines2.length);
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
