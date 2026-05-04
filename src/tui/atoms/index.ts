// Foundation layer exports
export * from './base';
export * from './keys';
export * from './utils';
export * from './fuzzy';
export * from './autocomplete';
export * from './kill-ring';
export * from './undo-stack';
export * from './i18n';
export * from './object-pool';
export * from './resource-bundle';
export * from './internal-utils';
export type * from './types';
export * from './color-fallback';
export * from './stdin-buffer';
export * from './terminal';
export * from './keybindings';
export * from './themes';
// Theme also exports similar names; re-export with rename to avoid conflict
export type {
	ThemeColors as ThemeColors_theme,
	ThemeName
} from './theme';
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
} from './theme';
export * from './terminal-image';
export * from './state-serializer';
export type * from './types-atoms';

// Primitive UI components (moved from molecules)
export * from './text';
export * from './spacer';
export * from './divider';
export * from './badge';
export * from './rating';
export * from './daxnuts';
export * from './armin';
export * from './animations';
export * from './progress-bar';
export * from './stepper';

// Additional primitive UI components
export * from './visual-truncate';
export * from './dynamic-border';
export * from './auth-selector-status';
export * from './user-message';
export * from './tool-execution';

// Layout primitives
export * from './box';
export * from './flex';
export * from './grid';

// Text & display primitives
export * from './truncated-text';
export * from './markdown';
export * from './toast';
export * from './breadcrumbs';
export * from './table';

// Message primitives (simple)
export * from './branch-summary-message';
export * from './compaction-summary-message';
export * from './skill-invocation-message';
export * from './earendil-announcement';
export * from './diff';

// Additional message components
export * from './assistant-message';
export * from './bash-execution-message';
export * from './custom-message';
export * from './tool-message';

// Chrome primitives
export * from './footer';
export * from './stats-footer';

// Overlay/panel primitives
export * from './debug-overlay';
export * from './layout-inspector';
