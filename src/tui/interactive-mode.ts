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
import { MemoryPanel, type MemoryEntry } from './molecules/memory-panel';
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
    // editorContainer is shown as a fixed bottom panel (see init)
    super.append(this.widgetBelowContainer);
    // footer is shown as a fixed bottom panel (see init)
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    // DEBUG
    if (process.env.VERBOSE) console.log('InteractiveMode: init()');

    // Create editor (Editor organism - Tầng 3)
    this.editor = new Editor({
      paddingX: 1,
      paddingY: 0,
    });
    this.editorContainer.append(this.editor as UIElement);

    // Setup submit handler - resolves input promise to unblock getUserInput
    this.editor.onSubmit = (text: string) => {
      // Always resolve the pending input promise
      if (this.inputController.resolve) {
        this.inputController.resolve(text);
      }
      // Clear the controller to allow next input
      this.inputController = {};
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

    // Show editor and footer as fixed bottom panels
    this.tui.showPanel(this.editorContainer as UIElement, {
      anchor: 'bottom-left',
      width: '100%',
      height: 1,
    });
    this.tui.showPanel(this.footer, {
      anchor: 'bottom-left',
      offsetY: -1,
      width: '100%',
      height: 1,
    });

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
          // Show user message in chat
          this.addUserMessage(text);
          // Clear editor for next input
          if (this.editor) {
            this.editor.setText('');
          }
          // Send to agent
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

  public handleThinkingSelector(): void {
    if (!this.thinkingSelector) {
      this.thinkingSelector = new ThinkingSelector({
        availableLevels: this.thinkingAvailableLevels,
        currentLevel: this.thinkingLevel,
        onSelect: (level) => {
          this.thinkingLevel = level;
          this.setStatus(`Thinking level set to ${level}`);
        },
        onCancel: () => {
          this.widgetAboveContainer.clear();
          this.tui.setFocus(this.editor as any);
        },
      });
    }
    this.tui.showPanel(this.thinkingSelector as any);
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

  public handleCommandPalette(): void {
    if (!this.commandPalette) {
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
    }
    this.tui.showPanel(this.commandPalette as any);
  }

  private handleClearChat(): void {
    this.chatContainer.clear();
    this.setStatus('Chat cleared');
  }

  // =========================================================================
  // Public API
  // =========================================================================

  draw(context: RenderContext): string[] {
    const result = super.draw(context);
    if (process.env.VERBOSE) console.log('InteractiveMode.draw: total lines =', result.length);
    return result;
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
      onSelect: (memory: MemoryEntry) => {
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
      onDelete: (id: string) => {
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

  // =========================================================================
  // Advanced Features
  // =========================================================================

  // Agent state tracking
  private agentState: 'idle' | 'running' | 'paused' | 'error' = 'idle';

  /**
   * Get current agent state
   */
  getAgentState(): 'idle' | 'running' | 'paused' | 'error' {
    return this.agentState;
  }

  /**
   * Set agent state
   */
  setAgentState(state: 'idle' | 'running' | 'paused' | 'error'): void {
    this.agentState = state;
    switch (state) {
      case 'running':
        this.setStatus('Processing...');
        break;
      case 'paused':
        this.setStatus('Paused');
        break;
      case 'error':
        this.setStatus('Error');
        break;
      case 'idle':
        this.statusContainer.clear();
        break;
    }
  }

  // Pending indicator for async operations
  private pendingOperations: Map<string, { label: string; progress?: number }> = new Map();

  /**
   * Add pending operation indicator
   */
  addPendingOperation(id: string, label: string): void {
    this.pendingOperations.set(id, { label });
    this.updatePendingDisplay();
  }

  /**
   * Update pending operation progress
   */
  updatePendingProgress(id: string, progress: number): void {
    const op = this.pendingOperations.get(id);
    if (op) {
      op.progress = progress;
      this.updatePendingDisplay();
    }
  }

  /**
   * Remove pending operation
   */
  removePendingOperation(id: string): void {
    this.pendingOperations.delete(id);
    this.updatePendingDisplay();
  }

  private updatePendingDisplay(): void {
    if (this.pendingOperations.size === 0) {
      this.pendingContainer.clear();
      return;
    }

    this.pendingContainer.clear();
    for (const [id, op] of this.pendingOperations) {
      const label = op.progress !== undefined ? `${op.label} (${op.progress}%)` : op.label;
      this.pendingContainer.append(new Text(`⏳ ${label}`) as UIElement);
    }
    this.tui.requestRender();
  }

  // =========================================================================
  // Extension Points
  // =========================================================================

  /**
   * Register extension commands
   */
  registerCommands(commands: InteractiveModeCommand[]): void {
    this.commands.push(...commands);
    if (this.commandPalette) {
      this.commandPalette.setCommands(this.commands.map(c => ({
        id: c.id,
        label: c.label,
        shortcut: c.shortcut,
        description: c.description,
        category: c.category,
        onExecute: c.onExecute,
      })));
    }
  }

  /**
   * Focus editor programmatically
   */
  focusEditor(): void {
    if (this.editor) {
      this.tui.setFocus(this.editor as UIElement);
    }
  }

  /**
   * Focus chat container
   */
  focusChat(): void {
    if (this.chatContainer.children.length > 0) {
      const lastChild = this.chatContainer.children[this.chatContainer.children.length - 1];
      if (lastChild) {
        this.tui.setFocus(lastChild as UIElement);
      }
    }
  }

  // =========================================================================
  // Multi-Session Support
  // =========================================================================

  /**
   * Export chat history
   */
  exportChat(): string {
    const lines: string[] = [];
    for (const child of this.chatContainer.children) {
      if (child instanceof UserMessage) {
        lines.push(`User: ${(child as any).opts?.text || ''}`);
      } else if (child instanceof AssistantMessage) {
        lines.push(`Assistant: ${(child as any).opts?.content || ''}`);
      } else if (child instanceof ToolMessage) {
        lines.push(`Tool: ${(child as any).opts?.toolName || ''}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Clear all chat history
   */
  clearAllHistory(): void {
    this.chatContainer.clear();
    this.setStatus('History cleared');
  }

  // =========================================================================
  // Keyboard Shortcuts & Key Bindings
  // =========================================================================

  private keybindings: Map<string, () => void> = new Map();

  /**
   * Register a keyboard shortcut
   */
  registerKeybinding(key: string, handler: () => void): void {
    this.keybindings.set(key, handler);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterKeybinding(key: string): void {
    this.keybindings.delete(key);
  }

  // =========================================================================
  // History Navigation
  // =========================================================================

  private messageHistory: string[] = [];
  private historyIndex: number = -1;

  /**
   * Add to message history
   */
  pushHistory(text: string): void {
    this.messageHistory.push(text);
    // Keep last 100 messages
    if (this.messageHistory.length > 100) {
      this.messageHistory.shift();
    }
    this.historyIndex = this.messageHistory.length;
  }

  /**
   * Navigate up in history
   */
  navigateHistoryUp(): string | undefined {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.messageHistory[this.historyIndex];
    }
    return undefined;
  }

  /**
   * Navigate down in history
   */
  navigateHistoryDown(): string | undefined {
    if (this.historyIndex < this.messageHistory.length - 1) {
      this.historyIndex++;
      return this.messageHistory[this.historyIndex];
    }
    this.historyIndex = this.messageHistory.length;
    return '';
  }

  // =========================================================================
  // Tool Execution Widgets
  // =========================================================================

  private toolWidgets: Map<string, UIElement> = new Map();

  /**
   * Add tool execution widget
   */
  addToolWidget(toolCallId: string, toolName: string, output: string): void {
    const widget = new ToolMessage({ toolName, output });
    this.toolWidgets.set(toolCallId, widget);
    this.chatContainer.append(widget as UIElement);
    this.tui.requestRender();
  }

  /**
   * Update tool widget output
   */
  updateToolWidget(toolCallId: string, output: string): void {
    const widget = this.toolWidgets.get(toolCallId);
    if (widget) {
      // Would need to find and update specific tool message
      this.tui.requestRender();
    }
  }

  /**
   * Remove tool widget
   */
  removeToolWidget(toolCallId: string): void {
    this.toolWidgets.delete(toolCallId);
  }

  // =========================================================================
  // Accessibility Support
  // =========================================================================

  /**
   * Get accessibility description of current state
   */
  getAccessibilityDescription(): string {
    const parts: string[] = [];
    
    if (this.chatContainer.children.length > 0) {
      parts.push(`${this.chatContainer.children.length} messages`);
    }
    
    if (this.agentState !== 'idle') {
      parts.push(`Status: ${this.agentState}`);
    }
    
    if (this.pendingOperations.size > 0) {
      parts.push(`${this.pendingOperations.size} pending operations`);
    }
    
    return parts.join(', ') || 'Ready';
  }

  // =========================================================================
  // Multi-Session Support
  // =========================================================================

  private sessions: Map<string, string[]> = new Map();
  private currentSessionId: string = 'default';

  /**
   * Get all session IDs
   */
  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get current session messages
   */
  getCurrentSessionMessages(): string[] {
    return this.sessions.get(this.currentSessionId) || [];
  }

  /**
   * Switch to session
   */
  switchSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.currentSessionId = sessionId;
    this.setStatus(`Switched to session: ${sessionId}`);
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = 'default';
    }
  }

  /**
   * Save current session
   */
  saveSession(sessionId: string, messages: string[]): void {
    this.sessions.set(sessionId, messages);
  }

  // =========================================================================
  // Notification System
  // =========================================================================

  private notifications: Array<{id: string; message: string; type: 'info' | 'warning' | 'error'; timestamp: number}> = [];

  /**
   * Show notification
   */
  showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const id = `notif-${Date.now()}`;
    this.notifications.push({
      id,
      message,
      type,
      timestamp: Date.now()
    });
    this.setStatus(message);
    // Auto-remove after 5 seconds
    setTimeout(() => this.removeNotification(id), 5000);
  }

  /**
   * Remove notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  /**
   * Get notifications
   */
  getNotifications() {
    return this.notifications;
  }

  // =========================================================================
  // Clipboard Support
  // =========================================================================

  private clipboard: string = '';

  /**
   * Copy to clipboard
   */
  copyToClipboard(text: string): void {
    this.clipboard = text;
  }

  /**
   * Paste from clipboard
   */
  pasteFromClipboard(): string {
    return this.clipboard;
  }

  /**
   * Cut to clipboard
   */
  cutToClipboard(text: string): string {
    this.clipboard = text;
    return '';
  }

  // =========================================================================
  // Search Functionality
  // =========================================================================

  private searchQuery: string = '';
  private searchResults: number[] = [];

  /**
   * Search in messages
   */
  searchMessages(query: string): number[] {
    this.searchQuery = query;
    this.searchResults = [];
    
    if (!query) return this.searchResults;
    
    for (let i = 0; i < this.chatContainer.children.length; i++) {
      const child = this.chatContainer.children[i];
      // Would search through message content
      this.searchResults.push(i);
    }
    
    return this.searchResults;
  }

  /**
   * Get search results
   */
  getSearchResults(): number[] {
    return this.searchResults;
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  // =========================================================================
  // Performance Metrics
  // =========================================================================

  private renderCount: number = 0;
  private lastRenderTime: number = 0;
  private totalRenderTime: number = 0;

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      renderCount: this.renderCount,
      averageRenderTime: this.renderCount > 0 ? this.totalRenderTime / this.renderCount : 0,
      lastRenderTime: this.lastRenderTime
    };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.renderCount = 0;
    this.lastRenderTime = 0;
    this.totalRenderTime = 0;
  }

  // =========================================================================
  // Theme Configuration
  // =========================================================================

  private currentTheme: 'dark' | 'light' = 'dark';
  private customColors: Record<string, string> = {};

  /**
   * Set theme
   */
  setTheme(theme: 'dark' | 'light'): void {
    this.currentTheme = theme;
  }

  /**
   * Get theme
   */
  getTheme(): 'dark' | 'light' {
    return this.currentTheme;
  }

  /**
   * Set custom color
   */
  setCustomColor(key: string, value: string): void {
    this.customColors[key] = value;
  }

  /**
   * Get custom color
   */
  getCustomColor(key: string): string | undefined {
    return this.customColors[key];
  }

  // =========================================================================
  // Mode Management
  // =========================================================================

  private modes: Map<string, UIElement> = new Map();
  private currentMode: string = 'default';

  /**
   * Register a mode
   */
  registerMode(name: string, component: UIElement): void {
    this.modes.set(name, component);
  }

  /**
   * Switch mode
   */
  switchMode(name: string): void {
    if (this.modes.has(name)) {
      this.currentMode = name;
      this.tui.requestRender();
    }
  }

  /**
   * Get current mode
   */
  getCurrentMode(): string {
    return this.currentMode;
  }

  // =========================================================================
  // Widget Management
  // =========================================================================

  private widgets: Map<string, UIElement> = new Map();

  /**
   * Add widget
   */
  addWidget(id: string, widget: UIElement, position: 'above' | 'below' = 'above'): void {
    this.widgets.set(id, widget);
    if (position === 'above') {
      this.widgetAboveContainer.append(widget);
    } else {
      this.widgetBelowContainer.append(widget);
    }
    this.tui.requestRender();
  }

  /**
   * Remove widget
   */
  removeWidget(id: string): void {
    const widget = this.widgets.get(id);
    if (widget) {
      this.widgetAboveContainer.remove(widget);
      this.widgetBelowContainer.remove(widget);
      this.widgets.delete(id);
      this.tui.requestRender();
    }
  }

  /**
   * Toggle widget visibility
   */
  toggleWidget(id: string): void {
    // Implementation would show/hide widget
    this.tui.requestRender();
  }

  // =========================================================================
  // Event Handling
  // =========================================================================

  private eventHandlers: Map<string, Array<() => void>> = new Map();

  /**
   * Subscribe to event
   */
  on(event: string, handler: () => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Emit event
   */
  emit(event: string): void {
    this.eventHandlers.get(event)?.forEach(h => h());
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  private config: Record<string, any> = {};

  /**
   * Set config value
   */
  setConfig(key: string, value: any): void {
    this.config[key] = value;
  }

  /**
   * Get config value
   */
  getConfig<T>(key: string, defaultValue?: T): T | undefined {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Reset config
   */
  resetConfig(): void {
    this.config = {};
  }

  // =========================================================================
  // Debug Features
  // =========================================================================

  private debugEnabled: boolean = false;
  private debugOutput: string[] = [];

  /**
   * Enable debug mode
   */
  enableDebug(): void {
    this.debugEnabled = true;
    this.showDebugPanel();
  }

  /**
   * Disable debug mode
   */
  disableDebug(): void {
    this.debugEnabled = false;
    this.widgetAboveContainer.clear();
  }

  /**
   * Log debug message
   */
  debug(message: string): void {
    if (this.debugEnabled) {
      this.debugOutput.push(message);
      this.emit('debug');
    }
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Center text in width
   */
  private centerPad(text: string, width: number): string {
    const diff = width - text.length;
    const padLeft = Math.floor(diff / 2);
    const padRight = diff - padLeft;
    return ' '.repeat(Math.max(0, padLeft)) + text + ' '.repeat(Math.max(0, padRight));
  }

  /**
   * Format milliseconds to human readable
   */
  private formatMs(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  /**
   * Truncate string
   */
  private truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max - 3) + '...';
  }

  /**
   * Pad right
   */
  private padRight(text: string, width: number): string {
    return text.length < width ? text + ' '.repeat(width - text.length) : text.substring(0, width);
  }

  // =========================================================================
  // Animation System
  // =========================================================================

  private animations: Map<string, { frames: string[][]; interval: number; startTime: number }> = new Map();
  private animationFrameId: number | null = null;

  /**
   * Register animation
   */
  registerAnimation(id: string, frames: string[][], fps: number = 30): void {
    const interval = 1000 / fps;
    this.animations.set(id, { frames, interval, startTime: Date.now() });
  }

  /**
   * Play animation
   */
  playAnimation(id: string): void {
    const anim = this.animations.get(id);
    if (anim) {
      let i = 0;
      const play = () => {
        if (i < anim.frames.length) {
          // Would update UI with frame
          i++;
          setTimeout(play, anim.interval);
        }
      };
      play();
    }
  }

  /**
   * Stop animation
   */
  stopAnimation(id: string): void {
    this.animations.delete(id);
  }

  // =========================================================================
  // History Navigation
  // =========================================================================

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistorySize: number = 100;

  /**
   * Push to undo history
   */
  pushUndoHistory(state: string): void {
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  /**
   * Undo
   */
  undo(): string | undefined {
    const state = this.undoStack.pop();
    if (state) {
      this.redoStack.push(state);
      return state;
    }
    return undefined;
  }

  /**
   * Redo
   */
  redo(): string | undefined {
    const state = this.redoStack.pop();
    if (state) {
      this.undoStack.push(state);
      return state;
    }
    return undefined;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  // =========================================================================
  // Clipboard Operations
  // =========================================================================

  private clipboardContent: string = '';
  private clipboardHistory: string[] = [];

  /**
   * Copy to clipboard
   */
  copy(text: string): void {
    this.clipboardContent = text;
    this.clipboardHistory.push(text);
    if (this.clipboardHistory.length > 10) {
      this.clipboardHistory.shift();
    }
  }

  /**
   * Paste from clipboard
   */
  paste(): string {
    return this.clipboardContent;
  }

  /**
   * Cut to clipboard
   */
  cut(text: string): string {
    this.clipboardContent = text;
    return '';
  }

  /**
   * Get clipboard history
   */
  getClipboardHistory(): string[] {
    return this.clipboardHistory;
  }

  // =========================================================================
  // Search Features
  // =========================================================================

  private searchIndex: Map<string, number[]> = new Map();

  /**
   * Index content for search
   */
  indexContent(content: string, id: string): void {
    const words = content.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, []);
      }
      this.searchIndex.get(word)!.push(parseInt(id));
    });
  }

  /**
   * Search indexed content
   */
  search(query: string): number[] {
    const words = query.toLowerCase().split(/\s+/);
    const results = new Map<number, number>();
    words.forEach(word => {
      const ids = this.searchIndex.get(word) || [];
      ids.forEach(id => {
        results.set(id, (results.get(id) || 0) + 1);
      });
    });
    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);
  }

  /**
   * Clear search index
   */
  clearSearchIndex(): void {
    this.searchIndex.clear();
  }

  // =========================================================================
  // Performance Monitoring
  // =========================================================================

  private performanceMarks: Map<string, number> = new Map();

  /**
   * Mark performance point
   */
  mark(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  /**
   * Measure between marks
   */
  measure(name: string, startMark: string, endMark: string): number | undefined {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);
    if (start !== undefined && end !== undefined) {
      return end - start;
    }
    return undefined;
  }

  /**
   * Clear marks
   */
  clearMarks(): void {
    this.performanceMarks.clear();
  }
}