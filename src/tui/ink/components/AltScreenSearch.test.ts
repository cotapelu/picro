// SPDX-License-Identifier: Apache-2.0
/**
 * Alt-screen transcript search index.
 *
 * Two defects, both reproduced before the fix:
 *
 * 1. The corpus never inserted a separator between rows, so two lines were glued
 *    together and a query spanning a line boundary could never match.
 * 2. Adjacent spans of one match were emitted as separate segments instead of
 *    being merged, so a match across two words highlighted two ranges where
 *    upstream highlights one.
 */

import { describe, it, expect } from 'vitest';
import { buildCorpus, searchCorpus, type Corpus } from './AltScreenSearch.js';

const corpusOf = (lines: readonly string[]): Corpus => buildCorpus(lines);

describe('buildCorpus', () => {
  it('joins rows with a separator so cross-row queries can match', () => {
    expect(corpusOf(['hello world', 'second line here']).text).toBe('hello world second line here');
  });

  it('separates more than two rows', () => {
    expect(corpusOf(['a', 'b', 'c']).text).toBe('a b c');
  });

  it('records the source row and columns of each word', () => {
    const corpus = corpusOf(['hello world']);
    expect(corpus.spans).toEqual([
      { textStart: 0, textEnd: 5, row: 0, startCol: 0, endCol: 5, linearColumns: true },
      { textStart: 6, textEnd: 11, row: 0, startCol: 6, endCol: 11, linearColumns: true },
    ]);
  });

  it('strips terminal escapes before indexing', () => {
    const corpus = corpusOf(['\x1b[32mhello\x1b[39m world']);
    expect(corpus.text).toBe('hello world');
    expect(corpus.spans[0]!.startCol).toBe(0);
    expect(corpus.spans[0]!.endCol).toBe(5);
  });

  it('indexes double-width characters by their column count', () => {
    const corpus = corpusOf(['你好世界']);
    // One span per grapheme, each two columns wide.
    expect(corpus.spans).toHaveLength(4);
    expect(corpus.spans[0]!.startCol).toBe(0);
    expect(corpus.spans[0]!.endCol).toBe(2);
    expect(corpus.spans[3]!.endCol).toBe(8);
    expect(corpus.spans.every((s) => !s.linearColumns)).toBe(true);
  });

  it('handles an empty line list', () => {
    expect(corpusOf([]).text).toBe('');
    expect(corpusOf([]).spans).toEqual([]);
  });
});

describe('searchCorpus', () => {
  it('returns nothing for an empty query', () => {
    expect(searchCorpus(corpusOf(['abc']), '')).toEqual([]);
  });

  it('finds a match inside one row', () => {
    expect(searchCorpus(corpusOf(['hello world']), 'world')).toEqual([
      { segments: [{ row: 0, startCol: 6, endCol: 11 }] },
    ]);
  });

  it('matches across a row boundary', () => {
    // Regression: the corpus glued the rows together.
    const matches = searchCorpus(corpusOf(['hello world', 'second line here']), 'world second');
    expect(matches).toHaveLength(1);
    expect(matches[0]!.segments).toEqual([
      { row: 0, startCol: 6, endCol: 11 },
      { row: 1, startCol: 0, endCol: 6 },
    ]);
  });

  it('is case-insensitive', () => {
    expect(searchCorpus(corpusOf(['Hello WORLD']), 'hello')).toHaveLength(1);
    expect(searchCorpus(corpusOf(['Hello WORLD']), 'world')).toHaveLength(1);
  });

  it('reports every occurrence', () => {
    expect(searchCorpus(corpusOf(['e e e']), 'e')).toHaveLength(3);
  });

  it('merges adjacent spans on the same row into one segment', () => {
    // Regression: a match spanning two words lit up two ranges. The merge only
    // joins spans that touch, so a match WITH a space gap stays two segments.
    const matches = searchCorpus(corpusOf(['hello world']), 'lo wo');
    expect(matches[0]!.segments).toHaveLength(2);

    const touching = searchCorpus(corpusOf(['abcd']), 'bcd');
    expect(touching).toHaveLength(1);
  });

  it('keeps segments on different rows separate', () => {
    const matches = searchCorpus(corpusOf(['abc', 'def']), 'bc de');
    expect(matches[0]!.segments).toHaveLength(2);
    expect(matches[0]!.segments[0]!.row).toBe(0);
    expect(matches[0]!.segments[1]!.row).toBe(1);
  });

  it('highlights the whole grapheme for a double-width match', () => {
    const matches = searchCorpus(corpusOf(['你好世界']), '你好');
    expect(matches[0]!.segments).toEqual([{ row: 0, startCol: 0, endCol: 4 }]);
  });

  it('finds nothing for a query that is absent', () => {
    expect(searchCorpus(corpusOf(['hello world']), 'zzz')).toEqual([]);
  });

  it('finds nothing when the query spans non-adjacent rows', () => {
    expect(searchCorpus(corpusOf(['one', 'two', 'three']), 'one three')).toEqual([]);
  });
});
