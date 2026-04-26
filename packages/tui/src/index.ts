/**
 * Terminal UI Package - Minimal Public API for Coding Agent
 * 
 * Only exports what the coding agent actually uses.
 */

// Core types (from base.ts)
export { CURSOR_MARKER } from './components/base.js';
export type { UIElement, InteractiveElement, KeyEvent, RenderContext } from './components/base.js';

// Main TerminalUI (from tui.ts)
export { TerminalUI } from './components/tui.js';

// Terminal (from terminal.ts)
export { ProcessTerminal } from './components/terminal.js';

// Components
export { Text } from './components/text.js';
export { SelectList, type SelectItem } from './components/select-list.js';
export { SettingsList, type SettingItem } from './components/settings-list.js';
export { BorderedLoader } from './components/loader.js';
export { Markdown } from './components/markdown.js';
