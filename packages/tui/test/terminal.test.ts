import { ProcessTerminal } from '../src/terminal.js';
import type { Terminal } from '../src/terminal.js';

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

function assertTrue(value: boolean, message?: string): void {
  if (!value) throw new Error(message || 'Expected true');
}
function assertFalse(value: boolean, message?: string): void {
  if (value) throw new Error(message || 'Expected false');
}
function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`);
}

// Creation
console.log('\n💻 Terminal');
test('can instantiate', () => { const t = new ProcessTerminal(); t.stop(); assertTrue(true); });
test('has columns/rows', () => {
  const t = new ProcessTerminal();
  assertTrue(typeof t.columns === 'number');
  assertTrue(typeof t.rows === 'number');
  assertTrue(t.columns > 0);
  assertTrue(t.rows > 0);
  t.stop();
});
test('kittyProtocolActive is boolean', () => {
  const t = new ProcessTerminal();
  assertTrue(typeof t.kittyProtocolActive === 'boolean');
  t.stop();
});

// Methods
console.log('\n🔧 Methods');
test('start/stop', () => {
  const t = new ProcessTerminal();
  t.start(() => {}, () => {});
  t.stop();
  assertTrue(true);
});
test('write', () => { const t = new ProcessTerminal(); t.write('test'); t.stop(); assertTrue(true); });
test('moveBy', () => { const t = new ProcessTerminal(); t.moveBy(1); t.moveBy(-1); t.moveBy(0); t.stop(); assertTrue(true); });
test('hide/show cursor', () => { const t = new ProcessTerminal(); t.hideCursor(); t.showCursor(); t.stop(); assertTrue(true); });
test('clearLine', () => { const t = new ProcessTerminal(); t.clearLine(); t.stop(); assertTrue(true); });
test('clearFromCursor', () => { const t = new ProcessTerminal(); t.clearFromCursor(); t.stop(); assertTrue(true); });
test('clearScreen', () => { const t = new ProcessTerminal(); t.clearScreen(); t.stop(); assertTrue(true); });
test('setTitle', () => { const t = new ProcessTerminal(); t.setTitle('Test'); t.stop(); assertTrue(true); });

// Interface compliance
console.log('\n📝 Interface');
test('Terminal interface', () => {
  const t: Terminal = new ProcessTerminal();
  assertTrue(typeof t.start === 'function');
  assertTrue(typeof t.stop === 'function');
  assertTrue(typeof t.write === 'function');
  assertTrue(typeof t.moveBy === 'function');
  assertTrue(typeof t.hideCursor === 'function');
  assertTrue(typeof t.showCursor === 'function');
  assertTrue(typeof t.clearLine === 'function');
  assertTrue(typeof t.clearScreen === 'function');
  assertTrue(typeof t.setTitle === 'function');
  assertTrue(typeof t.drainInput === 'function');
  t.stop();
});

// Edge cases
console.log('\n⚠️ Edge Cases');
test('empty write', () => { const t = new ProcessTerminal(); t.write(''); t.stop(); assertTrue(true); });
test('multi-line write', () => { const t = new ProcessTerminal(); t.write('l1\nl2'); t.stop(); assertTrue(true); });
test('ANSI in write', () => { const t = new ProcessTerminal(); t.write('\x1b[31mred\x1b[0m'); t.stop(); assertTrue(true); });
test('multiple cycles', () => {
  const t = new ProcessTerminal();
  for (let i = 0; i < 3; i++) {
    t.start(() => {}, () => {});
    t.stop();
  }
  assertTrue(true);
});

// Async
test('drainInput returns promise', () => {
  const t = new ProcessTerminal();
  const p = t.drainInput(10, 5);
  assertTrue(p instanceof Promise);
  t.stop();
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
