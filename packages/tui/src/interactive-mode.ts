import { TerminalUI } from './components/tui.js';
import type { UIElement, RenderContext, InteractiveElement, KeyEvent } from './components/base.js';
import { ElementContainer } from './components/base.js';
import { Input, type InputOptions } from './components/input.js';
import { Footer, type FooterItem } from './components/footer.js';
import { SelectList, type SelectItem } from './components/select-list.js';
import { UserMessage, type UserMessageOptions } from './components/user-message.js';
import { AssistantMessage, type AssistantMessageOptions } from './components/assistant-message.js';
import { ToolMessage, type ToolMessageOptions } from './components/tool-message.js';
import { Toast, type ToastOptions } from './components/toast.js';
import { Text } from './components/text.js';
import { CountdownTimer } from './components/countdown-timer.js';
import type { ExtensionUIContext, ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extensions/extension-ui-context.js';

export interface InteractiveModeOptions {
  tui: TerminalUI;
  inputPlaceholder?: string;
  initialStatus?: string;
  onUserInput?: (text: string) => void;
}

interface ChatMessage {
  id: string;
  element: UIElement;
}

/**
 * ChatInterface - Main layout container
 *
 * Composes:
 * - Header (optional)
 * - Message area (scrollable, showing chat messages)
 * - Widget area (up to 3 lines)
 * - Input area (single-line)
 * - Footer (status line or custom)
 */
class ChatInterface implements UIElement, InteractiveElement {
  public isFocused = false;
  private messages: ChatMessage[] = [];
  private widgets = new Map<string, UIElement>();
  private header: UIElement | null = null;
  private customFooter: UIElement | null = null;
  private input: Input;
  private footer: Footer;
  private placeholder: string;
  private onUserInput?: (text: string) => void;
  private tui: TerminalUI;

  constructor(tui: TerminalUI, placeholder: string, onUserInput?: (text: string) => void) {
    this.tui = tui;
    this.placeholder = placeholder;
    this.onUserInput = onUserInput;
    this.input = new Input({
      placeholder,
      onSubmit: (value) => {
        if (value.trim()) {
          onUserInput?.(value);
        }
        this.input.setValue('');
        this.tui.requestRender();
      },
      onCancel: () => {
        this.input.setValue('');
        this.tui.requestRender();
      },
    });
    this.footer = new Footer({ leftItems: [], rightItems: [] });
  }

  /**
   * Add a message to the chat
   */
  addMessage(element: UIElement, id?: string): string {
    const msgId = id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.messages.push({ id: msgId, element });
    this.tui.requestRender();
    return msgId;
  }

  /**
   * Remove a message by ID
   */
  removeMessage(id: string): void {
    const idx = this.messages.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.messages.splice(idx, 1);
      this.tui.requestRender();
    }
  }

  /**
   * Set status text in the footer (left items)
   */
  setStatus(text: string): void {
    this.footer.leftItems = text ? [{ label: text }] : [];
    this.footer.clearCache?.();
    this.tui.requestRender();
  }

  /**
   * Set footer right items
   */
  setRightItems(items: FooterItem[]): void {
    this.footer.rightItems = items;
    this.footer.clearCache?.();
    this.tui.requestRender();
  }

  /**
   * Set a widget (extension UI)
   */
  setWidget(key: string, content: UIElement | null): void {
    if (content === null) {
      this.widgets.delete(key);
    } else {
      this.widgets.set(key, content);
    }
    this.tui.requestRender();
  }

  /**
   * Set a header component (top of screen)
   */
  setHeader(header: UIElement | null): void {
    this.header = header;
    this.tui.requestRender();
  }

  /**
   * Set a custom footer component (replaces default footer)
   */
  setCustomFooter(footer: UIElement | null): void {
    this.customFooter = footer;
    this.tui.requestRender();
  }

  /**
   * Focus the input field
   */
  focusInput(): void {
    this.tui.setFocus(this.input);
    this.isFocused = true;
  }

  draw(context: RenderContext): string[] {
    const width = context.width;
    const totalHeight = context.height;

    const footerHeight = 1;
    const inputHeight = 1;
    const maxWidgetHeight = 3;
    const headerHeight = this.header ? 1 : 0;

    // Collect all widget lines
    const widgetLinesAll: string[] = [];
    for (const widget of this.widgets.values()) {
      widgetLinesAll.push(...widget.draw({ width, height: 1000 } as RenderContext));
    }
    const widgetHeight = Math.min(widgetLinesAll.length, maxWidgetHeight);

    const nonMessagesHeight = headerHeight + widgetHeight + inputHeight + footerHeight;
    const messagesHeight = Math.max(0, totalHeight - nonMessagesHeight);

    const lines: string[] = [];

    // Header
    if (headerHeight > 0 && this.header) {
      const hdrLines = this.header.draw({ width, height: 1 } as RenderContext);
      lines.push(...hdrLines.slice(0, 1));
    }

    // Render messages (bottom-aligned)
    if (messagesHeight > 0) {
      const allMsgLines: string[] = [];
      for (const msg of this.messages) {
        allMsgLines.push(...msg.element.draw({ width, height: 1e6 } as RenderContext));
      }
      if (allMsgLines.length > messagesHeight) {
        lines.push(...allMsgLines.slice(allMsgLines.length - messagesHeight));
      } else {
        const pad = messagesHeight - allMsgLines.length;
        for (let i = 0; i < pad; i++) lines.push('');
        lines.push(...allMsgLines);
      }
    }

    // Widget lines
    if (widgetHeight > 0) {
      lines.push(...widgetLinesAll.slice(0, widgetHeight));
    }

    // Input
    const inputLines = this.input.draw({ width, height: inputHeight } as RenderContext);
    lines.push(...inputLines.slice(0, inputHeight));

    // Footer (custom or default)
    const footerEl = this.customFooter || this.footer;
    const footerLines = footerEl.draw({ width, height: footerHeight } as RenderContext);
    lines.push(...footerLines.slice(0, footerHeight));

    if (lines.length > totalHeight) {
      return lines.slice(lines.length - totalHeight);
    }
    return lines;
  }

  handleKey(key: KeyEvent): void {
    // Not used; focus is on input
  }

  clearCache(): void {
    this.input.clearCache?.();
    this.footer.clearCache?.();
    this.header?.clearCache?.();
    this.customFooter?.clearCache?.();
    this.messages.forEach(m => m.element.clearCache?.());
    this.widgets.forEach(w => w.clearCache?.());
  }
}

export class InteractiveMode {
  private tui: TerminalUI;
  private chatInterface: ChatInterface;
  private countdownTimers: CountdownTimer[] = [];
  private extensionContext!: ExtensionUIContext;
  private userInputHandler?: (text: string) => void;
  private onInputCallback?: (text: string) => void;
  private inputResolver?: (text: string) => void;
  private running = false;

  constructor(options: InteractiveModeOptions) {
    this.tui = options.tui;
    this.userInputHandler = options.onUserInput;

    this.chatInterface = new ChatInterface(
      this.tui,
      options.inputPlaceholder || 'You: ',
      (text) => {
        // When user submits, resolve the pending input promise
        if (this.inputResolver) {
          const resolver = this.inputResolver;
          this.inputResolver = undefined;
          resolver(text);
        }
        // Also call the external handler
        this.userInputHandler?.(text);
      }
    );

    this.tui.append(this.chatInterface);
    this.chatInterface.focusInput();

    if (options.initialStatus) {
      this.chatInterface.setStatus(options.initialStatus);
    }

    this.extensionContext = this.createExtensionUIContext();
  }

  /**
   * Start the interactive mode and run the main loop.
   * This blocks until the session ends.
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    
    // Start the TUI
    this.tui.start();
    
    // Main interactive loop
    while (this.running) {
      const userInput = await this.getUserInput();
      if (userInput) {
        this.userInputHandler?.(userInput);
      }
    }
  }

  /**
   * Get user input - returns a Promise that resolves when user submits.
   */
  private getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this.inputResolver = resolve;
      this.chatInterface.focusInput();
    });
  }

  /**
   * Stop the interactive mode.
   */
  stop(): void {
    this.running = false;
    if (this.inputResolver) {
      this.inputResolver('');
      this.inputResolver = undefined;
    }
    this.tui.stop();
  }

  addUserMessage(content: string, options?: Omit<UserMessageOptions, 'text'>): string {
    const msg = new UserMessage({ ...options, text: content });
    return this.chatInterface.addMessage(msg);
  }

  addAssistantMessage(content: string, options?: Omit<AssistantMessageOptions, 'content'>): string {
    const msg = new AssistantMessage({ ...options, content });
    return this.chatInterface.addMessage(msg);
  }

  addToolMessage(toolName: string, output: string, exitCode?: number): string {
    const msg = new ToolMessage({ toolName, output, error: exitCode !== 0 });
    return this.chatInterface.addMessage(msg);
  }

  setStatus(message: string): void {
    this.chatInterface.setStatus(message);
  }

  startCountdown(
    id: string,
    timeoutMs: number,
    onTick: (seconds: number) => void,
    onComplete: () => void
  ): void {
    const timer = new CountdownTimer(timeoutMs, onTick, onComplete, () => this.tui.requestRender());
    this.countdownTimers.push(timer);
  }

  async showDialog(component: UIElement): Promise<void> {
    this.tui.showPanel(component, { anchor: 'center' });
  }

  getExtensionUIContext(): ExtensionUIContext {
    return this.extensionContext;
  }

  focusInput(): void {
    this.chatInterface.focusInput();
  }

  dispose(): void {
    for (const timer of this.countdownTimers) {
      timer.dispose();
    }
    this.countdownTimers = [];
  }

  private createExtensionUIContext(): ExtensionUIContext {
    const mode = this;
    return {
      select: async (title, options, opts) => {
        const container = new ElementContainer();
        const items: SelectItem[] = options.map((opt, idx) => ({
          value: String(idx),
          label: opt,
        }));
        const selectList = new SelectList(
          items,
          Math.min(options.length, 10),
          {},
          (value) => {
            const idx = parseInt(value, 10);
            resolve(options[idx]);
            handle.close();
          },
          () => {
            resolve(undefined);
            handle.close();
          }
        );
        container.append(selectList);
        let resolve: (value: string | undefined) => void = () => {};
        const handle = mode.tui.showPanel(container, { anchor: 'center' });
        return new Promise<string | undefined>((r) => {
          resolve = r;
        });
      },
      confirm: async (title, message, opts) => {
        return true;
      },
      input: async (title, placeholder, opts) => {
        const container = new ElementContainer();
        const input = new Input({
          placeholder,
          onSubmit: (val) => {
            resolve(val);
            handle.close();
          },
          onCancel: () => {
            resolve(undefined);
            handle.close();
          },
        });
        container.append(input);
        let resolve: (value: string | undefined) => void = () => {};
        const handle = mode.tui.showPanel(container, { anchor: 'center' });
        return new Promise<string | undefined>((r) => {
          resolve = r;
        });
      },
      notify: (message, type) => {
        const duration = 4000;
        const toast = new Toast({ message, type: type as any, duration });
        const handle = mode.tui.showPanel(toast, { anchor: 'top-right' });
        setTimeout(() => handle.close(), duration);
      },
      onTerminalInput: (handler) => {},
      setStatus: (key, text) => {
        mode.chatInterface.setRightItems([{ key, label: text }]);
      },
      setWorkingMessage: (message) => {
        if (message) {
          mode.setStatus(`⏳ ${message}`);
        } else {
          mode.setStatus('');
        }
      },
      setWorkingIndicator: (opts) => {},
      setHiddenThinkingLabel: (label) => {},
      setWidget: (key, content, options) => {
        mode.chatInterface.setWidget(key, content);
      },
      setFooter: (factory) => {
        const footer = factory();
        mode.chatInterface.setCustomFooter(footer ?? null);
      },
      setHeader: (factory) => {
        const header = factory();
        mode.chatInterface.setHeader(header ?? null);
      },
      setTitle: (title) => {
        mode.tui.terminal.setTitle(title);
      },
      custom: async (factory, options) => {
        const component = factory(mode.tui);
        await mode.showDialog(component);
      },
      pasteToEditor: (text) => {
        mode.chatInterface.setWidget('paste', new Text(text));
      },
      setEditorText: (text) => {
        console.warn('setEditorText not implemented');
      },
      getEditorText: () => '',
      editor: async (title, prefill) => {
        const container = new ElementContainer();
        const input = new Input({
          placeholder: title || 'Edit',
          value: prefill,
          onSubmit: (val) => {
            resolve(val);
            handle.close();
          },
          onCancel: () => {
            resolve(undefined);
            handle.close();
          },
        });
        container.append(input);
        let resolve: (value: string | undefined) => void = () => {};
        const handle = mode.tui.showPanel(container, { anchor: 'center' });
        return new Promise<string | undefined>((r) => {
          resolve = r;
        });
      },
      addAutocompleteProvider: (factory) => {
        console.warn('addAutocompleteProvider not implemented yet');
      },
      setEditorComponent: (factory) => {
        console.warn('setEditorComponent not implemented yet');
      },
      get theme() {
        return { primary: '', secondary: '', accent: '', background: '', foreground: '' } as any;
      },
      getAllThemes: () => [],
      getTheme: (name) => undefined,
      setTheme: (themeOrName) => ({ success: false }),
      getToolsExpanded: () => true,
      setToolsExpanded: (expanded) => {},
    };
  }
}

export { ChatInterface };
