/**
 * Tier 3 Test: Interactive Components
 * Tests SelectList and SettingsList components
 */

import { SelectList, SettingsList } from '../src/index.js';

console.log('🧪 Tier 3 Test: Interactive Components');
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

const context = { width: 80, height: 24 };

// Test SelectList component
test('SelectList: Basic instantiation', () => {
  const items = [{ value: 'a', label: 'A' }];
  const list = new SelectList(items, 5);
  return list !== null && typeof list.draw === 'function';
});

test('SelectList: Render with items', () => {
  const items = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
  ];
  const list = new SelectList(items, 5);
  const lines = list.draw(context);
  return lines.length > 0;
});

test('SelectList: Shows all items', () => {
  const items = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ];
  const list = new SelectList(items, 5);
  const lines = list.draw(context);
  return lines.length >= 3;
});

test('SelectList: Respects visibleRows', () => {
  const items = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
    { value: 'd', label: 'D' },
    { value: 'e', label: 'E' },
  ];
  const list = new SelectList(items, 3); // Only show 3 rows
  const lines = list.draw(context);
  // SelectList shows visibleRows items + 1 scroll info line
  return lines.length === 4;
});

test('SelectList: handleKey method exists', () => {
  const items = [{ value: 'a', label: 'A' }];
  const list = new SelectList(items, 5);
  return typeof list.handleKey === 'function';
});

test('SelectList: clearCache method exists', () => {
  const items = [{ value: 'a', label: 'A' }];
  const list = new SelectList(items, 5);
  return typeof list.clearCache === 'function';
});

test('SelectList: isFocused property', () => {
  const items = [{ value: 'a', label: 'A' }];
  const list = new SelectList(items, 5);
  return typeof list.isFocused === 'boolean';
});

test('SelectList: Empty items', () => {
  const list = new SelectList([], 5);
  const lines = list.draw(context);
  return lines.length >= 0; // Should handle empty gracefully
});

test('SelectList: Items with descriptions', () => {
  const items = [
    { value: 'ts', label: 'TypeScript', description: 'A typed superset of JavaScript' },
  ];
  const list = new SelectList(items, 5);
  const lines = list.draw(context);
  return lines.length > 0;
});

// Test SettingsList component
test('SettingsList: Basic instantiation', () => {
  const opts = [{ id: 'test', label: 'Test', currentValue: 'a', values: ['a', 'b'] }];
  const list = new SettingsList(opts, 5);
  return list !== null && typeof list.draw === 'function';
});

test('SettingsList: Render with settings', () => {
  const opts = [
    { id: 'lang', label: 'Language', currentValue: 'ts', values: ['ts', 'js', 'py'] },
  ];
  const list = new SettingsList(opts, 5);
  const lines = list.draw(context);
  return lines.length > 0;
});

test('SettingsList: Shows all settings', () => {
  const opts = [
    { id: 'a', label: 'A', currentValue: 'a1', values: ['a1', 'a2'] },
    { id: 'b', label: 'B', currentValue: 'b1', values: ['b1', 'b2'] },
  ];
  const list = new SettingsList(opts, 5);
  const lines = list.draw(context);
  return lines.length >= 2;
});

test('SettingsList: Respects visibleRows', () => {
  const opts = [
    { id: 'a', label: 'A', currentValue: 'a1', values: ['a1', 'a2'] },
    { id: 'b', label: 'B', currentValue: 'b1', values: ['b1', 'b2'] },
    { id: 'c', label: 'C', currentValue: 'c1', values: ['c1', 'c2'] },
  ];
  const list = new SettingsList(opts, 2); // Only show 2 rows
  const lines = list.draw(context);
  // SettingsList shows visibleRows settings + 1 scroll info line
  return lines.length === 3;
});

test('SettingsList: handleKey method exists', () => {
  const opts = [{ id: 'test', label: 'Test', currentValue: 'a', values: ['a', 'b'] }];
  const list = new SettingsList(opts, 5);
  return typeof list.handleKey === 'function';
});

test('SettingsList: clearCache method exists', () => {
  const opts = [{ id: 'test', label: 'Test', currentValue: 'a', values: ['a', 'b'] }];
  const list = new SettingsList(opts, 5);
  return typeof list.clearCache === 'function';
});

test('SettingsList: isFocused property', () => {
  const opts = [{ id: 'test', label: 'Test', currentValue: 'a', values: ['a', 'b'] }];
  const list = new SettingsList(opts, 5);
  return typeof list.isFocused === 'boolean';
});

test('SettingsList: Empty settings', () => {
  const list = new SettingsList([], 5);
  const lines = list.draw(context);
  return lines.length >= 0; // Should handle empty gracefully
});

test('SettingsList: Multiple values per setting', () => {
  const opts = [
    { id: 'lang', label: 'Language', currentValue: 'ts', values: ['ts', 'js', 'py', 'rs', 'go'] },
  ];
  const list = new SettingsList(opts, 5);
  const lines = list.draw(context);
  return lines.length > 0;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Tier 3: All interactive components working correctly!');
  process.exit(0);
} else {
  console.log('❌ Tier 3: Some tests failed!');
  process.exit(1);
}
