// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode - Full AI Chat Interface
 *
 * Reference: packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts
 * (Clean-room implementation)
 */

import type { UIElement, RenderContext, InteractiveElement, KeyEvent } from './core/base';
import type { TerminalUI } from './tui';
import { ElementContainer } from './core/base';
import { Footer } from './molecules/footer';
import { UserMessage } from './molecules/user-message';
import { AssistantMessage } from './molecules/assistant-message';
import { ToolMessage } from './molecules/tool-message';
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
import { createExtensionUIContext } from './extension-ui-context';
import { ToolExecutionMessage } from './molecules/tool-execution';
import type { ExtensionUIHandler } from './extension-ui-context.impl';
import type { ExtensionWidgetOptions, ExtensionUIDialogOptions } from './extension-ui-context';
import type { AutocompleteProvider } from './core/autocomplete';

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
 * Slash command definition
 */
export interface SlashCommand {
  name: string;
  description: string;
  usage?: string;
  execute(args: string, mode: InteractiveMode): void | Promise<void>;
}

/**
 * InteractiveMode is a self-contained UI component that renders the full chat interface.
 * It extends ElementContainer for composition.
 */
export class InteractiveMode extends ElementContainer implements InteractiveElement, ExtensionUIHandler {
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

  // Editor - using Editor organism (Tầng 3)
  private editor: Editor | null = null;

  // Login dialog (organism)
  private loginDialog: LoginDialog | null = null;

  // Thinking selector (organism)
  private thinkingSelector: ThinkingSelector | null = null;

  // Command palette (organism)
  private commandPalette: CommandPalette | null = null;
  private commands: InteractiveModeCommand[] = [];

  // Footer management
  private footerContainer = new ElementContainer();
  private defaultFooter?: Footer;

  // Expose container getters for extensions
  getHeaderContainer(): ElementContainer { return this.headerContainer; }
  getFooterContainer(): ElementContainer { return this.footerContainer; }
  getWidgetAboveContainer(): ElementContainer { return this.widgetAboveContainer; }
  getWidgetBelowContainer(): ElementContainer { return this.widgetBelowContainer; }
  getEditor(): Editor | null { return this.editor; }

  // TUI reference
  private tui: TerminalUI;

  // Options
  private options: InteractiveModeOptions;

  // Extension UI Context
  private extensionUIContext?: ReturnType<typeof createExtensionUIContext>;

  // Input promise controller
  private inputController: { resolve?: (value: string) => void; reject?: (reason?: any) => void } = {};

  // Tool execution tracking: toolCallId -> ToolExecutionMessage component
  private pendingTools = new Map<string, ToolExecutionMessage>();
  private toolCallIdToName = new Map<string, string>();

  // Widget management
  private widgetMap = new Map<string, UIElement>();
  // Tool execution expansion control
  private toolsExpanded = false;
  private allToolExecutions = new Set<ToolExecutionMessage>();
  // Autocomplete providers
  private autocompleteProviders: AutocompleteProvider[] = [];
  // Model cycle support
  private models: string[] = ['claude-3-opus', 'claude-3-sonnet', 'gpt-4'];
  private currentModelIndex = 0;

  // Slash commands
  private slashCommands: SlashCommand[] = [];

  // Streaming assistant message
  private streamingAssistantMessage: AssistantMessage | null = null;

  constructor(tui: TerminalUI, options: InteractiveModeOptions = {}) {
    super();
    this.tui = tui;
    this.options = options;

    // Setup default commands
    this.setupDefaultCommands();
    // Setup slash commands
    this.setupSlashCommands();

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
        id: 'share-chat',
        label: 'Share Chat',
        shortcut: 'Ctrl+Shift+S',
        category: 'Edit',
        description: 'Copy chat history to clipboard',
        onExecute: () => this.handleShareChat(),
      },
      {
        id: 'edit-external',
        label: 'Edit in External Editor',
        shortcut: 'Ctrl+E',
        category: 'Edit',
        description: 'Open current input in $EDITOR',
        onExecute: () => this.handleEditExternal(),
      },
      {
        id: 'toggle-memory-leak-detection',
        label: 'Toggle Memory Leak Detection',
        shortcut: 'Ctrl+Shift+M',
        category: 'Debug',
        description: 'Enable/disable memory leak tracking',
        onExecute: () => this.handleToggleMemoryLeakDetection(),
      },
      {
        id: 'cycle-thinking',
        label: 'Cycle Thinking Level',
        shortcut: 'Ctrl+Alt+T',
        category: 'Agent',
        description: 'Cycle through thinking levels',
        onExecute: () => this.handleCycleThinkingLevel(),
      },
      {
        id: 'cycle-model',
        label: 'Cycle Model',
        shortcut: 'Ctrl+M',
        category: 'System',
        description: 'Switch to next AI model',
        onExecute: () => this.handleCycleModel(),
      },
      {
        id: 'about',
        label: 'About',
        shortcut: 'Ctrl+A',
        category: 'Help',
        description: 'Show application version and environment',
        onExecute: () => this.handleAbout(),
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
   * Set up slash commands
   */
  private setupSlashCommands(): void {
    // /clear
    this.registerSlashCommand({
      name: 'clear',
      description: 'Clear chat history',
      usage: '/clear',
      execute: () => { this.handleClearChat(); },
    });
    // /share
    this.registerSlashCommand({
      name: 'share',
      description: 'Copy chat history to clipboard',
      usage: '/share',
      execute: () => { this.handleShareChat(); },
    });
    // /edit (external editor)
    this.registerSlashCommand({
      name: 'edit',
      description: 'Open current input in external editor',
      usage: '/edit',
      execute: () => { this.handleEditExternal(); },
    });
    // /quit
    this.registerSlashCommand({
      name: 'quit',
      description: 'Quit the application',
      usage: '/quit',
      execute: () => { this.stop(); },
    });
    // /new
    this.registerSlashCommand({
      name: 'new',
      description: 'Start a new chat session',
      usage: '/new',
      execute: () => { this.handleNewSession(); },
    });
    // /thinking (opens selector)
    this.registerSlashCommand({
      name: 'thinking',
      description: 'Select thinking level',
      usage: '/thinking',
      execute: () => { this.handleThinkingSelector(); },
    });
    // /login
    this.registerSlashCommand({
      name: 'login',
      description: 'Set API key',
      usage: '/login',
      execute: () => { this.handleLogin(); },
    });
    // /help
    this.registerSlashCommand({
      name: 'help',
      description: 'Show available slash commands',
      usage: '/help',
      execute: () => {
        const lines = this.slashCommands.map(c => (c.usage || '/' + c.name) + ': ' + c.description);
        this.setStatus(lines.join('; '));
      },
    });
  }

  private registerSlashCommand(cmd: SlashCommand): void {
    this.slashCommands.push(cmd);
  }

  private handleSlashCommand(text: string): void {
    const parts = text.trim().split(/\s+/);
    const cmdName = parts[0].substring(1).toLowerCase(); // remove leading slash
    const args = parts.slice(1).join(' ');
    const cmd = this.slashCommands.find(c => c.name === cmdName);
    if (!cmd) {
      this.setStatus(`Unknown command: /${cmdName}. Type /help`);
      return;
    }
    try {
      const result = cmd.execute(args, this);
      if (result instanceof Promise) {
        result.catch((err: any) => {
          this.setStatus(`Error: ${err.message}`);
        });
      }
    } catch (err: any) {
      this.setStatus(`Error: ${err.message}`);
    }
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

  // =========================================================================
  // Extension UI Context
  // =========================================================================

  /**
   * Get the Extension UIContext for this interactive mode.
   * Creates on first access.
   */
  getExtensionUIContext(): ReturnType<typeof createExtensionUIContext> {
    if (!this.extensionUIContext) {
      this.extensionUIContext = createExtensionUIContext(this.tui, this);
    }
    return this.extensionUIContext;
  }

  /** Set the Extension UIContext externally (for testing) */
  setExtensionUIContext(context: ReturnType<typeof createExtensionUIContext>): void {
    this.extensionUIContext = context;
  }

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
      tui: this.tui,
    });
    // Initialize autocomplete providers
    this.editor.setAutocompleteProviders(this.autocompleteProviders);
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

    // Create default footer
    this.defaultFooter = new Footer({});
    this.footerContainer.append(this.defaultFooter);

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
    this.tui.showPanel(this.footerContainer as UIElement, {
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
          // Slash command handling
          if (text.startsWith('/')) {
            this.handleSlashCommand(text);
            if (this.editor) {
              this.editor.setText('');
            }
            continue;
          }
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
        if (event.message.role === 'assistant') {
          // Create a new streaming assistant message
          if (this.streamingAssistantMessage) {
            this.chatContainer.remove(this.streamingAssistantMessage);
          }
          this.streamingAssistantMessage = new AssistantMessage({});
          this.chatContainer.append(this.streamingAssistantMessage);
        }
        break;
      case 'message_update':
        if (this.streamingAssistantMessage && event.message.role === 'assistant') {
          const newText = this.extractTextFromContent(event.message.content || []);
          if (newText) {
            const current = this.streamingAssistantMessage.getContent();
            this.streamingAssistantMessage.setContent(current + newText);
            this.tui.requestRender();
          }
        }
        break;
      case 'message_end':
        if (event.message.role === 'assistant') {
          if (event.message.stopReason === 'error') {
            this.showError('Agent error occurred');
          }
          this.streamingAssistantMessage = null;
        }
        break;
      case 'tool_execution_start':
        // Create a ToolExecutionMessage component if not exists
        let toolComp = this.pendingTools.get(event.toolCallId);
        if (!toolComp) {
          toolComp = new ToolExecutionMessage();
          this.chatContainer.append(toolComp);
          this.pendingTools.set(event.toolCallId, toolComp);
        }
        // Store tool name for later updates
        this.toolCallIdToName.set(event.toolCallId, event.toolName);
        toolComp.addToolCall({
          name: event.toolName,
          status: 'running',
          args: event.args,
          startTime: Date.now(),
        });
        this.allToolExecutions.add(toolComp);
        if (this.toolsExpanded) {
          toolComp.setExpanded(true);
        }
        this.tui.requestRender();
        break;
      case 'tool_execution_update':
        toolComp = this.pendingTools.get(event.toolCallId);
        if (toolComp) {
          const toolName = this.toolCallIdToName.get(event.toolCallId) || 'Unknown';
          if (event.partialResult !== undefined) {
            const resultStr = JSON.stringify(event.partialResult, null, 2);
            toolComp.updateTool(toolName, { output: resultStr });
            this.tui.requestRender();
          }
        }
        break;
      case 'tool_execution_end':
        toolComp = this.pendingTools.get(event.toolCallId);
        if (toolComp) {
          const toolName = this.toolCallIdToName.get(event.toolCallId) || 'Unknown';
          const outputStr = JSON.stringify(event.result, null, 2);
          toolComp.updateTool(toolName, {
            status: event.isError ? 'error' : 'success',
            output: outputStr,
            error: event.isError ? String(event.result) : undefined,
          });
          this.pendingTools.delete(event.toolCallId);
          this.toolCallIdToName.delete(event.toolCallId);
          this.tui.requestRender();
        }
        break;
      case 'agent_start':
        this.setStatus('Processing...');
        break;
      case 'agent_end':
        this.statusContainer.clear();
        break;
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
    this.pendingTools.clear();
    this.allToolExecutions.clear();
    this.toolCallIdToName.clear();
    this.setStatus('Chat cleared');
  }

  private handleShareChat(): void {
    const text = this.exportChat();
    this.copyToClipboard(text);
    this.setStatus('Chat copied to clipboard');
  }

  private handleEditExternal(): void {
    const editorText = this.editor?.getText() ?? '';
    const fs = require('node:fs');
    const cp = require('node:child_process');
    const path = require('node:path');

    try {
      // Create temp file
      const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
      const dir = fs.mkdtempSync(path.join(tmpDir, 'picro-'));
      const filePath = path.join(dir, 'edit.txt');
      fs.writeFileSync(filePath, editorText);

      // Determine editor
      const editor = process.env.EDITOR || 'vi';
      cp.spawnSync(editor, [filePath], { stdio: 'inherit' });

      // Read back
      const newText = fs.readFileSync(filePath, 'utf-8');
      if (this.editor) {
        this.editor.setText(newText);
        this.setStatus('Editor updated');
      }

      // Cleanup
      fs.unlinkSync(filePath);
      fs.rmdirSync(dir);
    } catch (err: any) {
      this.setStatus(`Edit error: ${err.message}`);
    }
  }

  private handleToggleMemoryLeakDetection(): void {
    const tuiAny = this.tui as any;
    const currentlyEnabled = tuiAny.getMemoryLeakDetection?.() ?? false;
    const newEnabled = !currentlyEnabled;
    tuiAny.setMemoryLeakDetection?.(newEnabled);
    if (newEnabled) {
      const stats = tuiAny.getMemoryLeakStats?.() ?? { created: 0, destroyed: 0 };
      this.setStatus(`MemLeak: ON (+${stats.created}/${stats.destroyed})`);
    } else {
      tuiAny.resetMemoryLeakStats?.();
      this.setStatus('MemLeak: OFF');
    }
  }

  private handleCycleThinkingLevel(): void {
    if (this.thinkingAvailableLevels.length === 0) {
      this.setStatus('No thinking levels');
      return;
    }
    const currentIndex = this.thinkingAvailableLevels.indexOf(this.thinkingLevel);
    const nextIndex = (currentIndex + 1) % this.thinkingAvailableLevels.length;
    const nextLevel = this.thinkingAvailableLevels[nextIndex];
    this.setThinkingLevel(nextLevel);
    this.setStatus(`Thinking level: ${nextLevel}`);
  }

  private handleCycleModel(): void {
    if (this.models.length === 0) {
      this.setStatus('No models configured');
      return;
    }
    this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
    const model = this.models[this.currentModelIndex];
    this.setStatus(`Model: ${model}`);
  }

  private handleAbout(): void {
    try {
      const fs = require('node:fs');
      const path = require('node:path');
      const pkgPath = path.join(process.cwd(), 'package.json');
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const { name, version } = JSON.parse(raw);
      const nodeVersion = process.version;
      this.setStatus(`${name} v${version} (Node ${nodeVersion})`);
    } catch (e: any) {
      this.setStatus('Version info unavailable');
    }
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
    super.clearCache();
  }

  handleKey?(event: KeyEvent): void {
    // Global shortcut: 'e' to toggle tool output expansion
    if ((event.name === 'e' || event.raw === 'e') && !event.modifiers?.ctrl && !event.modifiers?.alt && !event.modifiers?.meta) {
      if (this.allToolExecutions.size > 0 || this.pendingTools.size > 0) {
        this.setToolsExpanded(!this.toolsExpanded);
        this.setStatus(this.toolsExpanded ? 'Tools collapsed' : 'Tools expanded');
        return; // consume
      }
    }
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

  setStatus(text: string): void;
  setStatus(key: string, text: string): void;
  setStatus(arg1: string, arg2?: string): void {
    if (arg2 === undefined) {
      this.statusContainer.clear();
      this.statusContainer.append(new Text(arg1));
      this.tui.requestRender();
    } else {
      this.defaultFooter?.setStatus(arg1, arg2);
      this.tui.requestRender();
    }
  }

  showError(text: string): void {
    this.statusContainer.clear();
    this.statusContainer.append(new Text(`Error: ${text}`));
    this.tui.requestRender();
  }

  setRightItems(_items: unknown[]): void {}

  setWidget(key: string, content: string[] | UIElement | null, options?: { placement?: 'aboveEditor' | 'belowEditor' } | ExtensionWidgetOptions): void {
    // Determine placement
    let placement: 'aboveEditor' | 'belowEditor' = 'aboveEditor';
    if (options && typeof options === 'object' && 'placement' in options) {
      placement = (options as any).placement;
    }
    const container = placement === 'belowEditor' ? this.widgetBelowContainer : this.widgetAboveContainer;

    // Convert content to UIElement if needed
    let element: UIElement | null = null;
    if (content !== null) {
      if (Array.isArray(content)) {
        element = new Text(content.join('\n'));
      } else {
        element = content;
      }
    }

    // Remove existing widget with same key
    const existing = this.widgetMap.get(key);
    if (existing) {
      if (this.widgetAboveContainer.children.includes(existing)) {
        this.widgetAboveContainer.remove(existing);
      } else if (this.widgetBelowContainer.children.includes(existing)) {
        this.widgetBelowContainer.remove(existing);
      }
      this.widgetMap.delete(key);
    }

    if (element !== null) {
      container.append(element);
      this.widgetMap.set(key, element);
    }
    this.tui.requestRender();
  }

  setHeader(component: UIElement | null): void;
  setHeader(factory: () => UIElement | null): void;
  setHeader(arg: UIElement | null | (() => UIElement | null)): void {
    let comp: UIElement | null;
    if (typeof arg === 'function') {
      comp = arg();
    } else {
      comp = arg;
    }
    this.headerContainer.clear();
    if (comp) this.headerContainer.append(comp);
    this.tui.requestRender();
  }



  // ==================== ExtensionUIHandler Implementation ====================

  setWorkingMessage(message: string | null): void {
    this.defaultFooter?.setWorkingMessage(message);
    this.tui.requestRender();
  }

  setWorkingIndicator(options: { message?: string; show?: boolean }): void {
    if (options.show === false) {
      this.defaultFooter?.setWorkingMessage(null);
    } else if (options.message !== undefined) {
      this.defaultFooter?.setWorkingMessage(options.message);
    }
    this.tui.requestRender();
  }

  setFooter(factory: () => UIElement | null): void {
    this.footerContainer.clear();
    const comp = factory();
    if (comp) {
      this.footerContainer.append(comp);
      this.defaultFooter = undefined;
    }
    this.tui.requestRender();
  }

  showEditorDialog(title?: string, prefill?: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      const editor = new Editor({ paddingX: 1, paddingY: 0 });
      editor.setText(prefill ?? '');
      const modal = new Modal({
        title: title ?? '',
        content: editor,
        type: 'info',
        buttons: [
          { label: 'Cancel', value: 'cancel' },
          { label: 'OK', value: 'ok', primary: true },
        ],
        onResult: (value) => {
          this.widgetAboveContainer.remove(modal);
          if (value === 'ok') {
            resolve(editor.getText());
          } else {
            resolve(undefined);
          }
        },
        onCancel: () => {
          this.widgetAboveContainer.remove(modal);
          resolve(undefined);
        },
      });
      this.widgetAboveContainer.append(modal);
      this.tui.setFocus(modal);
    });
  }

  getEditorText(): string {
    return this.editor?.getText() ?? '';
  }

  setEditorText(text: string): void {
    this.editor?.setText(text);
  }

  pasteToEditor(text: string): void {
    this.editor?.insertText(text);
  }

  setEditorComponent(factory: (tui: TerminalUI) => UIElement | null): void {
    this.editorContainer.clear();
    const comp = factory(this.tui);
    if (comp) {
      this.editorContainer.append(comp);
    }
    this.tui.requestRender();
  }

  addAutocompleteProvider(factory: () => AutocompleteProvider): void {
    this.autocompleteProviders.push(factory());
    this.editor?.setAutocompleteProviders([...this.autocompleteProviders]);
  }

  showCustomDialog(factory: (tui: TerminalUI) => UIElement, options?: ExtensionUIDialogOptions): Promise<void> {
    return new Promise((resolve) => {
      const element = factory(this.tui);
      const modal = new Modal({
        title: 'Dialog',
        content: element,
        type: 'custom',
        buttons: [
          { label: 'Close', value: 'close', primary: true },
        ],
        onResult: () => {
          this.widgetAboveContainer.remove(modal);
          resolve();
        },
        onCancel: () => {
          this.widgetAboveContainer.remove(modal);
          resolve();
        },
      });
      this.widgetAboveContainer.append(modal);
      this.tui.setFocus(modal);
      if (options?.timeout) {
        setTimeout(() => {
          if (this.widgetAboveContainer.children.includes(modal)) {
            this.widgetAboveContainer.remove(modal);
            resolve();
          }
        }, options.timeout);
      }
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          if (this.widgetAboveContainer.children.includes(modal)) {
            this.widgetAboveContainer.remove(modal);
          }
        });
      }
    });
  }

  getToolsExpanded(): boolean {
    return this.toolsExpanded;
  }

  setToolsExpanded(expanded: boolean): void {
    if (this.toolsExpanded !== expanded) {
      this.toolsExpanded = expanded;
      for (const comp of this.allToolExecutions) {
        comp.setExpanded(expanded);
      }
      this.tui.requestRender();
    }
  }

  setCompactionCount(count: number): void {
    if (count > 0) {
      this.defaultFooter?.setStatus('compaction', `Compacted: ${count} msg`);
    } else {
      this.defaultFooter?.clearStatus('compaction');
    }
    this.tui.requestRender();
  }

  setTitle(title: string): void {
    if (this.tui.terminal.setTitle) {
      this.tui.terminal.setTitle(title);
    } else if (process.title) {
      process.title = title;
    }
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
   * Register a single extension command
   */
  registerCommand(command: InteractiveModeCommand): void {
    this.registerCommands([command]);
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