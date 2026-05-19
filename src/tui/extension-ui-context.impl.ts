/**
 * Default Implementation of ExtensionUIContext
 * Provides UI services for extensions through the TUI.
 */

import type { TerminalUI } from './tui';
import type { UIElement, KeyHandlerResult } from './core/base';
import type { Theme } from './core/themes';
import type { AutocompleteProvider } from './core/autocomplete';
import { themeManager } from './core/themes';
import type { ExtensionUIContext, ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extension-ui-context';

// Simple internal status tracking
class ExtensionStatus {
  statuses = new Map<string, string>();
  workingMessage: string | null = null;
}

/**
 * Default implementation of ExtensionUIContext
 */
export class DefaultExtensionUIContext implements ExtensionUIContext {
  private tui: TerminalUI;
  private status = new ExtensionStatus();
  private autocompleteProviders: AutocompleteProvider[] = [];
  private toolsExpanded: boolean = false;
  private themeListener?: () => void;
  private currentTheme: Theme;

  constructor(tui: TerminalUI) {
    this.tui = tui;
    this.currentTheme = themeManager.getTheme();
    this.themeListener = themeManager.onChange((theme) => { this.currentTheme = theme; });
  }

  // ==================== Dialogs (Stubs) ====================

  async select(title: string, options: string[], opts?: ExtensionUIDialogOptions): Promise<string | undefined> {
    // Not fully implemented yet
    return undefined;
  }

  async confirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean> {
    return false;
  }

  async input(title: string, placeholder?: string, opts?: ExtensionUIDialogOptions): Promise<string | undefined> {
    return undefined;
  }

  // ==================== Notifications ====================

  notify(message: string, type: 'info' | 'warning' | 'error'): void {
    // Stub
  }

  // ==================== Terminal Input ====================

  onTerminalInput(handler: (input: string) => void): void {
    this.tui.addKeyHandler((key): KeyHandlerResult => {
      handler(key.raw);
      return { consume: true };
    });
  }

  // ==================== Status & Working Indicator ====================

  setStatus(key: string, text: string): void {
    this.status.statuses.set(key, text);
  }

  setWorkingMessage(message: string | null): void {
    this.status.workingMessage = message;
  }

  setWorkingIndicator(options: { message?: string; show?: boolean }): void {
    if (options.show === false) {
      this.status.workingMessage = null;
    } else if (options.message !== undefined) {
      this.status.workingMessage = options.message;
    }
  }

  setHiddenThinkingLabel(label: string): void {
    // Not implemented
  }

  // ==================== Widgets ====================

  setWidget(key: string, content: UIElement | null, options?: ExtensionWidgetOptions): void {
    // TODO: Integrate with InteractiveMode.widget containers
  }

  setFooter(factory: () => UIElement | null): void {
    // TODO: Integrate with InteractiveMode.footerContainer
  }

  setHeader(factory: () => UIElement | null): void {
    // TODO: Integrate with InteractiveMode.headerContainer
  }

  // ==================== Title ====================

  setTitle(title: string): void {
    if (this.tui.terminal.setTitle) {
      this.tui.terminal.setTitle(title);
    } else if (process.title) {
      process.title = title;
    }
  }

  // ==================== Custom Dialog ====================

  async custom(factory: (tui: TerminalUI) => UIElement, options?: ExtensionUIDialogOptions): Promise<void> {
    const element = factory(this.tui);
    const handle = this.tui.showPanel(element, {
      anchor: 'center',
      width: '80%',
      height: '90%',
    });
    // No way to wait for close; resolve immediately
    return Promise.resolve();
  }

  // ==================== Editor ====================

  pasteToEditor(text: string): void {
    // TODO
  }

  setEditorText(text: string): void {
    // TODO
  }

  getEditorText(): string {
    return '';
  }

  editor(title?: string, prefill?: string): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  // ==================== Autocomplete ====================

  addAutocompleteProvider(factory: () => AutocompleteProvider): void {
    const provider = factory();
    this.autocompleteProviders.push(provider);
  }

  // ==================== Custom Editor Component ====================

  setEditorComponent(factory: (tui: TerminalUI) => UIElement | null): void {
    // TODO
  }

  // ==================== Theme ====================

  get theme(): Theme {
    return this.currentTheme;
  }

  getAllThemes(): { name: string; path?: string }[] {
    return [{ name: 'dark' }, { name: 'light' }];
  }

  getTheme(name: string): Theme | undefined {
    return (themeManager as any).palettes.get(name);
  }

  setTheme(themeOrName: Theme | string): { success: boolean } {
    if (typeof themeOrName === 'string') {
      const available = ['dark', 'light'];
      if (available.includes(themeOrName)) {
        themeManager.setTheme(themeOrName);
        return { success: true };
      }
      return { success: false };
    }
    return { success: false };
  }

  // ==================== Tool Output Panel ====================

  getToolsExpanded(): boolean {
    return this.toolsExpanded;
  }

  setToolsExpanded(expanded: boolean): void {
    this.toolsExpanded = expanded;
  }

  // Cleanup
  dispose(): void {
    if (this.themeListener) this.themeListener();
  }
}

/**
 * Create an ExtensionUIContext bound to a TUI instance.
 */
export function createExtensionUIContext(tui: TerminalUI): ExtensionUIContext {
  return new DefaultExtensionUIContext(tui);
}
