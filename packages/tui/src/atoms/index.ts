// Foundation layer exports
export * from './base.js';
export * from './keys.js';
export * from './utils.js';
export * from './fuzzy.js';
export * from './autocomplete.js';
export * from './kill-ring.js';
export * from './undo-stack.js';
export * from './i18n.js';
export * from './object-pool.js';
export * from './resource-bundle.js';
export * from './internal-utils.js';
export type * from './types.js';
export * from './color-fallback.js';
export * from './stdin-buffer.js';
export * from './terminal.js';
export * from './keybindings.js';
export * from './themes.js';
// Theme also exports similar names; re-export with rename to avoid conflict
export type {
	ThemeColors as ThemeColors_theme,
	ThemeName
} from './theme.js';
export {
	darkTheme as darkTheme_theme,
	lightTheme as lightTheme_theme,
	themes,
	themeManager,
	getTheme,
	setTheme,
	onThemeChange,
	fg,
	bg
} from './theme.js';
export * from './terminal-image.js';
export * from './state-serializer.js';
export type * from './types-atoms.js';
