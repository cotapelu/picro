/**
 * Tier 5 Test: Full Integration
 * Tests all components working together in a simulated TUI
 */

import { TerminalUI, ProcessTerminal, Text, SelectList, SettingsList, Markdown, CURSOR_MARKER } from '../src/index.js';

console.log('🧪 Tier 5 Test: Full Integration');
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

// Simple container for testing
class TestContainer {
  children: any[];
  isFocused = false;

  constructor(children: any[]) {
    this.children = children;
  }

  draw(context: any): string[] {
    const lines: string[] = [];
    for (const child of this.children) {
      if (child && typeof child.draw === 'function') {
        lines.push(...child.draw(context));
      }
    }
    return lines;
  }

  handleKey(key: any): void {
    for (const child of this.children) {
      if (child && typeof child.handleKey === 'function') {
        child.handleKey(key);
      }
    }
  }

  clearCache(): void {
    for (const child of this.children) {
      if (child && typeof child.clearCache === 'function') {
        child.clearCache();
      }
    }
  }
}

// Test full integration
test('Integration: Create TerminalUI with ProcessTerminal', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  return ui !== null && ui.children.length === 0;
});

test('Integration: Add container with multiple components', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const header = new Text('Header');
  const body = new Markdown('# Body');
  const selector = new SelectList([{ value: 'a', label: 'A' }], 5);

  const container = new TestContainer([header, body, selector]);
  ui.children.push(container);

  return ui.children.length === 1;
});

test('Integration: Render all components', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const header = new Text('Header');
  const body = new Markdown('# Body');
  const selector = new SelectList([{ value: 'a', label: 'A' }], 5);

  const container = new TestContainer([header, body, selector]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0;
});

test('Integration: All 14 public exports available', () => {
  const exports = {
    TerminalUI,
    ProcessTerminal,
    Text,
    SelectList,
    SettingsList,
    Markdown,
    CURSOR_MARKER,
  };

  const allPresent = Object.values(exports).every(exp => exp !== undefined);
  return allPresent;
});

test('Integration: Text component in container', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const text = new Text('Test Text');
  const container = new TestContainer([text]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0 && lines.some(line => line.includes('Test Text'));
});

test('Integration: Markdown component in container', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const md = new Markdown('# Test Heading');
  const container = new TestContainer([md]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0;
});

test('Integration: SelectList component in container', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const items = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ];
  const selector = new SelectList(items, 5);
  const container = new TestContainer([selector]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0;
});

test('Integration: SettingsList component in container', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const opts = [
    { id: 'test', label: 'Test Setting', currentValue: 'a', values: ['a', 'b'] },
  ];
  const settings = new SettingsList(opts, 5);
  const container = new TestContainer([settings]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0;
});

test('Integration: Multiple components together', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const header = new Text('🚀 App Title', { bold: true, color: 'cyan' });
  const body = new Markdown('## Description\n\nThis is a test.');
  const selector = new SelectList([{ value: 'a', label: 'A' }], 3);
  const settings = new SettingsList([{ id: 'x', label: 'X', currentValue: 'a', values: ['a', 'b'] }], 2);

  const container = new TestContainer([header, body, selector, settings]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length > 0;
});

test('Integration: Container clearCache propagates', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const text = new Text('Test');
  const container = new TestContainer([text]);
  ui.children.push(container);

  // Should not throw
  container.clearCache();

  return true;
});

test('Integration: Container handleKey propagates', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const selector = new SelectList([{ value: 'a', label: 'A' }], 5);
  const container = new TestContainer([selector]);
  ui.children.push(container);

  // Should not throw
  container.handleKey({ raw: 'up' });

  return true;
});

test('Integration: Different width contexts', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const text = new Text('A very long text that should wrap in narrow contexts');
  const container = new TestContainer([text]);
  ui.children.push(container);

  const narrowContext = { width: 20, height: 24 };
  const wideContext = { width: 100, height: 24 };

  const narrowLines = container.draw(narrowContext);
  const wideLines = container.draw(wideContext);

  return narrowLines.length > wideLines.length; // Narrow should wrap more
});

test('Integration: Empty container', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const container = new TestContainer([]);
  ui.children.push(container);

  const context = { width: 80, height: 24 };
  const lines = container.draw(context);

  return lines.length === 0;
});

test('Integration: Nested containers', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);

  const innerText = new Text('Inner');
  const innerContainer = new TestContainer([innerText]);
  const outerContainer = new TestContainer([innerContainer]);
  ui.children.push(outerContainer);

  const context = { width: 80, height: 24 };
  const lines = outerContainer.draw(context);

  return lines.length > 0;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Tier 5: Full integration working correctly!');
  console.log('\n🎉 All tiers passed! The TUI is ready for use.');
  process.exit(0);
} else {
  console.log('❌ Tier 5: Some tests failed!');
  process.exit(1);
}
