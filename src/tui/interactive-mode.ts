// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode - Full AI Chat Interface
 *
 * Reference: packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts
 * (Clean-room implementation)
 */

import type { UIElement, RenderContext, InteractiveElement, KeyEvent } from './atoms/base';
import type { TerminalUI } from './tui';
import { ElementContainer } from './atoms/base';
import { Footer } from './atoms/footer';
import { UserMessage } from './atoms/user-message';
import { AssistantMessage } from './atoms/assistant-message';
import { ToolMessage } from './atoms/tool-message';
import { Text } from './atoms/index';
import type { AgentSessionRuntimeInterface, AgentSessionEvent } from '../types/agent-session';
import type { InteractiveModeOptions } from './interactive-mode-types';

/**
 * InteractiveMode is a self-contained UI component that renders the full chat interface.
 * It extends ElementContainer for composition.
 */
export class InteractiveMode extends ElementContainer implements InteractiveElement {
  isFocused = false;

  // Runtime connection (set via setRuntime())
  private runtime: AgentSessionRuntimeInterface | null = null;

  // Event subscription cleanup
  private unsubscribe: (() => void) | null = null;

  // State
  private isInitialized = false;
  private running = false;

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

  /**
   * Set the runtime host - called from main.ts to connect UI to runtime
   */
  setRuntime(runtime: AgentSessionRuntimeInterface): void {
    this.runtime = runtime;
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

    // Setup submit handler - connected to runtime if available
    (this.editor as any).onSubmit = async (text: string) => {
      if (this.runtime) {
        // Submit to runtime session
        await this.runtime.session.prompt(text);
      } else {
        // Fallback: just display locally (for testing)
        if (this.inputController.resolve) this.inputController.resolve(text);
      }
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

    // Subscribe to runtime events if runtime is connected
    if (this.runtime) {
      this.unsubscribe = this.runtime.session.subscribe((event: AgentSessionEvent) => {
        this.handleRuntimeEvent(event);
      });
    }

    // Main interactive loop - get input and send to runtime
    while (this.running) {
      try {
        const text = await this.getUserInput();
        if (text && this.running && this.runtime) {
          await this.runtime.session.prompt(text);
        }
      } catch {
        if (!this.running) break;
      }
    }
  }

  /**
   * Handle events from the agent session runtime
   */
  private handleRuntimeEvent(event: AgentSessionEvent): void {
    switch (event.type) {
      case 'message_start':
        if (event.message.role === 'user') {
          // User message - could display or skip if already shown
        }
        break;
      case 'message_update':
        // Streaming update - update UI
        this.updateStreamingMessage(event.message);
        break;
      case 'message_end':
        // Message complete
        this.finalizeStreamingMessage(event.message);
        break;
      case 'tool_execution_start':
        this.addToolMessage(event.toolName, 'Executing...');
        break;
      case 'tool_execution_update':
        // Update tool output if available
        break;
      case 'tool_execution_end':
        // Update tool result
        break;
      case 'agent_start':
        this.setStatus('Processing...');
        break;
      case 'agent_end':
        this.statusContainer.clear();
        break;
    }
  }

  private updateStreamingMessage(message: { role: string; content?: unknown[] }): void {
    // Extract text from content blocks
    const text = this.extractTextFromContent(message.content || []);
    if (text) {
      this.addAssistantMessage(text);
    }
  }

  private finalizeStreamingMessage(message: { role: string; stopReason?: string }): void {
    // Could add status indicator for stop reason
    if (message.stopReason === 'error') {
      this.showError('Agent error occurred');
    }
  }

  private extractTextFromContent(content: unknown[]): string {
    return (content as any[])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');
  }

  stop(): void {
    this.running = false;
    if (this.inputController.reject) this.inputController.reject(new Error('Stopped'));
    this.inputController = {};

    // Unsubscribe from runtime
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
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

  showError(text: string): void {
    this.statusContainer.clear();
    this.statusContainer.append(new Text(`Error: ${text}`));
    this.tui.requestRender();
  }

  setRightItems(_items: unknown[]): void {}

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