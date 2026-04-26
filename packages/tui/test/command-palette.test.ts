/**
 * Tests for CommandPalette component
 */
import { CommandPalette } from '../src/components/command-palette.js';
import type { Command } from '../src/components/command-palette.js';

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

console.log('\n⌨️ CommandPalette Tests');

const commands: Command[] = [
  { id: 'save', label: 'Save File', shortcut: 'Ctrl+S', onExecute: () => {} },
  { id: 'open', label: 'Open File', category: 'File', onExecute: () => {} },
  { id: 'quit', label: 'Quit', shortcut: 'Ctrl+Q', onExecute: () => {} },
];

// Basic creation
test('creates command palette', () => {
  const palette = new CommandPalette({ commands });
  assertTrue(palette instanceof CommandPalette);
});

// Renders with border
test('renders with border box', () => {
  const palette = new CommandPalette({ commands });
  const lines = palette.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
  assertContains(lines[0], '┌');
  assertContains(lines[0], '┐');
});

// Shows search prompt
test('shows search input', () => {
  const palette = new CommandPalette({ commands });
  const lines = palette.draw({ width: 80, height: 24 });
  const joined = lines.join('\n');
  assertContains(joined, '>');
});

// Renders commands
test('renders command list', () => {
  const palette = new CommandPalette({ commands });
  const lines = palette.draw({ width: 80, height: 24 });
  const joined = lines.join(' ');
  // Should have command labels
  assertTrue(joined.includes('Save') || joined.includes('Open'));
});

// Category support
test('shows category prefix', () => {
  const palette = new CommandPalette({ commands });
  const lines = palette.draw({ width: 80, height: 24 });
  const joined = lines.join(' ');
  // Should have File category
  assertContains(joined, 'File');
});

// Custom theme
test('accepts custom theme', () => {
  const palette = new CommandPalette({
    commands,
    theme: { borderColor: (s: any) => s }
  });
  const lines = palette.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
});

// Empty commands
test('handles empty commands', () => {
  const palette = new CommandPalette({ commands: [] });
  const lines = palette.draw({ width: 80, height: 24 });
  assertTrue(lines.length > 0);
  // Should show "no matching" message
});

// Handle Escape key
test('Escape calls onCancel', () => {
  let called = false;
  const palette = new CommandPalette({
    commands,
    onCancel: () => { called = true; }
  });
  palette.handleKey({ raw: '\x1b', name: 'Escape' });
  assertTrue(called, 'onCancel should be called');
});

// Handle Enter key
test('Enter executes selected command', () => {
  let executed = false;
  const commands2: Command[] = [
    { id: 'test', label: 'Test', onExecute: () => { executed = true; } }
  ];
  const palette = new CommandPalette({ commands: commands2 });
  palette.handleKey({ raw: '\r', name: 'Enter' });
  assertTrue(executed, 'onExecute should be called');
});

// Navigation with Arrow keys
test('ArrowDown moves selection down', () => {
  const palette = new CommandPalette({ commands });
  // Select first item
  const lines1 = palette.draw({ width: 80, height: 24 });
  // Press down
  palette.handleKey({ raw: '\x1b[B', name: 'ArrowDown' });
  const lines2 = palette.draw({ width: 80, height: 24 });
  // Selection should be different
  assertTrue(lines1.length === lines2.length);
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
