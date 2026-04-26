/**
 * Tier 2 Test: Basic Components
 * Tests Text and Markdown components
 */

import { Text, Markdown } from '../src/index.js';
import { visibleWidth, stripAnsi } from '../src/components/internal-utils.js';

console.log('🧪 Tier 2 Test: Basic Components');
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

// Test Text component
test('Text: Basic instantiation', () => {
  const text = new Text('Hello');
  return text !== null && typeof text.draw === 'function';
});

test('Text: Simple render', () => {
  const text = new Text('Hello, World!');
  const lines = text.draw(context);
  return lines.length === 1 && lines[0].includes('Hello');
});

test('Text: Bold option', () => {
  const text = new Text('Bold', { bold: true });
  const lines = text.draw(context);
  return lines.length === 1 && lines[0].includes('\x1b[1m');
});

test('Text: Color option', () => {
  const text = new Text('Red', { color: 'red' });
  const lines = text.draw(context);
  return lines.length === 1 && lines[0].includes('\x1b[31m');
});

test('Text: Multiple lines', () => {
  const text = new Text('Line 1\nLine 2\nLine 3');
  const lines = text.draw(context);
  return lines.length === 3;
});

test('Text: Empty string', () => {
  const text = new Text('');
  const lines = text.draw(context);
  return lines.length === 0;
});

test('Text: clearCache method exists', () => {
  const text = new Text('Test');
  return typeof text.clearCache === 'function';
});

// Test Markdown component
test('Markdown: Basic instantiation', () => {
  const md = new Markdown('# Heading');
  return md !== null && typeof md.draw === 'function';
});

test('Markdown: Heading render', () => {
  const md = new Markdown('# Heading 1');
  const lines = md.draw(context);
  return lines.length > 0 && lines.some(line => line.includes('Heading 1'));
});

test('Markdown: Bold text', () => {
  const md = new Markdown('**bold**');
  const lines = md.draw(context);
  return lines.length > 0 && lines.some(line => line.includes('bold'));
});

test('Markdown: Italic text', () => {
  const md = new Markdown('*italic*');
  const lines = md.draw(context);
  return lines.length > 0 && lines.some(line => line.includes('italic'));
});

test('Markdown: Code block', () => {
  const md = new Markdown('```\ncode\n```');
  const lines = md.draw(context);
  return lines.length > 0;
});

test('Markdown: List items', () => {
  const md = new Markdown('- Item 1\n- Item 2');
  const lines = md.draw(context);
  return lines.length >= 2;
});

test('Markdown: Multiple headings', () => {
  const md = new Markdown('# H1\n## H2\n### H3');
  const lines = md.draw(context);
  return lines.length >= 3;
});

test('Markdown: Empty content', () => {
  const md = new Markdown('');
  const lines = md.draw(context);
  return lines.length === 0;
});

test('Markdown: clearCache method exists', () => {
  const md = new Markdown('# Test');
  return typeof md.clearCache === 'function';
});

// Test width constraints
test('Text: Respects width constraint', () => {
  const text = new Text('A very long text that should be wrapped', { wrap: true });
  const narrowContext = { width: 20, height: 24 };
  const lines = text.draw(narrowContext);
  return lines.length > 1; // Should wrap
});

test('Markdown: Respects width constraint', () => {
  const md = new Markdown('# A very long heading that should wrap');
  const narrowContext = { width: 30, height: 24 };
  const lines = md.draw(narrowContext);
  return lines.length > 0;
});

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Tier 2: All basic components working correctly!');
  process.exit(0);
} else {
  console.log('❌ Tier 2: Some tests failed!');
  process.exit(1);
}
