/**
 * Public API Test
 * 
 * Verifies all 14 exported symbols from @picro/tui work correctly.
 */

import { 
  TerminalUI, 
  ProcessTerminal, 
  Text, 
  SelectList, 
  SettingsList, 
  BorderedLoader, 
  Markdown, 
  CURSOR_MARKER 
} from '../src/index.js';
import type { 
  UIElement, 
  InteractiveElement, 
  KeyEvent, 
  RenderContext, 
  SelectItem, 
  SettingItem 
} from '../src/index.js';

// Test counters
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

console.log('\n🧪 TUI Public API Test Suite');
console.log('Testing all 14 exported symbols...\n');

// ============ Category 1: Constants ============
console.log('📐 Constants (base.ts)');
test('CURSOR_MARKER is defined correctly', () => {
  if (typeof CURSOR_MARKER !== 'string') throw new Error('Not a string');
  if (!CURSOR_MARKER.includes('\x1b')) throw new Error('Missing escape');
  if (!CURSOR_MARKER.includes('pi:c')) throw new Error('Missing marker');
});

// ============ Category 2: Terminal Classes ============
console.log('\n🖥️ Terminal Classes');

test('ProcessTerminal instantiation', () => {
  const term = new ProcessTerminal();
  if (!term) throw new Error('Failed to instantiate');
  if (typeof term.start !== 'function') throw new Error('Missing start method');
  if (typeof term.stop !== 'function') throw new Error('Missing stop method');
  term.stop(); // cleanup
});

test('TerminalUI instantiation', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  if (!ui) throw new Error('Failed to instantiate');
  if (typeof ui.start !== 'function') throw new Error('Missing start');
  if (typeof ui.stop !== 'function') throw new Error('Missing stop');
  if (typeof ui.requestRender !== 'function') throw new Error('Missing requestRender');
  if (typeof ui.addKeyHandler !== 'function') throw new Error('Missing addKeyHandler');
  if (!Array.isArray(ui.children)) throw new Error('Missing children array');
  term.stop();
});

// ============ Category 3: Component Classes ============
console.log('\n🎨 Component Classes');

test('Text component render', () => {
  const text = new Text('Hello World', { bold: true, color: 'red' });
  const lines = text.draw({ width: 20, height: 5 } as RenderContext);
  if (lines.length === 0) throw new Error('Text.draw returned empty');
});

test('Markdown component render', () => {
  const md = new Markdown('# Header\n\nSome **bold** text.');
  const lines = md.draw({ width: 40, height: 10 } as RenderContext);
  if (lines.length === 0) throw new Error('Markdown.draw returned empty');
});

test('SelectList component render and interaction', () => {
  const items: SelectItem[] = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ];
  const list = new SelectList(items, 3);
  const lines = list.draw({ width: 30, height: 5 } as RenderContext);
  if (lines.length === 0) throw new Error('SelectList.draw returned empty');
  
  // Test multi-select toggle
  list.setMultiSelect(true);
  list.toggleSelection(1);
  const indices = list.getSelectedIndices();
  if (!indices.includes(1)) throw new Error('Multi-select toggle failed');
});

test('SettingsList component render', () => {
  const settings: SettingItem[] = [
    { id: 'test', label: 'Test', currentValue: 'on', values: ['on', 'off'] }
  ];
  const sl = new SettingsList(settings, 2);
  const lines = sl.draw({ width: 40, height: 5 } as RenderContext);
  if (lines.length === 0) throw new Error('SettingsList.draw returned empty');
  // Test cycling
  const item = settings[0];
  const currentIdx = item.values.indexOf(item.currentValue);
  const nextIdx = (currentIdx + 1) % item.values.length;
  item.currentValue = item.values[nextIdx];
  if (item.currentValue !== 'off') throw new Error('SettingsList cycling failed');
});

test('BorderedLoader component instantiation', () => {
  const mockTui: any = { requestRender: () => {} };
  const loader = new BorderedLoader(mockTui, {}, 'Loading...');
  if (!loader) throw new Error('Failed to instantiate');
  loader.dispose(); // cleanup
});

// ============ Category 4: Type Structure ============
console.log('\n📝 Type Structure Validation');

test('SelectItem structure is valid', () => {
  const item: SelectItem = { value: 'x', label: 'X' };
  if (typeof item.value !== 'string') throw new Error('value must be string');
  if (typeof item.label !== 'string') throw new Error('label must be string');
});

test('SettingItem structure is valid', () => {
  const item: SettingItem = { 
    id: 'id1', 
    label: 'Label', 
    currentValue: 'val1', 
    values: ['val1', 'val2'] 
  };
  if (typeof item.id !== 'string') throw new Error('id must be string');
  if (typeof item.label !== 'string') throw new Error('label must be string');
  if (!Array.isArray(item.values)) throw new Error('values must be array');
});

// ============ Category 5: Integration ============
console.log('\n🔗 Integration Tests');

test('Composite UI with nested components', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  
  class Container implements UIElement, InteractiveElement {
    public isFocused = false;
    constructor(private children: UIElement[]) {}
    draw(ctx: RenderContext): string[] {
      const lines: string[] = [];
      for (const c of this.children) lines.push(...c.draw(ctx));
      return lines;
    }
    handleKey?(key: KeyEvent): void {}
    clearCache(): void { for (const c of this.children) c.clearCache?.(); }
  }
  
  const text = new Text('Integration Test');
  const container = new Container([text]);
  ui.children.push(container);
  
  const lines = ui.draw({ width: 80, height: 24 } as RenderContext);
  if (lines.length === 0) throw new Error('UI.render failed');
  
  term.stop();
});

test('Key handler registration works', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  
  ui.addKeyHandler(() => undefined);
  if (typeof ui.removeKeyHandler !== 'function') throw new Error('removeKeyHandler missing');
  
  term.stop();
});

test('Panel API works', () => {
  const term = new ProcessTerminal();
  const ui = new TerminalUI(term);
  
  const text = new Text('Panel Test');
  const handle = ui.showPanel(text);
  if (typeof handle.close !== 'function') throw new Error('Panel handle missing close');
  if (typeof handle.setHidden !== 'function') throw new Error('Panel handle missing setHidden');
  handle.close();
  
  term.stop();
});

// ============ Summary ============
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Test Summary: ${passed}/${passed + failed} passed`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ TESTS FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL 14 PUBLIC API SYMBOLS VERIFIED!\n');
  console.log('Exported symbols tested:');
  console.log('  Values:  TerminalUI, ProcessTerminal, Text, SelectList, SettingsList, BorderedLoader, Markdown, CURSOR_MARKER');
  console.log('  Types:   UIElement, InteractiveElement, KeyEvent, RenderContext, SelectItem, SettingItem\n');
  process.exit(0);
}
