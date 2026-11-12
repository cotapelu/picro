// SPDX-License-Identifier: Apache-2.0
/**
 * ConfigSelector query filtering.
 *
 * The inline version tracked matching groups/subgroups by display LABEL. Labels
 * are not unique, so two groups sharing a label leaked each other's results: a
 * header with no matching item stayed visible, and a matching group's header
 * could be dropped in favour of the other's. Matching is now tracked by object
 * identity.
 */

import { describe, it, expect } from 'vitest';
import { itemMatchesQuery, filterConfigEntries } from './config-filter.js';
import type { FlatEntry, ResourceGroup, ResourceItem } from './ConfigSelector.js';

function item(path: string, displayName: string, resourceType: ResourceItem['resourceType'] = 'extensions'): ResourceItem {
  return { path, displayName, resourceType, enabled: true, source: 'local', scope: 'user', origin: 'top-level' };
}

function group(label: string, items: ResourceItem[]): ResourceGroup {
  return {
    label,
    scope: 'user',
    origin: 'top-level',
    source: 'local',
    subgroups: [{ type: items[0]!.resourceType, label: `${label}-sub`, items }],
  };
}

function flatten(groups: ResourceGroup[]): FlatEntry[] {
  const entries: FlatEntry[] = [];
  for (const g of groups) {
    entries.push({ type: 'group', group: g });
    for (const sg of g.subgroups) {
      entries.push({ type: 'subgroup', subgroup: sg, group: g });
      for (const it of sg.items) entries.push({ type: 'item', item: it });
    }
  }
  return entries;
}

const g1 = group('Resources', [item('/p/alpha.ts', 'alpha-ext')]);
const g2 = group('Resources', [item('/p/beta.ts', 'beta-ext')]);
const groups = [g1, g2];
const flat = flatten(groups);

describe('itemMatchesQuery', () => {
  const probe = item('/x/y/alpha.ts', 'alpha-ext', 'skills');

  it('matches on display name, resource type and path', () => {
    expect(itemMatchesQuery(probe, 'alpha')).toBe(true);
    expect(itemMatchesQuery(probe, 'skill')).toBe(true);
    expect(itemMatchesQuery(probe, 'y/alpha')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(itemMatchesQuery(probe, 'ALPHA')).toBe(true);
    expect(itemMatchesQuery(probe, 'SKILL')).toBe(true);
  });

  it('matches everything for an empty query', () => {
    expect(itemMatchesQuery(probe, '')).toBe(true);
  });

  it('a whitespace-only query matches nothing (the caller trims first)', () => {
    // filterConfigEntries trims and short-circuits, so this only documents the
    // raw helper's behaviour for a blank-but-present query.
    expect(itemMatchesQuery(probe, '   ')).toBe(false);
  });

  it('does not match unrelated text', () => {
    expect(itemMatchesQuery(probe, 'zzz')).toBe(false);
  });
});

describe('filterConfigEntries', () => {
  it('returns the full list for an empty query', () => {
    expect(filterConfigEntries(flat, groups, '')).toBe(flat);
    expect(filterConfigEntries(flat, groups, '   ')).toBe(flat);
  });

  it('keeps only the matching item and its headers', () => {
    const result = filterConfigEntries(flat, groups, 'alpha');
    expect(result).toEqual([
      { type: 'group', group: g1 },
      { type: 'subgroup', subgroup: g1.subgroups[0]!, group: g1 },
      { type: 'item', item: g1.subgroups[0]!.items[0]! },
    ]);
  });

  it('does not leak one group into another when they share a label', () => {
    // Both groups are literally called "Resources"; a match in g1 must not keep
    // g2's header (which has no matching item under it).
    const result = filterConfigEntries(flat, groups, 'alpha');
    const groupRows = result.filter((e) => e.type === 'group');
    expect(groupRows).toHaveLength(1);
    expect(groupRows[0]!.type === 'group' && groupRows[0].group).toBe(g1);
  });

  it('keeps a subgroup header only for the subgroup that matched', () => {
    const multi = group('Mixed', [
      item('/p/one.ts', 'one-ext', 'extensions'),
      item('/p/two.md', 'two-skill', 'skills'),
    ]);
    // Split the single group's items into two subgroups with the same label.
    const split: ResourceGroup = {
      ...multi,
      subgroups: [
        { type: 'extensions', label: 'Same', items: [multi.subgroups[0]!.items[0]!] },
        { type: 'skills', label: 'Same', items: [multi.subgroups[0]!.items[1]!] },
      ],
    };
    const result = filterConfigEntries(flatten([split]), [split], 'two-skill');
    const subgroupRows = result.filter((e) => e.type === 'subgroup');
    expect(subgroupRows).toHaveLength(1);
    expect(subgroupRows[0]!.type === 'subgroup' && subgroupRows[0].subgroup.type).toBe('skills');
  });

  it('matches items across several groups', () => {
    const result = filterConfigEntries(flat, groups, 'ext');
    expect(result.filter((e) => e.type === 'item')).toHaveLength(2);
    expect(result.filter((e) => e.type === 'group')).toHaveLength(2);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterConfigEntries(flat, groups, 'zzz')).toEqual([]);
  });
});
