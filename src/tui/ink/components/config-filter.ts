// SPDX-License-Identifier: Apache-2.0
/**
 * ConfigSelector filtering and windowing.
 *
 * Extracted so the search behaviour is testable without Ink's renderer, and to
 * fix the defect the inline version had: matching groups/subgroups were tracked
 * by their display LABEL, so two groups (or two subgroups of different groups)
 * that happened to share a label leaked each other's results - a header with no
 * matching item under it stayed visible, and a matching group's header could be
 * dropped in favour of the other's.
 */

import type { FlatEntry, ResourceGroup, ResourceItem, ResourceSubgroup } from './ConfigSelector.js';

/** Does `entry` match the query on display name, resource type or path? */
export function itemMatchesQuery(item: ResourceItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.displayName.toLowerCase().includes(q) ||
    item.resourceType.toLowerCase().includes(q) ||
    item.path.toLowerCase().includes(q)
  );
}

/**
 * Keep the rows that survive a query: matching items, plus the headers of the
 * groups/subgroups that contain them.
 *
 * Identity is tracked by object reference, never by label: labels are display
 * strings and are not unique.
 */
export function filterConfigEntries(
  flat: FlatEntry[],
  groups: ResourceGroup[],
  query: string,
): FlatEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return flat;

  const matching = new Set<ResourceItem>();
  for (const group of groups) {
    for (const subgroup of group.subgroups) {
      for (const item of subgroup.items) {
        if (itemMatchesQuery(item, trimmed)) matching.add(item);
      }
    }
  }

  const matchingGroups = new Set<ResourceGroup>();
  const matchingSubgroups = new Set<ResourceSubgroup>();
  for (const group of groups) {
    for (const subgroup of group.subgroups) {
      if (subgroup.items.some((item) => matching.has(item))) {
        matchingSubgroups.add(subgroup);
        matchingGroups.add(group);
      }
    }
  }

  return flat.filter((entry) => {
    if (entry.type === 'group') return matchingGroups.has(entry.group);
    if (entry.type === 'subgroup') return matchingSubgroups.has(entry.subgroup);
    return matching.has(entry.item);
  });
}
