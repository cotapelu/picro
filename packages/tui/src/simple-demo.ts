#!/usr/bin/env node
/**
 * Simple TUI Demo - Test basic functionality without interactive terminal
 */

import { Text, Markdown, visibleWidth, wrapText, truncateText } from './index.js';

console.log('🚀 TUI Simple Demo - Testing Components\n');
console.log('='.repeat(60));

// Test 1: Text component
console.log('\n📝 Test 1: Text Component');
const text = new Text('Hello, World!', { bold: true, color: 'cyan' });
const context = { width: 80, height: 24 };
const textLines = text.draw(context);
console.log('Text lines:', textLines);

// Test 2: Markdown component
console.log('\n📝 Test 2: Markdown Component');
const md = new Markdown(`
# Heading 1

## Heading 2

**Bold text** and *italic text*

- Item 1
- Item 2
- Item 3

\`\`\`typescript
const x = 42;
\`\`\`
`);
const mdLines = md.draw(context);
console.log('Markdown lines count:', mdLines.length);
console.log('First 5 lines:');
mdLines.slice(0, 5).forEach((line, i) => console.log(`  ${i}: ${line.substring(0, 60)}...`));

// Test 3: Utility functions
console.log('\n📝 Test 3: Utility Functions');
console.log('visibleWidth("Hello"):', visibleWidth('Hello'));
console.log('visibleWidth("你好"):', visibleWidth('你好'));
console.log('wrapText("Hello World", 5):', wrapText('Hello World', 5));
console.log('truncateText("Hello World", 8):', truncateText('Hello World', 8));

// Test 4: ANSI codes
console.log('\n📝 Test 4: ANSI Codes');
const coloredText = '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m';
console.log('Colored text:', coloredText);
console.log('visibleWidth with ANSI:', visibleWidth(coloredText));

console.log('\n' + '='.repeat(60));
console.log('✅ All basic tests passed!');
console.log('\nNote: For interactive demo, run: node dist/src/demo.js');
console.log('Press "q" to quit the interactive demo.');
