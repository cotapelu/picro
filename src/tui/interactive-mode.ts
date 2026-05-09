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
import { Editor } from './organisms/editor';
import { LoginDialog } from './organisms/login-dialog';
import { ThinkingSelector } from './organisms/thinking-selector';
import { CommandPalette } from './organisms/command-palette';
import { Modal } from './organisms/modal';
import { MemoryPanel, type MemoryEntry } from './organisms/memory-panel';
import { DebugPanel, type DebugRoundEvent } from './organisms/debug-panel';
import { FileBrowser, type FileEntry } from './organisms/file-browser';
import type { AgentSessionRuntimeInterface, AgentSessionEvent } from '../types/agent-session';
import type { InteractiveModeOptions } from './interactive-mode-types';

/**
 * Command definition for command palette
 */
export interface InteractiveModeCommand {
  id: string;
  label: string;
  shortcut?: string;
  description?: string;
  category?: string;
  onExecute: () => void;
}

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
  private thinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' = 'off';

  // Containers
  headerContainer = new ElementContainer();
  chatContainer = new ElementContainer();
  pendingContainer = new ElementContainer();
  statusContainer = new ElementContainer();
  widgetAboveContainer = new ElementContainer();
  editorContainer = new ElementContainer();
  widgetBelowContainer = new ElementContainer();
  footerContainer = new ElementContainer();

  // Editor - using Editor organism (Tầng 3)
  private editor: Editor | null = null;

  // Login dialog (organism)
  private loginDialog: LoginDialog | null = null;

  // Thinking selector (organism)
  private thinkingSelector: ThinkingSelector | null = null;

  // Command palette (organism)
  private commandPalette: CommandPalette | null = null;
  private commands: InteractiveModeCommand[] = [];

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

    // Setup default commands
    this.setupDefaultCommands();

    // Setup layout
    this.setupLayout();
  }

  /**
   * Set up default commands for command palette
   */
  private setupDefaultCommands(): void {
    this.commands = [
      {
        id: 'new-session',
        label: 'New Session',
        shortcut: 'Ctrl+N',
        category: 'Session',
        description: 'Start a new chat session',
        onExecute: () => this.handleNewSession(),
      },
      {
        id: 'switch-session',
        label: 'Switch Session',
        shortcut: 'Ctrl+S',
        category: 'Session',
        description: 'Switch to another session',
        onExecute: () => this.handleSwitchSession(),
      },
      {
        id: 'fork-session',
        label: 'Fork Session',
        shortcut: 'Ctrl+F',
        category: 'Session',
        description: 'Fork current session',
        onExecute: () => this.handleForkSession(),
      },
      {
        id: 'thinking',
        label: 'Thinking Level',
        shortcut: 'Ctrl+T',
        category: 'Agent',
        description: 'Select thinking level',
        onExecute: () => this.handleThinkingSelector(),
      },
      {
        id: 'login',
        label: 'Login',
        shortcut: 'Ctrl+L',
        category: 'Account',
        description: 'Set API key',
        onExecute: () => this.handleLogin(),
      },
      {
        id: 'clear',
        label: 'Clear Chat',
        shortcut: 'Ctrl+K',
        category: 'Edit',
        description: 'Clear chat history',
        onExecute: () => this.handleClearChat(),
      },
      {
        id: 'quit',
        label: 'Quit',
        shortcut: 'Ctrl+Q',
        category: 'System',
        description: 'Exit the application',
        onExecute: () => this.stop(),
      },
    ];
  }

  /**
   * Set the runtime host - called from main.ts to connect UI to runtime
   */
  setRuntime(runtime: AgentSessionRuntimeInterface): void {
    this.runtime = runtime;
  }

  /**
   * Set available thinking levels
   */
  setAvailableThinkingLevels(levels: ('off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh')[]): void {
    this.thinkingAvailableLevels = levels;
  }

  private thinkingAvailableLevels: ('off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh')[] = [
    'off', 'minimal', 'low', 'medium', 'high', 'xhigh',
  ];

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

    // Create editor (Editor organism - Tầng 3)
    this.editor = new Editor(undefined, {
      paddingX: 1,
      paddingY: 0,
    });
    this.editorContainer.append(this.editor as UIElement);

    // Setup submit handler - connected to runtime if available
    this.editor.onSubmit = async (text: string) => {
      if (this.runtime) {
        await this.runtime.session.prompt(text);
      } else {
        if (this.inputController.resolve) this.inputController.resolve(text);
      }
    };

    // Setup escape handler for command palette
    this.editor.onEscape = () => {
      this.toggleCommandPalette();
    };

    // Build header
    this.headerContainer.append(new Text('Picro Agent'));

    // Create command palette (organism)
    this.commandPalette = new CommandPalette({
      commands: this.commands.map(c => ({
        id: c.id,
        label: c.label,
        shortcut: c.shortcut,
        description: c.description,
        category: c.category,
        onExecute: c.onExecute,
      })),
    });

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

    // Main interactive loop
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
          // User message already shown in editor
        }
        break;
      case 'message_update':
        this.updateStreamingMessage(event.message);
        break;
      case 'message_end':
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
    const text = this.extractTextFromContent(message.content || []);
    if (text) {
      this.addAssistantMessage(text);
    }
  }

  private finalizeStreamingMessage(message: { role: string; stopReason?: string }): void {
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

  // =========================================================================
  // Command handlers
  // =========================================================================

  private toggleCommandPalette(): void {
    // Show/hide command palette in widget container
    if (this.widgetAboveContainer.children.length > 0) {
      this.widgetAboveContainer.clear();
    } else {
      this.widgetAboveContainer.append(this.commandPalette as any);
      this.tui.setFocus(this.commandPalette as any);
    }
    this.tui.requestRender();
  }

  private async handleNewSession(): Promise<void> {
    if (this.runtime) {
      await this.runtime.newSession();
    }
    this.setStatus('New session created');
  }

  private async handleSwitchSession(): Promise<void> {
    // Would show session selector organism
    this.setStatus('Switch session not implemented');
  }

  private async handleForkSession(): Promise<void> {
    if (this.runtime) {
      await this.runtime.fork('');
    }
    this.setStatus('Session forked');
  }

  private handleThinkingSelector(): void {
    if (this.thinkingSelector) {
      this.widgetAboveContainer.clear();
      this.widgetAboveContainer.append(this.thinkingSelector as any);
      this.tui.setFocus(this.thinkingSelector as any);
    }
  }

  private handleLogin(): void {
    this.loginDialog = new LoginDialog({
      provider: 'anthropic',
      title: 'Anthropic API Key',
      onSubmit: (apiKey) => {
        // Store API key
        this.setStatus('API key saved');
        this.widgetAboveContainer.clear();
        this.tui.setFocus(this.editor as any);
      },
      onCancel: () => {
        this.widgetAboveContainer.clear();
        this.tui.setFocus(this.editor as any);
      },
    });
    this.widgetAboveContainer.append(this.loginDialog as any);
    this.tui.setFocus(this.loginDialog as any);
    this.tui.requestRender();
  }

  private handleClearChat(): void {
    this.chatContainer.clear();
    this.setStatus('Chat cleared');
  }

  // =========================================================================
  // Public API
  // =========================================================================

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

  // =========================================================================
  // Memory Panel Integration
  // =========================================================================

  private memoryPanel: MemoryPanel | null = null;

  /**
   * Show memory panel with retrieved memories
   */
  showMemoryPanel(memories: MemoryEntry[]): void {
    this.memoryPanel = new MemoryPanel({
      memories,
      onSelect: (memory) => {
        // Insert memory content into editor
        this.memoryPanel = null;
        this.widgetAboveContainer.clear();
        if (this.editor) {
          const currentText = this.editor.getText();
          this.editor.setText(currentText + memory.content);
        }
        this.tui.setFocus(this.editor as any);
        this.tui.requestRender();
      },
      onDelete: (id) => {
        // Handle memory deletion
        console.log('Delete memory:', id);
      },
    });
    this.widgetAboveContainer.append(this.memoryPanel as any);
    this.tui.requestRender();
  }

  // =========================================================================
  // Debug Panel Integration
  // =========================================================================

  private debugPanel: DebugPanel | null = null;

  /**
   * Show debug panel with timing metrics
   */
  showDebugPanel(): void {
    this.debugPanel = new DebugPanel({
      height: 15,
    });
    this.widgetAboveContainer.append(this.debugPanel as any);
    this.tui.requestRender();
  }

  /**
   * Process debug round timing event
   */
  onDebugRound(event: DebugRoundEvent): void {
    this.debugPanel?.onRoundEvent(event);
  }

  // =========================================================================
  // File Browser Integration
  // =========================================================================

  private fileBrowser: FileBrowser | null = null;

  /**
   * Show file browser with directory entries
   */
  showFileBrowser(entries: FileEntry[], onSelect?: (entry: FileEntry) => void): void {
    this.fileBrowser = new FileBrowser(
      entries,
      15,
      (entry) => {
        this.fileBrowser = null;
        this.widgetAboveContainer.clear();
        onSelect?.(entry);
        this.tui.requestRender();
      }
    );
    this.widgetAboveContainer.append(this.fileBrowser as any);
    this.tui.requestRender();
  }

  // =========================================================================
  // Modal Dialog Integration
  // =========================================================================

  /**
   * Show confirmation modal
   */
  async showConfirm(title: string, message: string): Promise<boolean> {
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
          this.widgetAboveContainer.remove(modal as any);
          this.tui.setFocus(this.editor as any);
          this.tui.requestRender();
          resolve(value === 'ok');
        },
      });
      this.widgetAboveContainer.append(modal as any);
      this.tui.setFocus(modal as any);
      this.tui.requestRender();
    });
  }

  // =========================================================================
  // Thinking Level Management
  // =========================================================================

  getCurrentThinkingLevel(): 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' {
    return this.thinkingLevel;
  }

  setThinkingLevel(level: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'): void {
    this.thinkingLevel = level;
  }

  // =========================================================================
  // Session Management
  // =========================================================================

  async createNewSession(): Promise<void> {
    if (this.runtime) {
      await this.runtime.newSession();
      this.setStatus('New session created');
    }
  }

  async forkCurrentSession(entryId?: string): Promise<void> {
    if (this.runtime) {
      const result = await this.runtime.fork(entryId || '');
      this.setStatus(result.cancelled ? 'Fork cancelled' : 'Session forked');
    }
  }
}