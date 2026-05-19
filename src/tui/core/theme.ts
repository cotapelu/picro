/**
 * Theme System (wrapper for themes.ts)
 * Re-export everything from themes.ts and provide ThemeColors alias for compatibility.
 */

export * from './themes';

// Backward compatibility: ThemeColors is an alias for Theme
export type { Theme as ThemeColors } from './themes';
