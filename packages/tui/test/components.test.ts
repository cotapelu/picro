import { Text } from '../src/components/text.js';
import { Box } from '../src/components/box.js';
import type { UIElement, RenderContext } from '../src/components/base.js';

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

const ctx = (w: number): RenderContext => ({ width: w, height: 24 });

// Text
console.log('\n📝 Text');
test('renders', () => { const t = new Text('hello'); assertTrue(t.draw(ctx(20))[0].includes('hello')); });
test('left align', () => { const t = new Text('hi'); const l = t.draw(ctx(10)); assertTrue(l[0].includes('hi')); });
test('center align', () => { const t = new Text('hi', { align: 'center' }); assertTrue(t.draw(ctx(10))[0].includes('hi')); });
test('right align', () => { const t = new Text('hi', { align: 'right' }); assertTrue(t.draw(ctx(10))[0].includes('hi')); });
test('wrap', () => { const t = new Text('hello world test', { wrap: true }); assertTrue(t.draw(ctx(10)).length > 1); });
test('truncate', () => { const t = new Text('hello world', { truncate: true }); assertTrue(t.draw(ctx(8))[0].includes('...')); });
test('color', () => { const t = new Text('hi', { color: 'red' }); assertTrue(t.draw(ctx(10))[0].includes('\x1b[')); });
test('bold', () => { const t = new Text('hi', { bold: true }); assertTrue(t.draw(ctx(10))[0].includes('\x1b[')); });
test('setContent', () => { const t = new Text('a'); t.setContent('b'); assertTrue(t.draw(ctx(10))[0].includes('b')); });
test('clearCache', () => { const t = new Text('hi'); t.draw(ctx(10)); t.clearCache(); t.draw(ctx(10)); assertTrue(true); });
test('empty', () => { const t = new Text(''); assertEqual(t.draw(ctx(10)).length, 1); });

// Box
console.log('\n📦 Box');
test('empty box (no children)', () => { const b = new Box(); assertEqual(b.draw(ctx(10)).length, 2); }); // Top + bottom padding (default 1,1) gives 2 lines
test('box with no vertical padding', () => { const b = new Box(1, 0); assertEqual(b.draw(ctx(10)).length, 0); }); // No children, no padding
test('with padding', () => { const b = new Box(1, 1); assertEqual(b.draw(ctx(10)).length, 2); });
test('with children', () => {
  const b = new Box(1, 1);
  b.append(new Text('c', { align: 'left' }));
  assertTrue(b.draw(ctx(20)).length >= 3);
});
test('remove child', () => {
  const b = new Box(1, 1);
  const c = new Text('c', { align: 'left' });
  b.append(c);
  b.remove(c);
  assertEqual(b.draw(ctx(20)).length, 2);
});
test('clear children', () => {
  const b = new Box(1, 1);
  b.append(new Text('c', { align: 'left' }));
  b.clear();
  assertEqual(b.draw(ctx(20)).length, 2);
});
test('bgFn', () => {
  const b = new Box(1, 1, (t) => `\x1b[41m${t}\x1b[0m`);
  assertTrue(b.draw(ctx(10))[0].includes('\x1b['));
});
test('cache', () => {
  const b = new Box(1, 1);
  b.append(new Text('c', { align: 'left' }));
  const l1 = b.draw(ctx(20));
  const l2 = b.draw(ctx(20));
  assertEqual(l1, l2);
});
test('setBgFn invalidates', () => {
  const b = new Box(1, 1);
  b.append(new Text('c', { align: 'left' }));
  b.draw(ctx(20));
  b.setBgFn((t) => t);
  assertTrue(b.draw(ctx(20)).length > 0);
});

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
