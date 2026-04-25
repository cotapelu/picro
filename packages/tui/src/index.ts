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

// Terminal Image Support
export {
  getCapabilities,
  detectCapabilities,
  getCellDimensions,
  setCellDimensions,
  getPngDimensions,
  getJpegDimensions,
  getGifDimensions,
  getWebpDimensions,
  getImageDimensions,
  renderImage,
  imageFallback,
  isImageLine,
  encodeKitty,
  deleteKittyImage,
  deleteAllKittyImages,
  encodeITerm2,
  calculateImageRows,
  type ImageProtocol,
  type TerminalCapabilities,
  type CellDimensions,
  type ImageDimensions,
  type ImageRenderOptions,
} from './terminal-image.js';

// Kill Ring (Clipboard)
export { KillRing, defaultKillRing, type PushOptions } from './kill-ring.js';

// Undo Stack
export { UndoStack, UndoRedoManager } from './undo-stack.js';

// Diff
export { Diff, renderDiff, type DiffOptions, type DiffTheme, type DiffLine, type DiffLineType } from './components/diff.js';

// Footer
export { Footer, type FooterOptions, type FooterItem, type FooterTheme } from './components/footer.js';

// ContextMenu
export { ContextMenu, createMenuItem, menuSeparator, type ContextMenuOptions, type ContextMenuTheme, type MenuItem } from './components/context-menu.js';

// CommandPalette
export { CommandPalette, type CommandPaletteOptions, type CommandPaletteTheme, type Command } from './components/command-palette.js';

// ModelSelector  
export { ModelSelector, type ModelSelectorOptions, type ModelSelectorTheme, type ModelInfo } from './components/model-selector.js';

// FileBrowser
export { FileBrowser, type FileBrowserOptions, type FileBrowserTheme, type FileItem } from './components/file-browser.js';

// Toast
export { Toast, ToastManager, createToast, successToast, errorToast, warningToast, infoToast, type ToastType, type ToastOptions, type ToastTheme } from './components/toast.js';

// Modal/Dialog
export { Modal, confirmDialog, alertDialog, type ModalType, type ModalOptions, type ModalTheme, type ModalButton } from './components/modal.js';

// ProgressBar
export { ProgressBar, StepperProgress, createProgressBar, type ProgressBarOptions, type ProgressBarTheme } from './components/progress-bar.js';

// Badge
export { Badge, BadgeGroup, createBadge, statusBadge, type BadgeVariant, type BadgeOptions, type BadgeTheme } from './components/badge.js';

// Divider
export { Divider, horizontalDivider, verticalDivider, sectionDivider, doubleDivider, type DividerStyle, type DividerOptions, type DividerTheme } from './components/divider.js';

// Breadcrumbs
export { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsOptions, type BreadcrumbsTheme } from './components/breadcrumbs.js';

// Stepper/Wizard
export { Stepper, type Step, type StepperOptions, type StepperTheme } from './components/stepper.js';

// Rating
export { Rating, createRating, type RatingOptions, type RatingTheme } from './components/rating.js';
