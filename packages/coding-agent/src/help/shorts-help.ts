/**
 * Shorts Help - Types for keyboard shortcuts documentation
 */

export interface Shorts {
  /** Shortcut key combination (e.g., 'Ctrl+S') */
  key: string;
  /** Description of what the shortcut does */
  description: string;
}

export interface ShortsCategory {
  /** Category name */
  name: string;
  /** Shortcuts in this category */
  items: Shorts[];
}
