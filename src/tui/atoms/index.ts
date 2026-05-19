// Core utilities re-exports (for backward compatibility)
export * from '../core/base';
export * from '../core/keys';
export * from '../core/utils';
export * from '../core/fuzzy';
export * from '../core/autocomplete';
export * from '../core/kill-ring';
export * from '../core/undo-stack';
export * from '../core/i18n';
export * from '../core/object-pool';
export * from '../core/resource-bundle';
export * from '../core/internal-utils';
export type * from '../core/types';
export * from '../core/color-fallback';
export * from '../core/stdin-buffer';
export * from '../core/terminal';
export * from '../core/keybindings';
export * from '../core/themes';
// Theme also exports similar names; re-export with rename to avoid conflict
export type {
	ThemeColors as ThemeColors_theme,
	ThemeName
} from '../core/theme';
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
} from '../core/theme';
export * from '../core/terminal-image';
export * from '../core/state-serializer';

// Primitive UI components (true atoms)
export * from './text';
export * from './spacer';
export * from './divider';
export * from './badge';
export * from './rating';
export * from './progress-bar';
export * from './stepper';
export * from './box';
export * from './flex';
export * from './grid';
export * from './truncated-text';
export * from './dynamic-border';
export * from './visual-truncate';
export * from './daxnuts';
export * from './armin';
export * from './animations';
