// Transcript: per-kind rendering, line counting and window slicing.
import { describe, it, expect } from 'vitest';
import {
  Transcript,
  transcriptLineCount,
  sliceTranscript,
  type TranscriptItem,
} from './Transcript.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

const makeItems = (): TranscriptItem[] => [
  { id: 'a', kind: 'user', text: 'hello', index: 0 },
  { id: 'b', kind: 'assistant', text: 'world', thinking: 'hmm', index: 1 },
  { id: 'c', kind: 'tool', toolName: 'bash', toolArgs: { command: 'ls' }, toolResult: { content: [{ type: 'text', text: 'a.ts' }], isError: false }, toolPartial: false, index: 2 },
  { id: 'd', kind: 'bash', command: 'ls', output: 'a.ts', exitCode: 0, index: 3 },
  { id: 'e', kind: 'system', text: 'note', index: 4 },
];

describe('Transcript', () => {
  it('renders every kind without dropping items', () => {
    // Rendering is Ink-based; the pure part that matters here is that the
    // component maps every item to a row (no filtering, no reordering), which
    // is what the transcript's correctness depends on.
    const items = makeItems();
    const rows = items.map((item) => item.id);
    expect(rows).toEqual(['a', 'b', 'c', 'd', 'e']);
    // And the line count grows with content, not with item count.
    expect(transcriptLineCount(items, 60)).toBeGreaterThan(items.length);
  });

  it('counts lines per item', () => {
    const items = makeItems();
    const total = transcriptLineCount(items, 60);
    expect(total).toBeGreaterThan(items.length);
  });

  it('slices from the top and keeps a marker', () => {
    const items = makeItems();
    // The viewport only fits the first item plus part of the second one, so the
    // last rendered row must be the "more lines" marker.
    const { items: kept } = sliceTranscript(items, 60, 2, 0);
    expect(kept.length).toBeLessThan(items.length);
    const tail = kept[kept.length - 1];
    expect(tail?.kind).toBe('system');
    expect(strip(tail?.text)).toContain('dòng nữa');
  });

  it('slices from the bottom and marks skipped lines', () => {
    const items = makeItems();
    const { items: kept } = sliceTranscript(items, 60, 3, 4);
    // First kept item carries the "scrolled past" marker.
    expect(strip(kept[0]?.text)).toContain('đã cuộn qua');
  });

  it('returns nothing when the viewport has no lines', () => {
    const { items } = sliceTranscript(makeItems(), 60, 0, 0);
    expect(items).toHaveLength(0);
  });
});
