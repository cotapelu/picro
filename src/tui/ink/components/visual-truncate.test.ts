// SPDX-License-Identifier: Apache-2.0
/**
 * Visual line preview.
 *
 * ToolExecution built a NEW VisualLinePreview inside useMemo([outputText]), so
 * the width cache could never hit (a fresh instance per text change) and the
 * whole output was re-wrapped on every streamed chunk. The intended pattern is a
 * stable instance plus invalidate() when the text changes - invalidate() had no
 * callers anywhere.
 */

import { describe, it, expect } from 'vitest';
import { truncateToVisualLines, VisualLinePreview } from './visual-truncate.js';

function longText(n: number): string {
  return Array.from({ length: n }, (_, i) => `line ${i}`).join('\n');
}

describe('truncateToVisualLines', () => {
  it('keeps the last lines by default and reports the hidden count', () => {
    const result = truncateToVisualLines(longText(20), 5, 80);
    expect(result.visualLines).toHaveLength(5);
    expect(result.visualLines[0]).toContain('line 15');
    expect(result.skippedCount).toBe(15);
  });

  it('keeps the first lines when asked', () => {
    const result = truncateToVisualLines(longText(20), 5, 80, 0, 'start');
    expect(result.visualLines[0]).toContain('line 0');
    expect(result.visualLines[4]).toContain('line 4');
  });

  it('counts wrapped display lines, not source lines', () => {
    const result = truncateToVisualLines('x'.repeat(300), 2, 80);
    expect(result.visualLines).toHaveLength(2);
    expect(result.skippedCount).toBe(2);
  });

  it('returns everything unchanged when it fits', () => {
    const result = truncateToVisualLines('a\nb\nc', 10, 80);
    expect(result.skippedCount).toBe(0);
    expect(result.visualLines).toEqual(['a', 'b', 'c']);
  });

  it('handles empty text', () => {
    expect(truncateToVisualLines('', 5, 80)).toEqual({ visualLines: [], skippedCount: 0 });
  });

  it('applies horizontal padding on both sides', () => {
    const result = truncateToVisualLines('hello', 5, 20, 2);
    expect(result.visualLines[0]!.startsWith('  ')).toBe(true);
    expect(result.visualLines[0]!.endsWith('  ')).toBe(false);
  });

  it('clamps a non-positive content width to one column', () => {
    const result = truncateToVisualLines('ab', 5, 4, 2);
    // width - 2*padding = 0 -> clamped to 1, so each display row holds one char.
    expect(result.visualLines.length).toBeGreaterThan(1);
  });
});

describe('VisualLinePreview', () => {
  const hint = (hidden: number) => `+${hidden} more`;

  it('returns the text when it fits', () => {
    const preview = new VisualLinePreview({ text: 'a\nb\nc', maxVisualLines: 5, keep: 'end', formatHint: hint });
    expect(preview.render(80)).toEqual(['a', 'b', 'c']);
  });

  it('prepends the hint line when lines are hidden (keep end)', () => {
    const preview = new VisualLinePreview({ text: longText(20), maxVisualLines: 5, keep: 'end', formatHint: hint });
    const lines = preview.render(80);
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe('+15 more');
    expect(lines[1]).toContain('line 15');
  });

  it('appends the hint line when keeping the start', () => {
    const preview = new VisualLinePreview({ text: longText(20), maxVisualLines: 5, keep: 'start', formatHint: hint });
    const lines = preview.render(80);
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe('+15 more');
    expect(lines[0]).toContain('line 0');
  });

  it('caches per width: re-rendering at the same width returns the same array', () => {
    const preview = new VisualLinePreview({ text: longText(20), maxVisualLines: 5, keep: 'end', formatHint: hint });
    const first = preview.render(80);
    expect(preview.render(80)).toBe(first);
  });

  it('recomputes when the width changes', () => {
    const preview = new VisualLinePreview({ text: 'x'.repeat(200), maxVisualLines: 5, keep: 'end', formatHint: hint });
    const narrow = preview.render(40);
    const wide = preview.render(120);
    expect(wide).not.toBe(narrow);
    expect(narrow.length).toBeGreaterThan(wide.length);
  });

  it('does not pick up a new text until invalidate() is called', () => {
    const options = { text: 'a', maxVisualLines: 5, keep: 'end' as const, formatHint: hint };
    const preview = new VisualLinePreview(options);
    expect(preview.render(80)).toEqual(['a']);

    options.text = 'a\nb\nc';
    expect(preview.render(80)).toEqual(['a']); // cached

    preview.invalidate();
    expect(preview.render(80)).toEqual(['a', 'b', 'c']);
  });

  it('truncates an over-long hint to the render width', () => {
    const preview = new VisualLinePreview({
      text: longText(20),
      maxVisualLines: 5,
      keep: 'end',
      formatHint: () => 'x'.repeat(200),
    });
    const lines = preview.render(20);
    expect(lines).toHaveLength(6);
    expect(lines[0]!.length).toBeLessThanOrEqual(20);
  });
});
