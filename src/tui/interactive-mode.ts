// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode - Full AI Chat Interface
 *
 * Reference: packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts
 * (Clean-room implementation)
 */

import { ElementContainer, type UIElement, type RenderContext, type InteractiveElement, type KeyEvent } from './atoms/base';
import type { TerminalUI } from './tui';
import { Footer } from './atoms/footer';
import { UserMessage } from './atoms/user-message';
import { AssistantMessage } from './atoms/assistant-message';
import { ToolMessage } from './atoms/tool-message';
import { Text } from './atoms/index';

export interface InteractiveModeOptions {
  inputPlaceholder?: string;
  initialStatus?: string;
  model?: string;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

/**
 * InteractiveMode is a self-contained UI component that renders the full chat interface.
 * It extends ElementContainer for composition.
 */
export class InteractiveMode extends ElementContainer implements InteractiveElement {
  isFocused = false;

  // Containers
  headerContainer = new ElementContainer();
  chatContainer = new ElementContainer();
  pendingContainer = new ElementContainer();
  statusContainer = new ElementContainer();
  widgetAboveContainer = new ElementContainer();
  editorContainer = new ElementContainer();
  widgetBelowContainer = new ElementContainer();
  footerContainer = new ElementContainer();

  // Editor - will be created in init()
  private editor: any;

  // Footer
  footer: Footer;

  // TUI reference
  private tui: TerminalUI;

  // Options
  private options: InteractiveModeOptions;

  // State
  private isInitialized = false;
  private running = false;

  // Input promise controller
  private inputController: { resolve?: (value: string) => void; reject?: (reason?: any) => void } = {};

  constructor(tui: TerminalUI, options: InteractiveModeOptions = {}) {
    super();
    this.tui = tui;
    this.options = options;

    // Create footer
    this.footer = new Footer({});

    // Setup layout
    this.setupLayout();
  }

  private setupLayout(): void {
    super.append(this.headerContainer);
    super.append(this.chatContainer);
    super.append(this.pendingContainer);
    super.append(this.statusContainer);
    super.append(this.widgetAboveContainer);
    super.append(this.editorContainer);
    super.append(this.widgetBelowContainer);
    super.append(this.footerContainer);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Import Input dynamically to avoid circular dependency
    const { Input } = await import('./molecules/input.js');

    // Create editor
    this.editor = new Input({ placeholder: this.options.inputPlaceholder ?? 'Type your message...' });
    this.editorContainer.append(this.editor as UIElement);

    // Setup submit handler
    (this.editor as any).onSubmit = (text: string) => {
      if (this.inputController.resolve) this.inputController.resolve(text);
      this.inputController = {};
    };

    // Build header
    this.headerContainer.append(new Text('Picro Agent'));

    // Start TUI and set focus
    this.tui.start();
    this.tui.setFocus(this.editor as UIElement);

    this.isInitialized = true;
  }

  async run(): Promise<void> {
    await this.init();
    this.running = true;
    while (this.running) {
      try { await this.processInput(); } catch { break; }
    }
  }

  stop(): void {
    this.running = false;
    if (this.inputController.reject) this.inputController.reject(new Error('Stopped'));
    this.inputController = {};
  }

  private async processInput(): Promise<void> {
    try {
      const text = await this.getUserInput();
      if (text && this.running) this.addUserMessage(text);
    } catch { /* Stopped */ }
  }

  private getUserInput(): Promise<string> {
    return new Promise((resolve, reject) => { this.inputController = { resolve, reject }; });
  }

  draw(context: RenderContext): string[] {
    return super.draw(context);
  }

  clearCache(): void {
    this.headerContainer.clearCache?.();
    this.chatContainer.clearCache?.();
    this.pendingContainer.clearCache?.();
    this.statusContainer.clearCache?.();
    this.widgetAboveContainer.clearCache?.();
    this.editorContainer.clearCache?.();
    this.widgetBelowContainer.clearCache?.();
    this.footerContainer.clearCache?.();
    super.clearCache();
  }

  handleKey?(event: KeyEvent): void {
    this.editor?.handleKey?.(event);
  }

  addUserMessage(text: string): void {
    this.chatContainer.append(new UserMessage({ text }) as UIElement);
    this.tui.requestRender();
  }

  addAssistantMessage(text: string): void {
    this.chatContainer.append(new AssistantMessage({ content: text }) as UIElement);
    this.tui.requestRender();
  }

  addToolMessage(toolName: string, output: string): void {
    this.chatContainer.append(new ToolMessage({ toolName, output }) as UIElement);
    this.tui.requestRender();
  }

  setStatus(text: string): void {
    this.statusContainer.clear();
    this.statusContainer.append(new Text(text));
    this.tui.requestRender();
  }

  setRightItems(_items: any[]): void {}

  setWidget(_key: string, content: string[] | UIElement | null, options?: { placement?: 'aboveEditor' | 'belowEditor' }): void {
    const container = options?.placement === 'belowEditor' ? this.widgetBelowContainer : this.widgetAboveContainer;
    if (content === null) return;
    container.append(Array.isArray(content) ? new Text(content.join('\n')) : content);
    this.tui.requestRender();
  }

  setHeader(component: UIElement | null): void {
    this.headerContainer.clear();
    if (component) this.headerContainer.append(component);
    this.tui.requestRender();
  }

  setCustomFooter(component: UIElement | null): void {
    this.footerContainer.clear();
    if (component) this.footerContainer.append(component);
    this.tui.requestRender();
  }
}