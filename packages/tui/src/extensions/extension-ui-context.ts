/**
 * Extension UI Context
 *
 * Provides UI APIs for extensions to interact with the TUI.
 * This interface mirrors the capabilities available to built-in components.
 */

import type { TerminalUI } from '../interactive/tui.js';
import type { UIElement } from '../atoms/base.js';
import type { Theme } from '../atoms/themes.js';
import type { AutocompleteProvider, AutocompleteItem } from '../atoms/autocomplete.js';

/**
 * Options for extension widget placement
 */
export interface ExtensionWidgetOptions {
	/** Where to place the widget relative to the editor */
	placement?: 'aboveEditor' | 'belowEditor';
}

/**
 * Options for extension dialogs
 */
export interface ExtensionUIDialogOptions {
	/** AbortSignal to cancel the dialog */
	signal?: AbortSignal;
	/** Timeout in ms, after which dialog auto-cancels */
	timeout?: number;
}

/**
 * Context object passed to extensions for UI interactions.
 */
export interface ExtensionUIContext {
	/** Show a selector dialog with list of options */
	select(title: string, options: string[], opts?: ExtensionUIDialogOptions): Promise<string | undefined>;
	/** Show a confirmation dialog */
	confirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean>;
	/** Show an input dialog with placeholder */
	input(title: string, placeholder?: string, opts?: ExtensionUIDialogOptions): Promise<string | undefined>;
	/** Show a notification toast */
	notify(message: string, type: 'info' | 'warning' | 'error'): void;
	/** Register a handler for raw terminal input (e.g., for custom keybindings) */
	onTerminalInput(handler: (input: string) => void): void;
	/** Set a status indicator in the footer */
	setStatus(key: string, text: string): void;
	/** Set the working message shown during operations */
	setWorkingMessage(message: string | null): void;
	/** Configure the working indicator (spinner, etc.) */
	setWorkingIndicator(options: { message?: string; show?: boolean }): void;
	/** Set a label shown when thinking is hidden */
	setHiddenThinkingLabel(label: string): void;
	/** Set a widget (UI element) to be displayed */
	setWidget(key: string, content: UIElement | null, options?: ExtensionWidgetOptions): void;
	/** Set a footer factory */
	setFooter(factory: () => UIElement | null): void;
	/** Set a header factory */
	setHeader(factory: () => UIElement | null): void;
	/** Set the terminal window title */
	setTitle(title: string): void;
	/** Show a custom dialog with a factory producing UIElement */
	custom(factory: (tui: TerminalUI) => UIElement, options?: ExtensionUIDialogOptions): Promise<void>;
	/** Paste text into the editor at cursor position */
	pasteToEditor(text: string): void;
	/** Replace the entire editor contents */
	setEditorText(text: string): void;
	/** Get current editor text */
	getEditorText(): string;
	/** Show the editor as a dialog */
	editor(title?: string, prefill?: string): Promise<string | undefined>;
	/** Add an autocomplete provider */
	addAutocompleteProvider(factory: () => AutocompleteProvider): void;
	/** Replace the editor component entirely */
	setEditorComponent(factory: (tui: TerminalUI) => UIElement | null): void;
	/** Current theme (reactive) */
	readonly theme: Theme;
	/** Get all available themes */
	getAllThemes(): { name: string; path?: string }[];
	/** Get a theme by name */
	getTheme(name: string): Theme | undefined;
	/** Set the theme by name or instance */
	setTheme(themeOrName: Theme | string): { success: boolean };
	/** Whether the tool output panel is expanded */
	getToolsExpanded(): boolean;
	/** Expand/collapse the tool output panel */
	setToolsExpanded(expanded: boolean): void;
}
