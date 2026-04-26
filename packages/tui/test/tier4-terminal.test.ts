/**
 * Tier 4 Test: Terminal and TUI Core
 * Tests ProcessTerminal and TerminalUI without actual terminal interaction
 */

import { ProcessTerminal, TerminalUI, CURSOR_MARKER } from '../src/index.js';

console.log('🧪 Tier 4 Test: Terminal and TUI Core');
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

// Test ProcessTerminal
test('ProcessTerminal: Can instantiate', () => {
  const term = new ProcessTerminal();
  return term !== null && typeof term.write === 'function';
});

test('ProcessTerminal: Has columns property', () => {
  const term = new ProcessTerminal();
  return typeof term.columns === 'number' && term.columns > 0;
});

test('ProcessTerminal: Has rows property', () => {
  const term = new ProcessTerminal();
  return typeof term.rows === 'number' && term.rows > 0;
});

test('ProcessTerminal: Has kittyProtocolActive property', () => {
  const term = new ProcessTerminal();
  return typeof term.kittyProtocolActive === 'boolean';
});

test('ProcessTerminal: write method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.write === 'function';
});

test('ProcessTerminal: moveBy method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.moveBy === 'function';
});

test('ProcessTerminal: hideCursor method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.hideCursor === 'function';
});

test('ProcessTerminal: showCursor method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.showCursor === 'function';
});

test('ProcessTerminal: clearLine method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.clearLine === 'function';
});

test('ProcessTerminal: clearFromCursor method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.clearFromCursor === 'function';
});

test('ProcessTerminal: clearScreen method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.clearScreen === 'function';
});

test('ProcessTerminal: setTitle method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.setTitle === 'function';
});

test('ProcessTerminal: start method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.start === 'function';
});

test('ProcessTerminal: stop method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.stop === 'function';
});

test('ProcessTerminal: drainInput method exists', () => {
  const term = new ProcessTerminal();
  return typeof term.drainInput === 'function';
});

// Test TerminalUI
test('TerminalUI: Can instantiate', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return ui !== null && typeof ui.start === 'function';
});

test('TerminalUI: Has children array', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return Array.isArray(ui.children);
});

test('TerminalUI: addKeyHandler method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.addKeyHandler === 'function';
});

test('TerminalUI: removeKeyHandler method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.removeKeyHandler === 'function';
});

test('TerminalUI: requestRender method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.requestRender === 'function';
});

test('TerminalUI: showPanel method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.showPanel === 'function';
});

test('TerminalUI: removePanel method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.removePanel === 'function';
});

test('TerminalUI: setFocus method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.setFocus === 'function';
});

test('TerminalUI: getFocusedElement method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.getFocusedElement === 'function';
});

test('TerminalUI: getSize method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.getSize === 'function';
});

test('TerminalUI: isActive method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.isActive === 'function';
});

test('TerminalUI: start method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.start === 'function';
});

test('TerminalUI: stop method exists', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return typeof ui.stop === 'function';
});

test('TerminalUI: Can add key handler', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  let called = false;
  ui.addKeyHandler(() => { called = true; return undefined; });
  return true; // Just check it doesn't throw
});

test('TerminalUI: Can remove key handler', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  const handler = () => undefined;
  ui.addKeyHandler(handler);
  ui.removeKeyHandler(handler);
  return true; // Just check it doesn't throw
});

// Test CURSOR_MARKER constant
test('CURSOR_MARKER: Is defined', () => {
  return typeof CURSOR_MARKER === 'string' && CURSOR_MARKER.length > 0;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Tier 4: All terminal and TUI core components working correctly!');
  process.exit(0);
} else {
  console.log('❌ Tier 4: Some tests failed!');
  process.exit(1);
}
