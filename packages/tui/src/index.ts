/**
 * Terminal UI Package - Minimal Public API for Coding Agent
 * 
 * Only exports what the coding agent actually uses.
 */

// Core types (from base.ts)
export { CURSOR_MARKER } from './components/base.js';
export type { UIElement, InteractiveElement, KeyEvent, RenderContext, KeyHandler, InputListener } from './components/base.js';

// Main TerminalUI (from tui.ts)
export { TerminalUI } from './components/tui.js';

// Terminal (from terminal.ts)
export { ProcessTerminal } from './components/terminal.js';

// Components
export { Text } from './components/text.js';
export { SelectList, type SelectItem } from './components/select-list.js';
export { SettingsList, type SettingItem } from './components/settings-list.js';
export { BorderedLoader } from './components/loader.js';
export { CancellableLoader } from './components/cancellable-loader.js';
export { Markdown } from './components/markdown.js';
export { MemoryPanel, type MemoryEntry } from './components/memory-panel.js';
export { DebugPanel, type DebugRoundEvent, type DebugRunEvent } from './components/debug-panel.js';
export { ProgressBar, StepperProgress } from './components/progress-bar.js';
export { Stepper } from './components/stepper.js';
export { CommandPalette, type Command } from './components/command-palette.js';
export { KeybindingHints, type KeyBinding } from './components/keybinding-hints.js';
export { FileBrowser, type FileEntry } from './components/file-browser.js';
export { ModelSelector, type ModelInfo } from './components/model-selector.js';
export { SessionSelector, type SessionInfo } from './components/session-selector.js';

// Message components
export { UserMessage, type UserMessageOptions } from './components/user-message.js';
export { AssistantMessage, type AssistantMessageOptions } from './components/assistant-message.js';
export { ToolMessage, type ToolMessageOptions } from './components/tool-message.js';

// Theme system
export { ThemeManager, themeManager, darkTheme, lightTheme, highContrastTheme, type Theme } from './components/themes.js';

// Footer
export { Footer, type FooterItem, type FooterTheme, defaultTheme } from './components/footer.js';
export { StatsFooter, type SessionStats } from './components/stats-footer.js';

// Dialogs
export { Modal, type ModalOptions, type ModalButton, type ModalTheme, defaultTheme as modalDefaultTheme, confirmDialog, alertDialog } from './components/modal.js';
