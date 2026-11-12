// Regression tests for list rendering: nesting, ordered markers, task lists,
// hanging indentation on wrapped items.
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

function renderMd(md: string, width = 60): string[] {
  const { lastFrame } = render(<MarkdownRenderer content={md} width={width} />);
  return strip(lastFrame()).split('\n');
}

describe('MarkdownRenderer lists', () => {
  it('keeps ordered markers as written', () => {
    expect(renderMd('1. first\n2. second')).toEqual(['1. first', '2. second']);
  });

  it('supports ")" as an ordered separator', () => {
    expect(renderMd('1) alpha')).toEqual(['1) alpha']);
  });

  it('indents nested unordered items and marks each level', () => {
    const lines = renderMd('- a\n  - b\n- c');
    expect(lines).toEqual(['• a', '  ◦ b', '• c']);
  });

  it('numbers nested ordered lists independently', () => {
    const lines = renderMd('1. a\n   1. a1\n   2. a2\n2. b');
    expect(lines).toEqual(['1. a', '  1. a1', '  2. a2', '2. b']);
  });

  it('cycles bullet glyphs for deeper levels', () => {
    const lines = renderMd('- a\n  - b\n    - c\n      - d');
    expect(lines.map((l) => l.trim().slice(0, 1))).toEqual(['•', '◦', '▪', '•']);
  });

  it('renders task list checkboxes after the marker', () => {
    const lines = renderMd('- [ ] todo\n- [x] done');
    expect(lines).toEqual(['• [ ] todo', '• [x] done']);
  });

  it('normalises * and + to the same bullet as -', () => {
    expect(renderMd('* star')).toEqual(['• star']);
    expect(renderMd('+ plus')).toEqual(['• plus']);
  });

  it('wraps long items with a hanging indent', () => {
    const lines = renderMd('- ' + 'word '.repeat(20));
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(1)) {
      expect(line.startsWith('  ')).toBe(true);
    }
  });

  it('renders indented continuation text without a marker', () => {
    const lines = renderMd('- item\n  continued text');
    expect(lines[0]).toBe('• item');
    expect(lines[1]).toBe('  continued text');
  });

  it('keeps lists inside a larger document', () => {
    const lines = renderMd('Intro\n\n1. one\n2. two\n\nOutro');
    expect(lines).toEqual(['Intro', '', '1. one', '2. two', '', 'Outro']);
  });
});
