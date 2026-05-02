// Core base types - value exports
export {
	ElementContainer,
	CURSOR_MARKER,
	resolveDimension
} from './components/base.js';

// Core base types - type exports
export type {
	UIElement,
	InteractiveElement,
	RenderContext,
	KeyEvent,
	MouseEvent,
	Expandable,
	Dimension
} from './components/base.js';

// Core engine
export { TerminalUI } from './components/tui.js';
export { ProcessTerminal } from './components/terminal.js';
export type { Terminal } from './components/terminal.js';

// Input & editing
export { Input } from './components/input.js';
export type { InputOptions } from './components/input.js';
export { Editor } from './components/editor.js';
export type { EditorOptions } from './components/editor.js';

// Selection
export { SelectList } from './components/select-list.js';
export type { SelectItem, SelectListTheme } from './components/select-list.js';
export { SettingsList } from './components/settings-list.js';
export type { SettingItem, SettingsListTheme } from './components/settings-list.js';

// Display
export { Text } from './components/text.js';
export { Markdown } from './components/markdown.js';
export { Spacer } from './components/spacer.js';
export { Divider } from './components/divider.js';
export { Box } from './components/box.js';
export { DynamicBorder } from './components/dynamic-border.js';

// Data components
// Tree view, Table, Form
// ------------------------------------------------------------------
export { TreeView } from './components/tree-view.js';
export type { TreeNode, TreeViewOptions } from './components/tree-view.js';

export { Table } from './components/table.js';
export type { TableOptions } from './components/table.js';

export { Form } from './components/form.js';
export type { FormField, FormOptions } from './components/form.js';

// Layout managers (Flex, Grid)
export { Flex } from './components/flex.js';
export type { FlexOptions } from './components/flex.js';

export { Grid } from './components/grid.js';
export type { GridOptions } from './components/grid.js';

// Loaders
export { BorderedLoader } from './components/loader.js';
export { CancellableLoader } from './components/cancellable-loader.js';

// Progress / indicators
export { ProgressBar } from './components/progress-bar.js';
export { Rating } from './components/rating.js';
export { Stepper } from './components/stepper.js';
export { Badge } from './components/badge.js';
export { Breadcrumbs } from './components/breadcrumbs.js';

// Messages
export { UserMessage } from './components/user-message.js';
export type { UserMessageOptions } from './components/user-message.js';
export { AssistantMessage } from './components/assistant-message.js';
export type { AssistantMessageOptions } from './components/assistant-message.js';
export { ToolMessage } from './components/tool-message.js';
export type { ToolMessageOptions } from './components/tool-message.js';
export { BashExecutionMessage } from './components/bash-execution-message.js';
export type { BashExecutionMessageOptions } from './components/bash-execution-message.js';
export { CustomMessage } from './components/custom-message.js';
export type { CustomMessageOptions } from './components/custom-message.js';

// Tool execution
export { ToolExecutionMessage } from './components/tool-execution.js';
export type { ToolExecutionOptions } from './components/tool-execution.js';

// UI chrome
export { Footer } from './components/footer.js';
export type { FooterOptions, FooterItem } from './components/footer.js';
export { CommandPalette } from './components/command-palette.js';
export { ContextMenu } from './components/context-menu.js';
export type { ContextMenuOptions } from './components/context-menu.js';
export { FileBrowser } from './components/file-browser.js';
export type { FileEntry } from './components/file-browser.js';
export { LoginDialog } from './components/login-dialog.js';
export type { LoginDialogOptions } from './components/login-dialog.js';
export { Modal } from './components/modal.js';
export type { ModalOptions } from './components/modal.js';
export { Toast } from './components/toast.js';
export type { ToastOptions } from './components/toast.js';
export { ConfigSelector } from './components/config-selector.js';
export { MemoryPanel } from './components/memory-panel.js';
export type { MemoryPanelOptions } from './components/memory-panel.js';
export { DebugPanel } from './components/debug-panel.js';

// Selectors
export { SessionSelector } from './components/session-selector.js';
export type { SessionSelectorOptions, SessionInfo } from './components/session-selector.js';
export { SettingsSelector } from './components/settings-selector.js';
export type { SettingsSelectorOptions } from './components/settings-selector.js';
export { ModelSelector } from './components/model-selector.js';
export type { ModelSelectorOptions, ModelInfo } from './components/model-selector.js';
export { OAuthSelector } from './components/oauth-selector.js';
export type { OAuthSelectorOptions } from './components/oauth-selector.js';
export { ScopedModelsSelector } from './components/scoped-models-selector.js';
export type { ScopedModelsSelectorOptions } from './components/scoped-models-selector.js';
export { ExtensionSelector } from './components/extension-selector.js';
export type { ExtensionSelectorOptions } from './components/extension-selector.js';
export { ExtensionInput } from './components/extension-input.js';
export type { ExtensionInputOptions } from './components/extension-input.js';
export { ExtensionEditor } from './components/extension-editor.js';
export type { ExtensionEditorOptions } from './components/extension-editor.js';
export { ThemeSelector } from './components/theme-selector.js';
export type { ThemeSelectorOptions } from './components/theme-selector.js';
export { ShowImagesSelector } from './components/show-images-selector.js';
export type { ShowImagesSelectorOptions } from './components/show-images-selector.js';
export { TreeSelector } from './components/tree-selector.js';
export type { TreeSelectorOptions } from './components/tree-selector.js';
export { ThinkingSelector } from './components/thinking-selector.js';
export type { ThinkingSelectorOptions } from './components/thinking-selector.js';

// Utilities
export { fuzzyMatch, fuzzyFilter, fuzzyHighlight } from './components/fuzzy.js';
export { KillRing, defaultKillRing } from './components/kill-ring.js';
export { UndoStack } from './components/undo-stack.js';
export { renderDiff } from './components/diff.js';
export type { DiffOptions } from './components/diff.js';
export { visibleWidth, wrapText, truncateText, truncateToWidth, expandTabs, wrapTextWithAnsi, extractSegments } from './components/internal-utils.js';
export { parseKey, matchesKey, isKeyRelease, isKeyRepeat, decodeKittyPrintable } from './components/keys.js';
export { getKeybindings, KeybindingsManager } from './components/keybindings.js';
export {
	CombinedAutocompleteProvider,
	SlashCommandAutocompleteProvider,
	FilePathAutocompleteProvider
} from './components/autocomplete.js';
export type { AutocompleteProvider, AutocompleteItem } from './components/autocomplete.js';

// Theme
export { darkTheme, lightTheme, highContrastTheme, ThemeManager, themeManager } from './components/themes.js';
export type { Theme } from './components/themes.js';

// Terminal image
export {
	renderImage,
	encodeKitty,
	encodeITerm2,
	encodeSixel,
	getImageDimensions,
	setCellDimensions,
	getCellDimensions,
	isImageLine,
	isTermuxSession,
	allocateImageId,
	deleteKittyImage,
	deleteAllKittyImages,
	calculateImageRows,
	imageFallback,
	getCapabilities,
	detectCapabilities,
	resetCapabilitiesCache,
	setCapabilities,
	clearRenderCache,
	fetchImageAsBase64,
	preloadImage,
	setCustomImageLoader,
	renderAnimatedGif
} from './components/terminal-image.js';
export type {
	CellDimensions,
	ImageDimensions,
	ImageRenderOptions,
	TerminalCapabilities,
	ImageProtocol,
	ScaleMode
} from './components/terminal-image.js';

// Misc
export { CountdownTimer } from './components/countdown-timer.js';
export { KeybindingHints } from './components/keybinding-hints.js';

// Interactive mode (UI only - for extensions)
export { InteractiveMode } from './interactive-mode.js';
export type { InteractiveModeOptions } from './interactive-mode.js';

// Utilities
export { ObjectPool } from './object-pool.js';

// Color fallback
export { adaptThemeToTerminal, parseRgbAnsi, rgbTo256, rgbTo8, convertRgbAnsiTo256, convertRgbAnsiTo8 } from './color-fallback.js';

// Layout debugging
export { LayoutInspector } from './layout-inspector.js';

// Internationalization
export { i18n } from './i18n.js';
export type { Translation } from './i18n.js';

// Animations
export { Blink, Slide } from './animations.js';

// Layout managers
export { SplitPane } from './split-pane.js';

// Resource bundling
export { loadBundleFromFile, createBundleFromUrls, saveBundle } from './resource-bundle.js';
export type { ResourceBundle } from './resource-bundle.js';

// Extensions (all types)
export type {
	ExtensionUIContext,
	ExtensionWidgetOptions,
	ExtensionUIDialogOptions
} from './extensions/extension-ui-context.js';


// Easter eggs / special components
export { ArminComponent } from './components/armin.js';
export { DaxnutsComponent } from './components/daxnuts.js';
export { EarendilAnnouncementComponent } from './components/earendil-announcement.js';

// Agent integration
export { createAgentToolBridge } from './agent-bridge.js';

// Debugging
export { DebugOverlay } from './debug-overlay.js';

// Legacy compatibility aliases (with Component suffix)
export { Input as TextInputComponent } from './components/input.js';
export { SelectList as SelectListComponent } from './components/select-list.js';
export { SettingsList as SettingsListComponent } from './components/settings-list.js';
export { Text as TextComponent } from './components/text.js';
export { Markdown as MarkdownComponent } from './components/markdown.js';
export { UserMessage as UserMessageComponent } from './components/user-message.js';
export { AssistantMessage as AssistantMessageComponent } from './components/assistant-message.js';
export { ToolMessage as ToolMessageComponent } from './components/tool-message.js';
export { BashExecutionMessage as BashExecutionComponent } from './components/bash-execution-message.js';
export { CustomMessage as CustomMessageComponent } from './components/custom-message.js';
export { ToolExecutionMessage as ToolExecutionComponent } from './components/tool-execution.js';
export { Footer as FooterComponent } from './components/footer.js';
export { CommandPalette as CommandPaletteComponent } from './components/command-palette.js';
export { ContextMenu as ContextMenuComponent } from './components/context-menu.js';
export { FileBrowser as FileBrowserComponent } from './components/file-browser.js';
export { LoginDialog as LoginDialogComponent } from './components/login-dialog.js';
export { Modal as ModalComponent } from './components/modal.js';
export { Toast as ToastComponent } from './components/toast.js';
export { ConfigSelector as ConfigSelectorComponent } from './components/config-selector.js';
export { MemoryPanel as MemoryPanelComponent } from './components/memory-panel.js';
export { DebugPanel as DebugPanelComponent } from './components/debug-panel.js';
export { SessionSelector as SessionSelectorComponent } from './components/session-selector.js';
export { SettingsSelector as SettingsSelectorComponent } from './components/settings-selector.js';
export { ModelSelector as ModelSelectorComponent } from './components/model-selector.js';
export { OAuthSelector as OAuthSelectorComponent } from './components/oauth-selector.js';
export { ScopedModelsSelector as ScopedModelsSelectorComponent } from './components/scoped-models-selector.js';
export { ExtensionSelector as ExtensionSelectorComponent } from './components/extension-selector.js';
export { ExtensionInput as ExtensionInputComponent } from './components/extension-input.js';
export { ExtensionEditor as ExtensionEditorComponent } from './components/extension-editor.js';
export { ThemeSelector as ThemeSelectorComponent } from './components/theme-selector.js';
export { ShowImagesSelector as ShowImagesSelectorComponent } from './components/show-images-selector.js';
export { TreeSelector as TreeSelectorComponent } from './components/tree-selector.js';
export { ThinkingSelector as ThinkingSelectorComponent } from './components/thinking-selector.js';
export { CountdownTimer as CountdownTimerComponent } from './components/countdown-timer.js';
export { KeybindingHints as KeybindingHintsComponent } from './components/keybinding-hints.js';
export { BorderedLoader as LoaderComponent } from './components/loader.js';
