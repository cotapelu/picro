// SPDX-License-Identifier: Apache-2.0
// @vitest-environment node

import { describe, it, expect } from 'vitest';
import {
  isEnabled,
  toggle,
  enableAll,
  clearAll,
  move,
  getSortedIds,
  type EnabledIds,
} from './scoped-models-utils.js';

describe('isEnabled', () => {
  it('returns true for all enabled (null) regardless of id', () => {
    expect(isEnabled(null, 'any')).toBe(true);
  });

  it('returns true if id is in enabled list', () => {
    expect(isEnabled(['a', 'b'], 'a')).toBe(true);
    expect(isEnabled(['a', 'b'], 'b')).toBe(true);
  });

  it('returns false if id not in enabled list', () => {
    expect(isEnabled(['a', 'b'], 'c')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isEnabled([], 'a')).toBe(false);
  });
});

describe('toggle', () => {
  it('adds id when starting from null (all enabled) to create explicit whitelist', () => {
    expect(toggle(null, 'a')).toEqual(['a']);
    expect(toggle(null, 'b')).toEqual(['b']);
  });

  it('adds id when not present in explicit list', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('removes id when present in explicit list', () => {
    expect(toggle(['a'], 'a')).toEqual([]);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggle(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('preserves order when adding', () => {
    expect(toggle(['a', 'c'], 'b')).toEqual(['a', 'c', 'b']);
  });

  it('handles empty array', () => {
    expect(toggle([], 'a')).toEqual(['a']);
  });
});

describe('enableAll', () => {
  const allIds = ['a', 'b', 'c'];

  it('returns null when already all enabled (null input)', () => {
    expect(enableAll(null, allIds)).toBeNull();
  });

  it('adds missing IDs and returns null when all become enabled', () => {
    // Adding missing to a subset results in full set -> null
    expect(enableAll(['a'], allIds)).toBeNull(); // adds b,c -> all
    expect(enableAll(['a', 'c'], allIds)).toBeNull(); // adds b -> all
  });

  it('returns explicit array when not all enabled after operation', () => {
    // Target only adds some, not reaching full
    expect(enableAll(['a'], allIds, ['a', 'b'])).toEqual(['a', 'b']);
    expect(enableAll([], allIds, ['a', 'c'])).toEqual(['a', 'c']);
  });

  it('respects targetIds to only add specific ones', () => {
    expect(enableAll(['a'], allIds, ['b'])).toEqual(['a', 'b']);
    expect(enableAll([], allIds, ['a', 'c'])).toEqual(['a', 'c']);
  });

  it('handles empty enabled list with targetIds', () => {
    expect(enableAll([], allIds, ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('does not add duplicates', () => {
    // ['a','b'] plus targetIds ['a','c'] results in ['a','b','c'] -> all -> null
    expect(enableAll(['a', 'b'], allIds, ['a', 'c'])).toBeNull();
  });

  it('preserves existing order and appends new IDs', () => {
    // allIds = ['a','b','c','d']; need larger set to test ordering without full coverage
    const all = ['a', 'b', 'c', 'd'];
    expect(enableAll(['c', 'a'], all, ['b'])).toEqual(['c', 'a', 'b']);
  });

  it('returns null when result exactly matches allIds', () => {
    expect(enableAll(['a', 'b', 'c'], allIds)).toBeNull();
  });
});

describe('clearAll', () => {
  const allIds = ['a', 'b', 'c'];

  it('returns empty array when starting from all enabled (null) with no target', () => {
    expect(clearAll(null, allIds)).toEqual([]);
  });

  it('clears specified target IDs from null (all enabled)', () => {
    expect(clearAll(null, allIds, ['a', 'c'])).toEqual(['b']);
  });

  it('removes target IDs from explicit list', () => {
    expect(clearAll(['a', 'b', 'c'], allIds, ['a'])).toEqual(['b', 'c']);
    expect(clearAll(['a', 'b', 'c'], allIds, ['a', 'c'])).toEqual(['b']);
  });

  it('returns unchanged if no target overlap', () => {
    expect(clearAll(['a', 'b'], allIds, ['c'])).toEqual(['a', 'b']);
  });

  it('handles empty enabled list', () => {
    expect(clearAll([], allIds)).toEqual([]);
  });

  it('clears all IDs when no target specified', () => {
    expect(clearAll(['a', 'b'], allIds)).toEqual([]);
  });

  it('preserves order of remaining IDs', () => {
    expect(clearAll(['c', 'a', 'b'], allIds, ['b'])).toEqual(['c', 'a']);
  });

  it('can return null if all removed? Actually clearAll returns empty array [] when all removed, not null', () => {
    expect(clearAll(['a', 'b', 'c'], allIds, ['a', 'b', 'c'])).toEqual([]);
  });
});

describe('move', () => {
  it('moves item down by one position', () => {
    expect(move(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(move(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c']);
  });

  it('moves item up by one position', () => {
    expect(move(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(move(['a', 'b', 'c'], 'c', -1)).toEqual(['a', 'c', 'b']);
  });

  it('does not move if delta would go out of bounds', () => {
    expect(move(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(move(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
  });

  it('returns unchanged list if id not found', () => {
    expect(move(['a', 'b'], 'c', 1)).toEqual(['a', 'b']);
  });

  it('returns null when enabledIds is null (all enabled)', () => {
    expect(move(null, 'a', 1)).toBeNull();
  });

  it('handles single-item list', () => {
    expect(move(['a'], 'a', 1)).toEqual(['a']);
    expect(move(['a'], 'a', -1)).toEqual(['a']);
  });

  it('moves item by larger delta directly to target index', () => {
    // Move 'b' from index1 to index3 in ['a','b','c','d']
    expect(move(['a', 'b', 'c', 'd'], 'b', 2)).toEqual(['a', 'c', 'd', 'b']);
    // Move 'c' from index2 to index0
    expect(move(['a', 'b', 'c', 'd'], 'c', -2)).toEqual(['c', 'a', 'b', 'd']);
  });
});

describe('getSortedIds', () => {
  const allIds = ['a', 'b', 'c', 'd'];

  it('returns allIds in original order when null (all enabled)', () => {
    expect(getSortedIds(null, allIds)).toEqual(allIds);
  });

  it('returns enabled IDs first (preserving order), then the rest', () => {
    expect(getSortedIds(['c', 'a'], allIds)).toEqual(['c', 'a', 'b', 'd']);
    expect(getSortedIds(['b', 'd'], allIds)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('returns exactly allIds when all are enabled explicitly', () => {
    expect(getSortedIds(['a', 'b', 'c', 'd'], allIds)).toEqual(allIds);
  });

  it('handles empty enabled array', () => {
    expect(getSortedIds([], allIds)).toEqual(allIds);
  });

  it('handles enabled IDs not a subset (extra IDs appear first and are not duplicated)', () => {
    expect(getSortedIds(['x', 'a'], allIds)).toEqual(['x', 'a', 'b', 'c', 'd']);
  });

  it('maintains relative order of rest as in allIds', () => {
    expect(getSortedIds(['d', 'b'], allIds)).toEqual(['d', 'b', 'a', 'c']);
  });
});
