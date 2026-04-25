/**
 * Shortcuts Help - Functions for managing keyboard shortcuts documentation
 */
import type { Shorts, ShortsCategory } from './shorts-help.js';

// Default keyboard shortcuts for the TUI
const defaultShortcuts: ShortsCategory[] = [
  {
    name: 'Navigation',
    items: [
      { key: 'Tab', description: 'Focus next element' },
      { key: 'Shift+Tab', description: 'Focus previous element' },
      { key: 'Esc', description: 'Close panel/exit' },
    ],
  },
  {
    name: 'Actions',
    items: [
      { key: 'Enter', description: 'Activate/confirm' },
      { key: 'Ctrl+C', description: 'Interrupt' },
    ],
  },
  {
    name: 'Help',
    items: [
      { key: 'F1', description: 'Show help overlay' },
      { key: '?', description: 'Show keybindings help' },
    ],
  },
  {
    name: 'Panels',
    items: [
      { key: 'F5', description: 'Toggle debug panel' },
      { key: 'Ctrl+P', description: 'Toggle panel' },
    ],
  },
];

/**
 * Get all keyboard shortcuts organized by category
 */
export function getShortcuts(): ShortsCategory[] {
  return structuredClone(defaultShortcuts);
}

/**
 * Search shortcuts by key or description
 */
export function searchShortcuts(query: string): Shorts[] {
  const results: Shorts[] = [];
  const lowerQuery = query.toLowerCase();

  for (const category of defaultShortcuts) {
    for (const item of category.items) {
      if (
        item.key.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(item);
      }
    }
  }

  return results;
}

/**
 * Format shortcuts as a readable help text
 */
export function formatShortsHelp(categories?: ShortsCategory[]): string {
  const cats = categories ?? getShortcuts();
  const lines: string[] = [];

  for (const cat of cats) {
    lines.push(`\x1b[1m${cat.name}\x1b[0m`);
    lines.push('');
    for (const item of cat.items) {
      const keyPadded = item.key.padEnd(12);
      lines.push(`  \x1b[33m${keyPadded}\x1b[0m  ${item.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
