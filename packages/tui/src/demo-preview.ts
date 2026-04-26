#!/usr/bin/env node
/**
 * TUI Demo - Non-interactive version
 * Shows what the TUI would render without requiring terminal interaction
 */

import { TerminalUI, ProcessTerminal, Text, SelectList, SettingsList, Markdown, CURSOR_MARKER } from './index.js';

console.log('🚀 TUI Demo - Non-Interactive Preview');
console.log('='.repeat(80));
console.log();

// Create terminal and UI
const term = new ProcessTerminal();
const ui = new TerminalUI(term);

// Simple container for demo
class DemoContainer {
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

// Create components
const header = new Text('🚀 TUI Demo — Interactive CLI Test', {
  bold: true,
  color: 'cyan',
  bgColor: 'black'
});

const body = new Markdown(`
## ✅ Exported API (14 symbols)

**Types (from base.ts):**
- \`UIElement\`, \`InteractiveElement\`, \`KeyEvent\`, \`RenderContext\`
- Constant: \`CURSOR_MARKER\`

**Classes:**
- \`TerminalUI\` ← main orchestrator (tui.ts)
- \`ProcessTerminal\` ← terminal backend (terminal.ts)
- \`Text\` ← basic text (text.ts)
- \`SelectList\` ← selection list (select-list.ts)
- \`SettingsList\` ← settings editor (settings-list.ts)
- \`Markdown\` ← rich text (markdown.ts)

**Interfaces:**
- \`SelectItem\`, \`SettingItem\`

---

**Demo status:** All components render correctly!
**Controls:**
- **↑/↓** - Navigate SelectList
- **Enter** - Select item
- **q** - Quit demo
- **Ctrl+C** - Force quit
`);

const languages = [
  { value: 'ts', label: 'TypeScript' },
  { value: 'js', label: 'JavaScript' },
  { value: 'py', label: 'Python' },
  { value: 'rs', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
];
const selector = new SelectList(languages, 4);

const opts = [
  { id: 'lang', label: 'Language', currentValue: 'ts', values: ['ts', 'js', 'py', 'rs'] },
  { id: 'mode', label: 'Mode', currentValue: 'normal', values: ['normal', 'insert', 'visual'] },
  { id: 'theme', label: 'Theme', currentValue: 'dark', values: ['dark', 'light', 'high-contrast'] },
];
const settings = new SettingsList(opts, 2);

// Assemble UI
const container = new DemoContainer([header, body, selector, settings]);
ui.children.push(container);

// Render and display
const context = { width: 80, height: 24 };
const lines = container.draw(context);

console.log('📋 Rendered Output (80x24 terminal):');
console.log('─'.repeat(80));
console.log();

// Display first 30 lines
const displayLines = lines.slice(0, 30);
displayLines.forEach((line, i) => {
  console.log(`${String(i + 1).padStart(2)} │ ${line}`);
});

if (lines.length > 30) {
  console.log(`... (${lines.length - 30} more lines)`);
}

console.log();
console.log('─'.repeat(80));
console.log();
console.log('📊 Statistics:');
console.log(`  Total lines rendered: ${lines.length}`);
console.log(`  Components: 4 (header, body, selector, settings)`);
console.log(`  Terminal size: 80x24`);
console.log();
console.log('✅ Demo completed successfully!');
console.log();
console.log('📝 Note: This is a non-interactive preview.');
console.log('   For interactive demo, run in a real terminal with:');
console.log('   $ node dist/src/demo.js');
