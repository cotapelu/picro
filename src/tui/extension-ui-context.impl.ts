/**
 * Default Implementation of ExtensionUIContext
 * Provides UI services for extensions through the TUI.
 */

import type { TerminalUI } from './tui';
import type { UIElement, KeyHandlerResult, ElementContainer } from './core/base';
import type { Theme } from './core/themes';
import type { AutocompleteProvider } from './core/autocomplete';
import { themeManager } from './core/themes';
import type { ExtensionUIContext, ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extension-ui-context';
import { Modal, type ModalButton } from './organisms/modal';
import { SelectList, type SelectItem } from './molecules/select-list';
import { Input } from './molecules/input';
import { Toast } from './molecules/toast';
import { Text } from './atoms/index';

/**
 * Internal UI handler that connects ExtensionUIContext to InteractiveMode.
 */
export interface ExtensionUIHandler {
  // Status & working
  setStatus(key: string, text: string): void;
  setWorkingMessage(message: string | null): void;
  setWorkingIndicator(options: { message?: string; show?: boolean }): void;
  // Widgets
  setWidget(key: string, content: UIElement | null, options?: ExtensionWidgetOptions): void;
  // Header & Footer
  setHeader(factory: () => UIElement | null): void;
  setFooter(factory: () => UIElement | null): void;
  // Editor
  getEditorText(): string;
  setEditorText(text: string): void;
  pasteToEditor(text: string): void;
  setEditorComponent(factory: (tui: TerminalUI) => UIElement | null): void;
  showEditorDialog(title?: string, prefill?: string): Promise<string | undefined>;
  // Tools
  getToolsExpanded(): boolean;
  setToolsExpanded(expanded: boolean): void;
  // Misc
  setTitle(title: string): void;
  addAutocompleteProvider(factory: () => AutocompleteProvider): void;
  // Custom dialog
  showCustomDialog(factory: (tui: TerminalUI) => UIElement, options?: ExtensionUIDialogOptions): Promise<void>;
  // Command registration
  registerCommand(command: {
    id: string;
    label: string;
    shortcut?: string;
    description?: string;
    category?: string;
    onExecute: () => void;
  }): void;
  // Compaction
  setCompactionCount(count: number): void;
}


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
  private ui?: ExtensionUIHandler;

  constructor(tui: TerminalUI, ui?: ExtensionUIHandler) {
    this.tui = tui;
    this.ui = ui;
    this.currentTheme = themeManager.getTheme();
    this.themeListener = themeManager.onChange((theme) => { this.currentTheme = theme; });
  }

  // ==================== Dialogs ====================

  async select(title: string, options: string[], opts?: ExtensionUIDialogOptions): Promise<string | undefined> {
    const items: SelectItem[] = options.map(opt => ({ label: opt, value: opt }));
    const list = new SelectList(items, 10);
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: list,
        type: 'info',
        buttons: [
          { label: 'Cancel', value: 'cancel' },
          { label: 'OK', value: 'ok', primary: true },
        ],
        onResult: (value) => {
          handle.close();
          if (value === 'ok') {
            resolve(list.getSelectedValue());
          } else {
            resolve(undefined);
          }
        },
        onCancel: () => {
          handle.close();
          resolve(undefined);
        },
      });
      const handle = this.tui.showPanel(modal, { anchor: 'center', width: '80%', height: '90%' });
      if (opts?.timeout) {
        setTimeout(() => {
          if (!handle.isHidden()) {
            handle.close();
            resolve(undefined);
          }
        }, opts.timeout);
      }
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          if (!handle.isHidden()) {
            handle.close();
          }
        });
      }
    });
  }

  async confirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        message,
        type: 'confirm',
        buttons: [
          { label: 'Cancel', value: 'cancel' },
          { label: 'OK', value: 'ok', primary: true },
        ],
        onResult: (value) => {
          handle.close();
          resolve(value === 'ok');
        },
        onCancel: () => {
          handle.close();
          resolve(false);
        },
      });
      const handle = this.tui.showPanel(modal, { anchor: 'center', width: '60%', height: '10%' });
      if (opts?.timeout) {
        setTimeout(() => {
          if (!handle.isHidden()) {
            handle.close();
            resolve(false);
          }
        }, opts.timeout);
      }
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          if (!handle.isHidden()) {
            handle.close();
          }
        });
      }
    });
  }

  async input(title: string, placeholder?: string, opts?: ExtensionUIDialogOptions): Promise<string | undefined> {
    const input = new Input({ placeholder });
    return new Promise((resolve) => {
      const modal = new Modal({
        title,
        content: input,
        type: 'info',
        buttons: [
          { label: 'Cancel', value: 'cancel' },
          { label: 'OK', value: 'ok', primary: true },
        ],
        onResult: (value) => {
          handle.close();
          if (value === 'ok') {
            resolve(input.getValue());
          } else {
            resolve(undefined);
          }
        },
        onCancel: () => {
          handle.close();
          resolve(undefined);
        },
      });
      const handle = this.tui.showPanel(modal, { anchor: 'center', width: '80%', height: '20%' });
      if (opts?.timeout) {
        setTimeout(() => {
          if (!handle.isHidden()) {
            handle.close();
            resolve(undefined);
          }
        }, opts.timeout);
      }
      if (opts?.signal) {
        opts.signal.addEventListener('abort', () => {
          if (!handle.isHidden()) {
            handle.close();
          }
        });
      }
    });
  }

  // ==================== Notifications ====================

  notify(message: string, type: 'info' | 'warning' | 'error'): void {
    const toast = new Toast({ message, type, duration: 5000 });
    const handle = this.tui.showPanel(toast, { anchor: 'top-right', width: 40, height: 3 });
    setTimeout(() => {
      if (!handle.isHidden()) {
        handle.close();
      }
    }, 5000);
  }

  registerCommand(command: {
    id: string;
    label: string;
    shortcut?: string;
    description?: string;
    category?: string;
    onExecute: () => void;
  }): void {
    this.ui?.registerCommand(command);
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
    this.ui?.setStatus(key, text);
  }

  setWorkingMessage(message: string | null): void {
    this.ui?.setWorkingMessage(message);
  }

  setWorkingIndicator(options: { message?: string; show?: boolean }): void {
    this.ui?.setWorkingIndicator(options);
  }

  setHiddenThinkingLabel(label: string): void {
    // Not implemented
  }

  // ==================== Widgets ====================

  setWidget(key: string, content: UIElement | null, options?: ExtensionWidgetOptions): void {
    this.ui?.setWidget(key, content, options);
  }

  setFooter(factory: () => UIElement | null): void {
    this.ui?.setFooter(factory);
  }

  setHeader(factory: () => UIElement | null): void {
    this.ui?.setHeader(factory);
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
    if (this.ui?.showCustomDialog) {
      return this.ui.showCustomDialog(factory, options);
    }
    // Fallback: show as panel without waiting
    const element = factory(this.tui);
    this.tui.showPanel(element, { anchor: 'center', width: '80%', height: '90%' });
    return Promise.resolve();
  }

  // ==================== Editor ====================

  pasteToEditor(text: string): void {
    this.ui?.pasteToEditor(text);
  }

  setEditorText(text: string): void {
    this.ui?.setEditorText(text);
  }

  getEditorText(): string {
    return this.ui?.getEditorText() ?? '';
  }

  async editor(title?: string, prefill?: string): Promise<string | undefined> {
    if (this.ui) {
      return this.ui.showEditorDialog(title, prefill);
    }
    return Promise.resolve(undefined);
  }

  // ==================== Autocomplete ====================

  addAutocompleteProvider(factory: () => AutocompleteProvider): void {
    const provider = factory();
    this.autocompleteProviders.push(provider);
    this.ui?.addAutocompleteProvider(factory);
  }

  // ==================== Custom Editor Component ====================

  setEditorComponent(factory: (tui: TerminalUI) => UIElement | null): void {
    this.ui?.setEditorComponent(factory);
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
    return this.ui?.getToolsExpanded() ?? false;
  }

  setToolsExpanded(expanded: boolean): void {
    this.ui?.setToolsExpanded(expanded);
  }

  // ==================== Compaction ====================

  setCompactionCount(count: number): void {
    this.ui?.setCompactionCount(count);
  }

  // Cleanup
  dispose(): void {
    if (this.themeListener) this.themeListener();
  }
}

/**
 * Create an ExtensionUIContext bound to a TUI instance.
 */
export function createExtensionUIContext(tui: TerminalUI, ui?: ExtensionUIHandler): ExtensionUIContext {
  return new DefaultExtensionUIContext(tui, ui);
}
