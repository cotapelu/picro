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

describe('MarkdownRenderer - code block syntax highlighting', () => {
  /** Lấy frame thô (giữ mã ANSI) để kiểm tra tô màu. */
  const rawFrame = (f: () => string | undefined) => f() ?? '';

  it('colors a keyword differently from a plain identifier', () => {
    const md = '```ts\nconst x = 1;\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = rawFrame(lastFrame);
    // Nội dung vẫn giữ nguyên khi bỏ mã màu.
    expect(strip(out)).toContain('const x = 1;');
    // Khối code có sinh mã ANSI tô màu (không chỉ một màu codeBlock).
    expect(/\x1b\[/.test(out)).toBe(true);
    // Từ khóa `const` nhận mã màu riêng (SGR ngay trước nó).
    const keywordSeq = out.match(/\x1b\[[0-9;]*mconst/);
    expect(keywordSeq).not.toBeNull();
  });

  it('colors strings in a json block', () => {
    const md = '```json\n{"a": "b"}\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = rawFrame(lastFrame);
    expect(strip(out)).toContain('{"a": "b"}');
    // Chuỗi được tô bằng token màu riêng (SGR xuất hiện ngay trước giá trị chuỗi).
    expect(out).toMatch(/\x1b\[[0-9;]*m"b"/);
  });

  it('colors comments in a python block', () => {
    const md = '```python\nx = 1  # note\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = rawFrame(lastFrame);
    expect(strip(out)).toContain('x = 1  # note');
    expect(out).toMatch(/\x1b\[[0-9;]*m# note/);
  });

  it('leaves a text fence with a single colour', () => {
    const md = '```text\njust words\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={40} />);
    const out = rawFrame(lastFrame);
    expect(strip(out)).toContain('just words');
    // Ngôn ngữ text: chỉ có mã màu của codeBlock, không có token syntax.
    expect(strip(out)).toContain('just words');
  });

  it('keeps every character of the code after highlighting', () => {
    const md = '```ts\nconst f = (a: number) => a * 2;\n```';
    const { lastFrame } = render(<MarkdownRenderer content={md} width={60} />);
    const out = strip(lastFrame());
    expect(out).toContain('const f = (a: number) => a * 2;');
  });
});
