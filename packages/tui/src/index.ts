/**
 * Terminal UI Package - Minimal Public API for Coding Agent
 * 
 * Exports only what coding-agent actually uses.
 */

// ============================================================================
// BASE TYPES (for custom components)
// ============================================================================
export { CURSOR_MARKER } from './components/base.js';
export type { UIElement, InteractiveElement, KeyEvent, RenderContext } from './components/base.js';

// ============================================================================
// CORE INFRASTRUCTURE
// ============================================================================
export { TerminalUI } from './components/tui.js';
export { ProcessTerminal } from './components/terminal.js';

// ============================================================================
// SELECTION COMPONENTS
// ============================================================================
export { SelectList, type SelectItem } from './components/select-list.js';
export { SettingsList, type SettingItem } from './components/settings-list.js';

// ============================================================================
// PANEL COMPONENTS
// ============================================================================
export { MemoryPanel, type MemoryEntry } from './components/memory-panel.js';

// ============================================================================
// INPUT COMPONENTS
// ============================================================================
export { Input, type InputOptions } from './components/input.js';

// ============================================================================
// DIALOG COMPONENTS
// ============================================================================
export { Modal, type ModalOptions, type ModalButton, type ModalTheme, confirmDialog, alertDialog } from './components/modal.js';

// ============================================================================
// LOW-LEVEL COMPONENTS (for advanced usage)
// ============================================================================
export { Text } from './components/text.js';
export { Markdown } from './components/markdown.js';
export { BorderedLoader } from './components/loader.js';
