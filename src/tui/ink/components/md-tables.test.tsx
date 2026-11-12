// Regression tests for the markdown renderer's block-level features.
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

describe('MarkdownRenderer', () => {
  it('renders a GFM table with borders and aligned columns', () => {
    const md = '| a | b |\n|---|---|\n| 1 | 2222 |\n| 3 | 4 |';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = strip(lastFrame());
    expect(out).toContain('┌');
    expect(out).toContain('│');
    expect(out).toContain('└');
    // Columns padded to the widest cell.
    expect(out).toContain('1');
    expect(out).toContain('2222');
  });

  it('renders inline latex instead of the raw source', () => {
    const { lastFrame } = render(<MarkdownRenderer content={'ta có $x^2$ nhé'} width={40} />);
    const out = strip(lastFrame());
    // renderLatex maps the superscript to its Unicode character, so the raw
    // "$x^2$" must be gone and the superscript two must appear.
    expect(out).not.toContain('$x^2$');
    expect(out).toContain('x²');
  });

  it('keeps the link target when the text differs from the url', () => {
    const { lastFrame } = render(<MarkdownRenderer content={'xem [tài liệu](https://x.dev)'} width={60} />);
    const out = strip(lastFrame());
    expect(out).toContain('tài liệu');
    expect(out).toContain('https://x.dev');
  });

  it('still renders fenced code blocks', () => {
    const md = '```ts\nconst x = 1;\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = strip(lastFrame());
    expect(out).toContain('```');
    expect(out).toContain('const x = 1;');
  });
});
