/**
 * TUI Test Suite
 */
import { TerminalUI, ElementContainer, CURSOR_MARKER, resolveDimension, isInteractive, isTermuxSession } from '../src/tui.js';
import { ProcessTerminal } from '../src/terminal.js';
import { Text } from '../src/components/text.js';
import type { UIElement, InteractiveElement, RenderContext } from '../src/tui.js';

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
  if (actual !== expected) throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertTrue(value: boolean, message?: string): void {
  if (!value) throw new Error(message || 'Expected true');
}
function assertFalse(value: boolean, message?: string): void {
  if (value) throw new Error(message || 'Expected false');
}
function assertNaN(value: number): void {
  if (!Number.isNaN(value)) throw new Error(`Expected NaN, got ${value}`);
}

// CURSOR_MARKER
console.log('\n🎯 CURSOR_MARKER');
test('is defined', () => { assertTrue(CURSOR_MARKER.startsWith('\x1b_')); assertTrue(CURSOR_MARKER.endsWith('\x07')); });

// resolveDimension
console.log('\n📐 resolveDimension()');
test('numeric', () => assertEqual(resolveDimension(100, 200), 100));
test('percentage', () => assertEqual(resolveDimension('50%', 200), 100));
test('zero percent', () => assertEqual(resolveDimension('0%', 200), 0));
test('undefined', () => assertEqual(resolveDimension(undefined, 200), undefined));
// For invalid percentage, parseFloat returns NaN

// isInteractive
console.log('\n🔍 isInteractive()');
test('null returns false', () => assertFalse(isInteractive(null)));
test('regular element returns false', () => assertFalse(isInteractive({ draw: () => [''], clearCache: () => {} })));
test('interactive returns true', () => { const e = { draw: () => [''], clearCache: () => {}, isFocused: false }; assertTrue(isInteractive(e)); });

// isTermuxSession
console.log('\n📱 isTermuxSession()');
test('false without env', () => { delete process.env.TERMUX_VERSION; assertFalse(isTermuxSession()); });
test('true with env', () => { process.env.TERMUX_VERSION = '1.0'; assertTrue(isTermuxSession()); delete process.env.TERMUX_VERSION; });

// ElementContainer
console.log('\n📦 ElementContainer');
test('can be instantiated', () => assertTrue(new ElementContainer() !== null));
test('has children array', () => { const c = new ElementContainer(); assertTrue(Array.isArray(c.children)); });
test('can append', () => { const c = new ElementContainer(); c.append({ draw: () => [''], clearCache: () => {} }); assertEqual(c.children.length, 1); });
test('can remove', () => { const c = new ElementContainer(); const e = { draw: () => [''], clearCache: () => {} }; c.append(e); c.remove(e); assertEqual(c.children.length, 0); });
test('can clear', () => { const c = new ElementContainer(); c.append({ draw: () => [''], clearCache: () => {} }); c.clear(); assertEqual(c.children.length, 0); });
test('draw returns lines', () => { const c = new ElementContainer(); c.append({ draw: () => ['line1', 'line2'], clearCache: () => {} }); const lines = c.draw({ width: 20, height: 24 }); assertEqual(lines.length, 2); });
test('draw empty for no children', () => assertEqual(new ElementContainer().draw({ width: 20, height: 24 }).length, 0));

// TerminalUI
console.log('\n🖥️ TerminalUI');
test('can be instantiated', () => { const t = new TerminalUI(new ProcessTerminal()); t.stop(); assertTrue(true); });
test('extends ElementContainer', () => { const t = new TerminalUI(new ProcessTerminal()); assertTrue(t instanceof ElementContainer); t.stop(); });
test('key handlers', () => { const t = new TerminalUI(new ProcessTerminal()); const h = () => ({ consume: true }); t.addKeyHandler(h); t.removeKeyHandler(h); t.stop(); assertTrue(true); });
test('set/get focus', () => {
  const t = new TerminalUI(new ProcessTerminal());
  const e: UIElement & InteractiveElement = { draw: () => [''], clearCache: () => {}, isFocused: false };
  t.setFocus(e);
  assertTrue(e.isFocused);
  assertEqual(t.getFocusedElement(), e);
  t.setFocus(null);
  t.stop();
});
test('focus removes previous', () => {
  const t = new TerminalUI(new ProcessTerminal());
  const e1: UIElement & InteractiveElement = { draw: () => ['1'], clearCache: () => {}, isFocused: false };
  const e2: UIElement & InteractiveElement = { draw: () => ['2'], clearCache: () => {}, isFocused: false };
  t.setFocus(e1);
  t.setFocus(e2);
  assertFalse(e1.isFocused);
  assertTrue(e2.isFocused);
  t.stop();
});
test('getSize', () => { const t = new TerminalUI(new ProcessTerminal()); const s = t.getSize(); assertTrue(s.rows > 0 && s.cols > 0); t.stop(); });
test('isActive before start', () => { const t = new TerminalUI(new ProcessTerminal()); assertTrue(t.isActive()); t.stop(); });
test('isActive after stop', () => { const t = new TerminalUI(new ProcessTerminal()); t.stop(); assertFalse(t.isActive()); });
test('hardware cursor', () => { const t = new TerminalUI(new ProcessTerminal()); const init = t.getShowHardwareCursor(); t.setShowHardwareCursor(!init); assertEqual(t.getShowHardwareCursor(), !init); t.stop(); });
test('clearOnShrink', () => { const t = new TerminalUI(new ProcessTerminal()); const init = t.getClearOnShrink(); t.setClearOnShrink(!init); assertEqual(t.getClearOnShrink(), !init); t.stop(); });
test('requestRender', () => { const t = new TerminalUI(new ProcessTerminal()); t.requestRender(); t.requestRender(true); t.stop(); assertTrue(true); });

// Panels
console.log('\n📋 Panels');
test('show/close', () => { const t = new TerminalUI(new ProcessTerminal()); const h = t.showPanel(new Text('Panel', { align: 'left' })); h.close(); t.stop(); assertTrue(true); });
test('hide/show panel', () => { const t = new TerminalUI(new ProcessTerminal()); const h = t.showPanel(new Text('Panel', { align: 'left' })); h.setHidden(true); assertTrue(h.isHidden()); h.setHidden(false); assertFalse(h.isHidden()); h.close(); t.stop(); });
test('panel focus', () => { const t = new TerminalUI(new ProcessTerminal()); const h = t.showPanel(new Text('Panel', { align: 'left' })); h.focus(); assertTrue(h.isFocused()); h.unfocus(); assertFalse(h.isFocused()); h.close(); t.stop(); });

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
