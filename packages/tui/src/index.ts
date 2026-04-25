/**
 * Terminal UI Package - Terminal User Interface
 */

// Core TerminalUI
export { TerminalUI, ElementContainer, isInteractive, CURSOR_MARKER, resolveDimension, isTermuxSession } from './tui.js';
export type { UIElement, InteractiveElement, Dimension, PanelOptions, PanelAnchor, PanelMargin, RenderContext, KeyEvent, KeyHandler, KeyHandlerResult, PanelHandle, UITheme } from './tui.js';

// Theme exports
export { themeManager, getThemeById, themePresets, darkTheme, lightTheme, highContrastTheme } from './themes.js';
export type { ThemePreset } from './themes.js';

// Keyboard handling
export {
	Key, parseKey, matchesKey, isKeyRelease, isKeyRepeat,
	setKittyProtocolActive, isKittyProtocolActive,
	setModifyOtherKeysActive, encodeKittyKey, decodeKittyPrintable,
	type KeyEventType, type KeyId, type ParsedKey,
} from './keys.js';

// Keybindings
export {
	KeybindingsManager, TUI_KEYBINDINGS, getKeybindings, setKeybindings,
	type Keybinding, type KeybindingDefinitions, type KeybindingConflict,
	type KeybindingsConfig,
} from './keybindings.js';

// Components
export { Box } from './components/box.js';
export { Text } from './components/text.js';
export { Markdown } from './components/markdown.js';
export { SelectList, type SelectItem, type SelectListTheme } from './components/select-list.js';
export { SettingsList, type SettingItem, type SettingsListTheme } from './components/settings-list.js';
export { BorderedLoader } from './components/loader.js';
export { DynamicBorder } from './components/dynamic-border.js';
export { Input, type InputOptions } from './components/input.js';
export { Editor, type EditorOptions } from './components/editor.js';

// Terminal
export { ProcessTerminal } from './terminal.js';
export type { Terminal } from './terminal.js';

// Fuzzy matching
export {
	fuzzyMatch, fuzzyFilter, fuzzyHighlight,
	type FuzzyMatch, type FuzzyOptions,
} from './fuzzy.js';

// Stdin Buffer
export {
	StdinBuffer, type StdinBufferEventMap, type StdinBufferOptions,
} from './stdin-buffer.js';

// Utils
export {
	visibleWidth,
	wrapText,
	truncateText,
	extractAnsiCode,
	extractSegments,
	sliceByColumn,
	sliceWithWidth,
	stripAnsi,
	hasAnsi,
	getSegmenter,
} from './utils.js';
