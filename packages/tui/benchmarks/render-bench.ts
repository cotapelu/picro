#!/usr/bin/env node
/**
 * Performance Benchmarks for @picro/tui
 *
 * Measures render throughput and latency for various components.
 * Run with: npm run bench
 */

import { Text } from '../src/components/text.js';
import { SelectList, type SelectItem } from '../src/components/select-list.js';
import { Editor } from '../src/components/editor.js';
import type { RenderContext } from '../src/components/base.js';

function bench(name: string, fn: () => void, iterations = 1000): void {
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  const totalNs = end - start;
  const avgNs = totalNs / BigInt(iterations);
  const avgMs = Number(avgNs) / 1_000_000;
  console.log(`${name.padEnd(40)} ${iterations} runs => avg: ${avgMs.toFixed(4)} ms, total: ${Number(totalNs) / 1_000_000} ms`);
}

console.log('Running benchmarks...\n');

// Warm up (JIT compilation, etc.)
for (let i = 0; i < 100; i++) {
  const t = new Text('Warmup');
  t.draw({ width: 80, height: 1 });
}

// Benchmark: Simple Text render
bench('Text render (width=80)', () => {
  const text = new Text('Hello, world! This is a test of rendering performance.');
  text.draw({ width: 80, height: 1 } as RenderContext);
});

// Benchmark: Text with styling
bench('Text render with ANSI colors', () => {
  const text = new Text('\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m');
  text.draw({ width: 80, height: 1 } as RenderContext);
});

// Benchmark: SelectList with 50 items
const manyItems: SelectItem[] = Array.from({ length: 50 }, (_, i) => ({
  value: `item-${i}`,
  label: `Option ${i} - some description text`,
}));
bench('SelectList with 50 items', () => {
  const list = new SelectList(manyItems, 10, {});
  list.draw({ width: 60, height: 10 } as RenderContext);
});

// Benchmark: SelectList with filter (simulate typing)
const filtered = manyItems.filter(i => i.label.includes('1'));
bench('SelectList filtered to 5 items', () => {
  const list = new SelectList(filtered, 5, {});
  list.draw({ width: 60, height: 5 } as RenderContext);
});

// Benchmark: Editor with 100 lines of text
const longText = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}: The quick brown fox jumps over the lazy dog.`).join('\n');
bench('Editor render 100 lines', () => {
  const editor = new Editor({ initialValue: longText });
  editor.draw({ width: 80, height: 25 } as RenderContext);
});

// Benchmark: Multiple component composition (simulate a message row)
bench('Composite: Text + Text + Text (simulated message row)', () => {
  const role = new Text('User:', { bold: true });
  const content = new Text('This is a sample user message with some content.');
  const time = new Text('12:34', { color: 'gray' });
  // Simulate drawing three components
  role.draw({ width: 80, height: 1 } as RenderContext);
  content.draw({ width: 80, height: 1 } as RenderContext);
  time.draw({ width: 80, height: 1 } as RenderContext);
});

console.log('\nBenchmarks completed.');
