// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode - Full AI Chat Interface
 *
 * Reference: packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts
 * (Clean-room implementation)
 */

import { ElementContainer, type UIElement, type RenderContext, type InteractiveElement, type KeyEvent, type Dimension, CURSOR_MARKER } from './atoms/base';
import type { TerminalUI } from './tui';
import { Footer, type FooterOptions } from './atoms/footer';
import { UserMessage, type UserMessageOptions } from './atoms/user-message';
import { AssistantMessage, type AssistantMessageOptions } from './atoms/assistant-message';
import { ToolMessage, type ToolMessageOptions } from './atoms/tool-message';
import { Text } from './atoms/index';

const MAX_WIDGET_LINES = 3;

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

  // Version
  private version = '0.0.1';

  // Input promise controller
  private inputController: { resolve?: (value: string) => void; reject?: (reason?: any) => void } = {};

  constructor(tui: TerminalUI, options: InteractiveModeOptions = {}) {
    super();
    this.tui = tui;
    this.options = options;

    // Create footer
    const footerOpts: FooterOptions = {};
    this.footer = new Footer(footerOpts);

    // Setup layout
    this.setupLayout();
  }

  private setupLayout(): void {
    // Add containers to InteractiveMode (they are children of ElementContainer)
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
    this.editor = new Input({
      placeholder: this.options.inputPlaceholder ?? 'Type your message...',
    });
    this.editorContainer.append(this.editor as UIElement);

    // Setup submit handler
    (this.editor as any).onSubmit = (text: string) => {
      if (this.inputController.resolve) {
        this.inputController.resolve(text);
      }
      this.inputController = {};
    };

    // Build header
    const headerText = new Text('Picro Agent');
    this.headerContainer.append(headerText);

    // Start TUI
    this.tui.start();

    // Set focus on the editor for keyboard input
    this.tui.setFocus(this.editor as UIElement);

    this.isInitialized = true;
  }

  async run(): Promise<void> {
    await this.init();

    this.running = true;

    while (this.running) {
      try {
        await this.processInput();
      } catch {
        // Stopped
        break;
      }
    }
  }

  stop(): void {
    this.running = false;
    // Reject any pending input promise
    if (this.inputController.reject) {
      this.inputController.reject(new Error('Stopped'));
    }
    this.inputController = {};
  }

  private async processInput(): Promise<void> {
    // Wait for user input or stop
    try {
      const text = await this.getUserInput();
      if (text && this.running) {
        this.addUserMessage(text);
      }
    } catch (e) {
      // Stopped - exit gracefully
    }
  }

  private getUserInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.inputController = { resolve, reject };
    });
  }

  // UIElement implementation
  draw(context: RenderContext): string[] {
    // Let ElementContainer handle drawing children
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

  // InteractiveElement implementation
  handleKey?(event: KeyEvent): void {
    // Forward to editor
    this.editor?.handleKey?.(event);
  }

  // Public API
  addUserMessage(text: string): void {
    const userOpts: UserMessageOptions = { text };
    const msg = new UserMessage(userOpts);
    this.chatContainer.append(msg as UIElement);
    this.tui.requestRender();
  }

  addAssistantMessage(text: string): void {
    const assistantOpts: AssistantMessageOptions = { content: text };
    const msg = new AssistantMessage(assistantOpts);
    this.chatContainer.append(msg as UIElement);
    this.tui.requestRender();
  }

  addToolMessage(toolName: string, output: string, _exitCode?: number): void {
    const toolOpts: ToolMessageOptions = { toolName, output };
    const msg = new ToolMessage(toolOpts);
    this.chatContainer.append(msg as UIElement);
    this.tui.requestRender();
  }

  setStatus(text: string): void {
    this.statusContainer.clear();
    this.statusContainer.append(new Text(text));
    this.tui.requestRender();
  }

  setRightItems(items: any[]): void {
    // Update footer right items
  }

  setWidget(key: string, content: string[] | UIElement | null, options?: { placement?: 'aboveEditor' | 'belowEditor' }): void {
    const container = options?.placement === 'belowEditor' ? this.widgetBelowContainer : this.widgetAboveContainer;

    if (content === null) {
      // Remove widget
    } else if (Array.isArray(content)) {
      const text = new Text(content.join('\n'));
      container.append(text);
    } else {
      container.append(content);
    }

    this.tui.requestRender();
  }

  setHeader(component: UIElement | null): void {
    // Clear header and optionally set custom
    this.headerContainer.clear();
    if (component) {
      this.headerContainer.append(component);
    }
    this.tui.requestRender();
  }

  setCustomFooter(component: UIElement | null): void {
    // Clear footer container and optionally set custom
    this.footerContainer.clear();
    if (component) {
      this.footerContainer.append(component);
    }
    this.tui.requestRender();
  }
}