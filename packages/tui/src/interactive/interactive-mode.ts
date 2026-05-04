/**
 * InteractiveMode - Full AI Chat Interface
 *
 * Top-level UI component that combines:
 * - Chat message display (user, assistant, tool, bash, summaries)
 * - Input editor with autocomplete, history, markdown support
 * - Status line, widgets, header, footer
 * - Modal selectors and dialogs
 * - Agent integration (optional runtimeHost)
 *
 * This is a UIElement that can be appended to TerminalUI.
 *
 * Reference: packages/tui/llm-context/tui-agent/modes/interactive/interactive-mode.ts
 */

import { TerminalUI } from './tui.js';
import type { UIElement, RenderContext, InteractiveElement } from './atoms/base.js';
import { ElementContainer } from './atoms/base.js';
import { Input } from './molecules/input.js';
import { Footer } from './atoms/footer.js';
import { UserMessage } from './atoms/user-message.js';
import { AssistantMessage } from './atoms/assistant-message.js';
import { ToolMessage } from './atoms/tool-message.js';
import { ToolExecutionMessage } from './atoms/tool-execution.js';
import { BashExecutionMessage } from './atoms/bash-execution-message.js';
import { BranchSummaryMessage } from './atoms/branch-summary-message.js';
import { CompactionSummaryMessage } from './atoms/compaction-summary-message.js';
import { CustomMessage } from './atoms/custom-message.js';
import { EarendilAnnouncement } from './atoms/earendil-announcement.js';
import { Daxnuts } from './atoms/daxnuts.js';
import { Armin } from './atoms/daxnuts.js';
import { Markdown } from './atoms/markdown.js';
import { Spacer, Text, TruncatedText, DynamicBorder } from './atoms/index.js';
import { Loader } from './atoms/progress-bar.js';
import { SettingsSelector } from './molecules/settings-selector.js';
import { ModelSelector } from './molecules/model-selector.js';
import { ScopedModelsSelector } from './molecules/scoped-models-selector.js';
import { SessionSelector } from './molecules/session-selector-search.js';
import { TreeSelector } from './molecules/tree-selector.js';
import { UserMessageSelector } from './molecules/user-message-selector.js';
import { ExtensionSelector } from './molecules/extension-selector.js';
import { ExtensionInput } from './molecules/extension-input.js';
import { ExtensionEditor } from './organisms/extension-editor.js';
import { LoginDialog } from './organisms/login-dialog.js';
import { ConfigSelector } from './molecules/config-selector.js';
import { CountdownTimer } from './molecules/countdown-timer.js';

import { getMarkdownTheme } from './theme/theme.js';

// Maximum widget lines
const MAX_WIDGET_LINES = 3;

export interface InteractiveModeOptions {
  tui: TerminalUI;
  runtimeHost?: any; // AgentSessionRuntime (avoid circular import)
  inputPlaceholder?: string;
  initialStatus?: string;
  initialMessage?: string;
  initialImages?: any[];
  initialMessages?: string[];
  verbose?: boolean;
}

/**
 * InteractiveMode is a self-contained UI component that renders the full chat interface.
 * It implements UIElement so it can be appended to TerminalUI.
 */
export class InteractiveMode implements UIElement, InteractiveElement {
  // Focus state
  public isFocused = false;

  // Containers (layout sections)
  private headerContainer = new ElementContainer();
  private chatContainer = new ElementContainer();
  private pendingContainer = new ElementContainer();
  private statusContainer = new ElementContainer();
  private widgetAboveContainer = new ElementContainer();
  private editorContainer = new ElementContainer();
  private widgetBelowContainer = new ElementContainer();
  private footerContainer = ElementContainer();

  // Editor
  private defaultEditor: Input;
  private editor: UIElement & InteractiveElement;
  private fdPath?: string;

  // Footer
  private footer: Footer;

  // TUI reference
  private tui: TerminalUI;

  // Agent integration (optional)
  private runtimeHost?: any;
  private session: any;
  private agent: any;
  private sessionManager: any;
  private settingsManager: any;
  private extensionRunner: any;
  private resourceLoader: any;
  private modelRegistry: any;

  // Options
  private options: InteractiveModeOptions;

  // State flags
  private isInitialized = false;
  private running = false;

  // UI state
  private builtInHeader: UIElement | null = null;
  private customHeader: UIElement | null = null;
  private customFooter: UIElement | null = null;
  private extensionWidgetsAbove = new Map<string, UIElement & { dispose?(): void }>();
  private extensionWidgetsBelow = new Map<string, UIElement & { dispose?(): void }>();
  private toolOutputExpanded = false;
  private hideThinkingBlock = false;
  private hiddenThinkingLabel = 'Thinking...';
  private isBashMode = false;
  private shutdownRequested = false;

  // Streaming & tool tracking
  private streamingComponent: UIElement | null = null;
  private streamingMessage: any = null;
  private pendingTools = new Map<string, UIElement>(); // toolCallId -> ToolExecutionMessage
  private pendingBashComponents: BashExecutionMessage[] = [];

  // Queues
  private compactionQueuedMessages: Array<{ text: string; mode: 'steer' | 'followUp' }> = [];

  // Loaders
  private loadingAnimation: any; // TODO: type as Loader?
  private autoCompactionLoader: any;
  private autoCompactionEscapeHandler?: () => void;
  private retryLoader: any;
  private retryCountdown: CountdownTimer | null = null;
  private retryEscapeHandler?: () => void;

  // Extension UI
  private extensionSelector: ExtensionSelector | null = null;
  private extensionInput: ExtensionInput | null = null;
  private extensionEditor: ExtensionEditor | null = null;
  private extensionTerminalInputUnsubscribers = new Set<() => void>();

  // Signals
  private signalCleanupHandlers: Array<() => void> = [];

  // Version & startup
  private version = '0.1.0';
  private changelogMarkdown?: string;
  private startupNoticesShown = false;
  private lastStatusSpacer: Spacer | null = null;
  private lastStatusText: Text | null = null;

  // Working indicator
  private workingMessage?: string;
  private workingVisible = true;
  private workingIndicatorOptions: any;
  private readonly defaultWorkingMessage = 'Working...';

  // Countdown timers
  private countdownTimers: CountdownTimer[] = [];

  // Extension context (created later)
  private extensionContext!: any;

  // Pending input resolver for getUserInput()
  private inputResolver?: (text: string) => void;

  constructor(options: InteractiveModeOptions) {
    this.options = options;
    this.tui = options.tui;
    this.runtimeHost = options.runtimeHost;

    // Extract session services if runtimeHost provided
    if (this.runtimeHost) {
      this.session = this.runtimeHost.session;
      this.agent = this.session.agent;
      this.sessionManager = this.session.sessionManager;
      this.settingsManager = this.session.settingsManager;
      this.extensionRunner = this.session.extensionRunner;
      this.resourceLoader = this.session.resourceLoader;
      this.modelRegistry = this.session.modelRegistry;
    }

    // Setup layout containers (they are children of this InteractiveMode)
    this.setupLayout();

    // Create default editor with autocomplete placeholder
    this.defaultEditor = new Input({
      placeholder: options.inputPlaceholder ?? 'Type a message... (Enter to send)',
      onSubmit: (value) => this.handleSubmit(value),
      onCancel: () => {
        // ESC pressed: custom behavior set via onEscape handler
      },
    });
    this.editor = this.defaultEditor;
    this.editorContainer.append(this.editor);

    // Create footer
    this.footer = new Footer({ leftItems: [], rightItems: [] });
    this.footerContainer.append(this.footer);

    // Create extension UI context (used by extensions)
    this.extensionContext = this.createExtensionUIContext();

    // If agent runtime provided, initialize agent integration
    if (this.runtimeHost) {
      this.init().catch(console.error);
    }
  }

  /**
   * Initialize agent integration: subscribe to events, setup key handlers, extensions.
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Register signal handlers (SIGTERM, SIGHUP)
    this.registerSignalHandlers();

    // Load changelog (reference reads from getChangelogPath())
    // TODO: implement

    // Setup key handlers (defaultEditor actions, global shortcuts)
    this.setupKeyHandlers();

    // Setup editor submit handler (slash commands, bash, etc.)
    this.setupEditorSubmitHandler();

    // Bind extensions (this will call bindCurrentSessionExtensions if runtimeHost)
    if (this.runtimeHost) {
      await this.rebindCurrentSession();
    }

    // Show loaded resources (skills, prompts, extensions, themes)
    if (this.runtimeHost) {
      this.showLoadedResources({ force: false, showDiagnosticsWhenQuiet: true });
    }

    // Set initial status
    if (this.options.initialStatus) {
      this.setStatus(this.options.initialStatus);
    }

    // Start version and package checks asynchronously (reference does this in run())
    // TODO: implement checkForNewVersion(), checkForPackageUpdates(), checkTmuxKeyboardSetup()
  }

  /**
   * Run the main interactive loop (blocking).
   * Only needed if InteractiveMode is the top-level app.
   * If embedding in another app, you can drive input manually.
   */
  async run(): Promise<void> {
    this.running = true;
    // Ensure tui is started
    this.tui.start();

    // Start version checks etc.
    // TODO

    // Main loop: get user input, forward to session
    while (this.running) {
      const text = await this.getUserInput();
      if (text && this.runtimeHost) {
        try {
          await this.session.prompt(text);
        } catch (e) {
          this.showError(e instanceof Error ? e.message : String(e));
        }
      }
    }
  }

  /**
   * Get user input from editor as a promise.
   * Used by run() loop; also used by some dialogs.
   */
  private getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this.inputResolver = (text) => {
        this.inputResolver = undefined;
        resolve(text);
      };
      this.focusInput();
    });
  }

  /**
   * Stop the interactive mode.
   */
  stop(): void {
    this.running = false;
    this.unregisterSignalHandlers();
    // Resolve any pending input promise
    if (this.inputResolver) {
      this.inputResolver('');
      this.inputResolver = undefined;
    }
    // Dispose resources
    this.compactionQueuedMessages = [];
    this.pendingTools.clear();
    this.pendingBashComponents.forEach(c => c.dispose?.());
    this.pendingBashComponents = [];
    // Unsubscribe from agent
    this.unsubscribe?.();
    // Footer dispose
    this.footer.dispose?.();
    this.footerDataProvider?.dispose?.();
    // Clear extension terminal listeners
    this.clearExtensionTerminalInputListeners();
  }

  // ==================== Agent Event Subscription ====================

  private subscribeToAgent(): void {
    if (!this.session) return;
    this.unsubscribe = this.session.subscribe(async (event: any) => {
      await this.handleEvent(event);
    });
  }

  private async handleEvent(event: any): Promise<void> {
    this.footer.invalidate?.();

    switch (event.type) {
      case 'agent:start': {
        // Restore escape handlers if retry handler still active
        if (this.retryEscapeHandler) {
          this.defaultEditor.onEscape = this.retryEscapeHandler;
          this.retryEscapeHandler = undefined;
        }
        this.retryCountdown?.dispose();
        this.retryCountdown = null;
        this.retryLoader?.dispose?.();
        this.retryLoader = null;
        this.stopWorkingLoader();
        if (this.workingVisible) {
          this.loadingAnimation = this.createWorkingLoader();
          this.statusContainer.append(this.loadingAnimation);
        }
        this.tui.requestRender();
        break;
      }
      case 'queue_update':
        this.updatePendingMessagesDisplay();
        this.tui.requestRender();
        break;
      case 'session_info_changed':
        // update terminal title, footer
        this.updateTerminalTitle();
        this.footer.invalidate?.();
        this.tui.requestRender();
        break;
      case 'message:start':
        if (event.message.role === 'assistant') {
          this.streamingMessage = event.message;
          this.streamingComponent = new AssistantMessage({ content: '' });
          this.chatContainer.append(this.streamingComponent);
        } else if (event.message.role === 'user') {
          this.addUserMessageToChat(event.message);
        }
        this.tui.requestRender();
        break;
      case 'message:update':
        if (this.streamingComponent && this.streamingMessage) {
          // Simplified: replace content
          this.streamingMessage = { ...this.streamingMessage, ...event.message };
          // TODO: proper delta handling; AssistantMessage may need update method
        }
        this.tui.requestRender();
        break;
      case 'message:end':
        if (this.streamingComponent && this.streamingMessage) {
          this.streamingComponent = null;
          this.streamingMessage = null;
        }
        this.tui.requestRender();
        break;
      case 'tool:call:start':
        // Create tool execution component if not exists
        let toolComp = this.pendingTools.get(event.toolCallId);
        if (!toolComp) {
          toolComp = new ToolExecutionMessage({
            toolName: event.toolName,
            toolCallId: event.toolCallId,
            arguments: event.args,
          });
          toolComp.setExpanded?.(this.toolOutputExpanded);
          this.chatContainer.append(toolComp);
          this.pendingTools.set(event.toolCallId, toolComp);
        }
        this.tui.requestRender();
        break;
      case 'tool:call:update':
        toolComp = this.pendingTools.get(event.toolCallId);
        if (toolComp) {
          // Update partial result
          toolComp.updateResult?.(event.partialResult);
        }
        this.tui.requestRender();
        break;
      case 'tool:call:end':
        toolComp = this.pendingTools.get(event.toolCallId);
        if (toolComp) {
          toolComp.updateResult?.(event.result, event.isError);
          this.pendingTools.delete(event.toolCallId);
        }
        this.tui.requestRender();
        break;
      case 'compaction:start':
        this.handleCompactionStart(event);
        break;
      case 'compaction:end':
        this.handleCompactionEnd(event);
        break;
      case 'auto_retry:start':
        this.handleAutoRetryStart(event);
        break;
      case 'auto_retry:end':
        this.handleAutoRetryEnd(event);
        break;
      default:
        break;
    }
  }

  private handleCompactionStart(event: any): void {
    this.autoCompactionEscapeHandler = this.defaultEditor.onEscape;
    this.defaultEditor.onEscape = () => this.session.abortCompaction();
    const loader = new Loader(
      this.tui,
      (spinner) => theme => `Compacting... (${this.getAppKeyDisplay('app.interrupt')} to cancel)`,
      (text) => text,
      'Compacting...'
    );
    this.autoCompactionLoader = loader;
    this.statusContainer.append(loader);
    this.tui.requestRender();
  }

  private handleCompactionEnd(event: any): void {
    if (this.autoCompactionEscapeHandler) {
      this.defaultEditor.onEscape = this.autoCompactionEscapeHandler;
      this.autoCompactionEscapeHandler = undefined;
    }
    this.autoCompactionLoader?.dispose?.();
    this.autoCompactionLoader = null;
    this.statusContainer.clear();
    if (event.aborted) {
      this.showStatus('Compaction cancelled');
    } else if (event.result) {
      this.chatContainer.clear();
      this.rebuildChatFromMessages();
      const summaryMsg = new CompactionSummaryMessage({
        summary: event.result.summary,
        tokensBefore: event.result.tokensBefore,
      });
      this.chatContainer.append(summaryMsg);
      this.footer.invalidate?.();
    } else if (event.errorMessage) {
      this.showError(event.errorMessage);
    }
    void this.flushCompactionQueue({ willRetry: event.willRetry });
    this.tui.requestRender();
  }

  // ==================== Setup Key Handlers & Editor ====================

  /**
   * Setup keyboard shortcuts on the editor.
   */
  private setupKeyHandlers(): void {
    // onEscape: various behaviors based on state
    this.defaultEditor.onEscape = () => {
      if (this.session?.isStreaming) {
        this.restoreQueuedMessagesToEditor({ abort: true });
      } else if (this.session?.isBashRunning) {
        this.session.abortBash();
      } else if (this.isBashMode) {
        this.editor.setText('');
        this.isBashMode = false;
        this.updateEditorBorderColor();
      } else if (!this.editor.getText?.()?.trim()) {
        // Double-escape triggers tree or fork
        const now = Date.now();
        if (now - this.lastEscapeTime < 500) {
          const action = this.settingsManager?.getDoubleEscapeAction() ?? 'tree';
          if (action === 'tree') this.showTreeSelector();
          else this.showUserMessageSelector();
          this.lastEscapeTime = 0;
        } else {
          this.lastEscapeTime = now;
        }
      }
    };

    // Global actions via keybindings (app.*)
    // We'll assume defaultEditor has onAction method, or we add our own key handlers
    // For now, we'll manually bind common keys using tui.addKeyHandler
    this.tui.addKeyHandler((key) => {
      if (key.name === 'c' && key.modifiers?.ctrl) {
        this.handleCtrlC();
        return { consume: true };
      }
      if (key.name === 'd' && key.modifiers?.ctrl) {
        this.handleCtrlD();
        return { consume: true };
      }
      if (key.name === 'z' && key.modifiers?.ctrl) {
        this.handleCtrlZ();
        return { consume: true };
      }
      return;
    });
  }

  /**
   * Setup editor submit handler – processes slash commands, bash, normal messages.
   */
  private setupEditorSubmitHandler(): void {
    // We'll override onSubmit of defaultEditor
    const originalOnSubmit = this.defaultEditor.onSubmit;
    this.defaultEditor.onSubmit = async (text: string) => {
      text = text.trim();
      if (!text) return;

      // Slash commands
      if (text === '/settings') {
        this.showSettingsSelector();
        this.editor.setText?.('');
        return;
      }
      if (text === '/model' || text.startsWith('/model ')) {
        const term = text.startsWith('/model ') ? text.slice(7).trim() : undefined;
        this.editor.setText?.('');
        await this.handleModelCommand(term);
        return;
      }
      if (text === '/export' || text.startsWith('/export ')) {
        await this.handleExportCommand(text);
        this.editor.setText?.('');
        return;
      }
      if (text === '/import' || text.startsWith('/import ')) {
        await this.handleImportCommand(text);
        this.editor.setText?.('');
        return;
      }
      if (text === '/new') {
        this.editor.setText?.('');
        await this.handleClearCommand();
        return;
      }
      if (text === '/compact' || text.startsWith('/compact ')) {
        const custom = text.startsWith('/compact ') ? text.slice(9).trim() : undefined;
        this.editor.setText?.('');
        await this.handleCompactCommand(custom);
        return;
      }
      if (text === '/reload') {
        this.editor.setText?.('');
        await this.handleReloadCommand();
        return;
      }
      if (text === '/resume') {
        this.showSessionSelector();
        this.editor.setText?.('');
        return;
      }
      if (text === '/tree') {
        this.showTreeSelector();
        this.editor.setText?.('');
        return;
      }
      if (text === '/fork') {
        this.showUserMessageSelector();
        this.editor.setText?.('');
        return;
      }
      if (text === '/changelog') {
        this.handleChangelogCommand();
        this.editor.setText?.('');
        return;
      }
      if (text === '/hotkeys') {
        this.handleHotkeysCommand();
        this.editor.setText?.('');
        return;
      }
      if (text === '/quit') {
        this.editor.setText?.('');
        void this.shutdown();
        return;
      }
      if (text === '/login') {
        this.showOAuthSelector('login');
        this.editor.setText?.('');
        return;
      }
      if (text === '/logout') {
        this.showOAuthSelector('logout');
        this.editor.setText?.('');
        return;
      }
      // Bash commands
      if (text.startsWith('!')) {
        const excl = text.startsWith('!!');
        const cmd = (excl ? text.slice(2) : text.slice(1)).trim();
        if (cmd) {
          this.editor.addToHistory?.(text);
          this.handleBashCommand(cmd, excl).catch(console.error);
        }
        return;
      }

      // Normal message
      this.editor.addToHistory?.(text);
      // Forward to agent (if runtimeHost)
      if (this.runtimeHost) {
        this.session.prompt(text).catch((e: any) => this.showError(e.message));
      }
    };
  }

  // ==================== Utils ====================

  private showError(msg: string): void {
    this.statusContainer.append(new Text(`Error: ${msg}`));
    this.tui.requestRender();
  }

  private showWarning(msg: string): void {
    this.statusContainer.append(new Text(`Warning: ${msg}`));
    this.tui.requestRender();
  }

  private updateEditorBorderColor(): void {
    // TODO: update editor border based on mode
  }

  private async handleModelCommand(search?: string): Promise<void> {
    if (!search) {
      this.showModelSelector();
      return;
    }
    // Find model
    const models = await this.getModelCandidates();
    // ... findExactModelMatch ...
    // For now skip
    this.showModelSelector(search);
  }

  private async getModelCandidates(): Promise<any[]> {
    if (this.session?.scopedModels?.length) {
      return this.session.scopedModels.map((s: any) => s.model);
    }
    await this.session?.modelRegistry?.refresh?.();
    return this.session?.modelRegistry?.getAvailable?.() ?? [];
  }

  private rebuildChatFromMessages(): void {
    this.chatContainer.clear();
    if (this.session?.messages) {
      for (const msg of this.session.messages) {
        // Very simple rendering – in reality need full mapping
        if (msg.role === 'user') {
          this.addUserMessageToChat(msg);
        } else if (msg.role === 'assistant') {
          this.chatContainer.append(new AssistantMessage({ content: this.extractTextFromMessage(msg) }));
        } else if (msg.role === 'toolResult') {
          // Tool results are shown inline with tool calls, so skip
        }
      }
    }
  }

  private handleCtrlC(): void {
    const now = Date.now();
    if (now - this.lastSigintTime < 500) {
      void this.shutdown();
    } else {
      this.editor.setText?.('');
      this.lastSigintTime = now;
    }
  }

  private handleCtrlD(): void {
    void this.shutdown();
  }

  private handleCtrlZ(): void {
    if (process.platform === 'win32') {
      this.showWarning('Suspend not supported on Windows');
      return;
    }
    // Suspend logic
    this.tui.stop();
    process.kill(0, 'SIGTSTP');
  }

  private async shutdown(): Promise<void> {
    this.running = false;
    this.unregisterSignalHandlers();
    await this.tui.terminal.drainInput(1000);
    this.tui.stop();
    await this.runtimeHost?.dispose?.();
    process.exit(0);
  }

  private registerSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM'];
    if (process.platform !== 'win32') signals.push('SIGHUP');
    for (const s of signals) {
      const handler = () => { void this.shutdown(); };
      process.on(s, handler);
      this.signalCleanupHandlers.push(() => process.off(s, handler));
    }
  }

  private unregisterSignalHandlers(): void {
    for (const cleanup of this.signalCleanupHandlers) cleanup();
    this.signalCleanupHandlers = [];
  }

  private createWorkingLoader(): any {
    // Simplified Loader – in reality use the Loader component
    return new Loader(
      this.tui,
      (s) => s,
      (t) => t,
      this.workingMessage ?? this.defaultWorkingMessage
    );
  }

  private stopWorkingLoader(): void {
    this.loadingAnimation?.dispose?.();
    this.loadingAnimation = null;
    this.statusContainer.clear();
  }

  private setWorkingVisible(visible: boolean): void {
    this.workingVisible = visible;
    if (!visible) {
      this.stopWorkingLoader();
      this.tui.requestRender();
      return;
    }
    if (this.session?.isStreaming && !this.loadingAnimation) {
      this.loadingAnimation = this.createWorkingLoader();
      this.statusContainer.append(this.loadingAnimation);
    }
    this.tui.requestRender();
  }

  private focusInput(): void {
    // Focus the editor component
    this.tui.setFocus(this.editor);
  }

  // ==================== Compaction & Queue ====================

  private getAllQueuedMessages(): { steering: string[]; followUp: string[] } {
    return {
      steering: [],
      followUp: [],
    };
  }

  private clearAllQueues(): { steering: string[]; followUp: string[] } {
    return { steering: [], followUp: [] };
  }

  private updatePendingMessagesDisplay(): void {
    this.pendingContainer.clear();
    const { steering, followUp } = this.getAllQueuedMessages();
    if (steering.length || followUp.length) {
      this.pendingContainer.append(new Spacer(1));
      for (const msg of steering) {
        this.pendingContainer.append(new Text(`Steering: ${msg}`));
      }
      for (const msg of followUp) {
        this.pendingContainer.append(new Text(`Follow-up: ${msg}`));
      }
    }
    this.tui.requestRender();
  }

  private restoreQueuedMessagesToEditor(opts?: { abort?: boolean }): number {
    const { steering, followUp } = this.clearAllQueues();
    if (steering.length + followUp.length === 0) {
      if (opts?.abort) this.session?.abort?.();
      return 0;
    }
    const combined = [...steering, ...followUp].join('\n\n');
    this.editor.setText?.(combined);
    if (opts?.abort) this.session?.abort?.();
    return steering.length + followUp.length;
  }

  private queueCompactionMessage(text: string, mode: 'steer' | 'followUp'): void {
    this.compactionQueuedMessages.push({ text, mode });
    this.editor.addToHistory?.(text);
    this.editor.setText?.('');
    this.updatePendingMessagesDisplay();
    this.showStatus?.('Queued for after compaction');
  }

  private isExtensionCommand(text: string): boolean {
    if (!text.startsWith('/')) return false;
    const name = text.split(' ')[0].slice(1);
    return !!this.extensionRunner?.getCommand?.(name);
  }

  private async flushCompactionQueue(options?: { willRetry?: boolean }): Promise<void> {
    if (this.compactionQueuedMessages.length === 0) return;
    const queue = [...this.compactionQueuedMessages];
    this.compactionQueuedMessages = [];
    this.updatePendingMessagesDisplay();

    try {
      if (options?.willRetry) {
        for (const msg of queue) {
          if (this.isExtensionCommand(msg.text)) {
            await this.session.prompt(msg.text);
          } else if (msg.mode === 'followUp') {
            await this.session.followUp?.(msg.text);
          } else {
            await this.session.steer?.(msg.text);
          }
        }
        return;
      }

      const firstPromptIdx = queue.findIndex(m => !this.isExtensionCommand(m.text));
      if (firstPromptIdx === -1) {
        for (const m of queue) await this.session.prompt(m.text);
        return;
      }

      const pre = queue.slice(0, firstPromptIdx);
      const first = queue[firstPromptIdx];
      const rest = queue.slice(firstPromptIdx + 1);

      for (const m of pre) await this.session.prompt(m.text);

      const firstPromise = this.session.prompt(first.text).catch((err: any) => {
        this.session.clearQueue?.();
        this.compactionQueuedMessages = queue;
        this.updatePendingMessagesDisplay();
        this.showError(`Failed to send queued message: ${err.message}`);
      });

      for (const m of rest) {
        if (this.isExtensionCommand(m.text)) await this.session.prompt(m.text);
        else if (m.mode === 'followUp') await this.session.followUp?.(m.text);
        else await this.session.steer?.(m.text);
      }
      void firstPromise;
    } catch (e) {
      this.showError(e instanceof Error ? e.message : String(e));
    }
  }

  // ==================== Selectors & Dialogs (stubs) ====================

  private showSettingsSelector(): void {
    // TODO: implement using SettingsSelector component and showDialog
    this.showStatus('/settings selected');
  }

  private async handleModelCommand(search?: string): Promise<void> {
    if (!search) {
      this.showModelSelector();
      return;
    }
    const models = await this.getModelCandidates();
    // Find exact match
    // TODO
    this.showModelSelector(search);
  }

  private showModelSelector(initialSearch?: string): void {
    // TODO: create ModelSelector, showDialog
    this.showStatus('Model selector');
  }

  private showSessionSelector(): void {
    // TODO: SessionSelector
    this.showStatus('Session selector');
  }

  private showTreeSelector(initialSelectedId?: string): void {
    // TODO: TreeSelector
    this.showStatus('Tree selector');
  }

  private showUserMessageSelector(): void {
    // TODO: UserMessageSelector
    this.showStatus('User message selector');
  }

  private async handleClearCommand(): Promise<void> {
    const result = await this.runtimeHost?.newSession?.();
    if (result?.cancelled) return;
    this.chatContainer.clear();
    this.rebuildChatFromMessages();
    this.showStatus('New session started');
  }

  private async handleCompactCommand(customInstructions?: string): Promise<void> {
    const entries = this.sessionManager?.getEntries?.() ?? [];
    const messageCount = entries.filter((e: any) => e.type === 'message').length;
    if (messageCount < 2) {
      this.showWarning('Nothing to compact');
      return;
    }
    try {
      await this.session.compact?.(customInstructions);
    } catch (e) {
      // ignore, will emit event
    }
  }

  private async handleReloadCommand(): Promise<void> {
    if (this.session?.isStreaming) {
      this.showWarning('Wait for current response to finish');
      return;
    }
    if (this.session?.isCompacting) {
      this.showWarning('Wait for compaction to finish');
      return;
    }
    // Reset UI
    this.resetExtensionUI();
    // Reload session
    await this.session.reload?.();
    this.rebuildChatFromMessages();
    this.showStatus('Reloaded');
  }

  private handleBashCommand(command: string, excludeFromContext = false): Promise<void> {
    return (async () => {
      try {
        const result = await this.session.executeBash?.(command, (chunk: string) => {
          // TODO: show output in bash component
        }, { excludeFromContext });
        // TODO: add BashExecutionMessage to chat
      } catch (e) {
        this.showError(`Bash failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }

  private handleChangelogCommand(): void {
    // TODO: show changelog in chat
    this.showStatus('Changelog');
  }

  private handleHotkeysCommand(): void {
    // TODO: show keybindings table
    this.showStatus('Hotkeys');
  }

  private showOAuthSelector(mode: 'login' | 'logout'): void {
    // TODO: implement OAuth selector
    this.showStatus(`OAuth ${mode}`);
  }

  // ==================== Signal Handlers & Shutdown ====================

  private async handleShutdown(): Promise<void> {
    await this.shutdown();
  }

  // ... more methods ...

  private handleAutoRetryStart(event: any): void {
    this.retryEscapeHandler = this.defaultEditor.onEscape;
    this.defaultEditor.onEscape = () => this.session.abortRetry();
    const retryMsg = (seconds: number) => `Retrying (${event.attempt}/${event.maxAttempts}) in ${seconds}s...`;
    this.retryCountdown = new CountdownTimer(
      event.delayMs,
      (sec) => {
        if (this.retryLoader) this.retryLoader.setMessage?.(retryMsg(sec));
      },
      () => {}
    );
    this.retryLoader = new Loader(
      this.tui,
      (s) => s,
      (t) => t,
      retryMsg(Math.ceil(event.delayMs/1000))
    );
    this.statusContainer.append(this.retryLoader);
    this.tui.requestRender();
  }

  private handleAutoRetryEnd(event: any): void {
    if (this.retryEscapeHandler) {
      this.defaultEditor.onEscape = this.retryEscapeHandler;
      this.retryEscapeHandler = undefined;
    }
    this.retryCountdown?.dispose();
    this.retryCountdown = null;
    this.retryLoader?.dispose?.();
    this.retryLoader = null;
    this.statusContainer.clear();
    if (!event.success) {
      this.showError(`Retry failed: ${event.finalError}`);
    }
    this.tui.requestRender();
  }

  /**
   * Setup layout by adding containers as children of this InteractiveMode.
   * Order matters for rendering (top to bottom).
   */
  private setupLayout(): void {
    // The children array of this InteractiveMode defines the layout order.
    // We'll add containers in visual order.
    this.append(this.headerContainer);
    this.append(this.chatContainer);
    this.append(this.pendingContainer);
    this.append(this.statusContainer);
    this.append(this.widgetAboveContainer);
    this.append(this.editorContainer);
    this.append(this.widgetBelowContainer);
    this.append(this.footerContainer);
  }

  /**
   * Draw the entire interactive interface.
   * Calculates layout heights and renders each container.
   */
  draw(context: RenderContext): string[] {
    const width = context.width;
    const height = context.height;

    // Determine fixed heights (number of lines) for each section
    const headerLines = this.measureContainerHeight(this.headerContainer, width);
    const headerHeight = headerLines > 0 ? 1 : 0; // header is 1 line

    const footerLines = this.measureContainerHeight(this.footerContainer, width);
    const footerHeight = footerLines > 0 ? 1 : 0;

    const editorLines = this.measureContainerHeight(this.editorContainer, width);
    const editorHeight = editorLines > 0 ? 1 : 0;

    const statusLines = this.measureContainerHeight(this.statusContainer, width);
    const statusHeight = statusLines > 0 ? 1 : 0;

    const pendingLines = this.measureContainerHeight(this.pendingContainer, width);
    const pendingHeight = pendingLines > 0 ? 1 : 0;

    const widgetAboveLines = Math.min(MAX_WIDGET_LINES, this.measureContainerHeight(this.widgetAboveContainer, width));
    const widgetAboveHeight = widgetAboveLines;

    const widgetBelowLines = Math.min(MAX_WIDGET_LINES, this.measureContainerHeight(this.widgetBelowContainer, width));
    const widgetBelowHeight = widgetBelowLines;

    // Fixed total
    const fixedHeight = headerHeight + footerHeight + editorHeight + statusHeight + pendingHeight + widgetAboveHeight + widgetBelowHeight;
    const chatHeight = Math.max(0, height - fixedHeight);

    // Render each section in order
    const lines: string[] = [];

    // Header
    if (headerHeight > 0) {
      const hdr = this.headerContainer.draw({ width, height: headerHeight });
      lines.push(...hdr.slice(0, headerHeight));
    }

    // Chat messages (scrollable)
    if (chatHeight > 0) {
      const chatLines = this.chatContainer.draw({ width, height: chatHeight });
      lines.push(...chatLines);
    }

    // Pending messages (steering/follow-up)
    if (pendingHeight > 0) {
      const pendingLinesArr = this.pendingContainer.draw({ width, height: pendingHeight });
      lines.push(...pendingLinesArr.slice(0, pendingHeight));
    }

    // Status line
    if (statusHeight > 0) {
      const statusLinesArr = this.statusContainer.draw({ width, height: statusHeight });
      lines.push(...statusLinesArr.slice(0, statusHeight));
    }

    // Widget above editor
    if (widgetAboveHeight > 0) {
      const widgetLines = this.widgetAboveContainer.draw({ width, height: widgetAboveHeight });
      lines.push(...widgetLines.slice(0, widgetAboveHeight));
    }

    // Editor
    if (editorHeight > 0) {
      const editorLines = this.editorContainer.draw({ width, height: editorHeight });
      lines.push(...editorLines.slice(0, editorHeight));
    }

    // Widget below editor
    if (widgetBelowHeight > 0) {
      const widgetLines = this.widgetBelowContainer.draw({ width, height: widgetBelowHeight });
      lines.push(...widgetLines.slice(0, widgetBelowHeight));
    }

    // Footer
    if (footerHeight > 0) {
      const footerLinesArr = this.footerContainer.draw({ width, height: footerHeight });
      lines.push(...footerLinesArr.slice(0, footerHeight));
    }

    // Ensure we don't exceed available height
    if (lines.length > height) {
      return lines.slice(0, height);
    }
    return lines;
  }

  /**
   * Measure how many lines a container would take (sum of children line counts).
   */
  private measureContainerHeight(container: ElementContainer, width: number): number {
    let total = 0;
    for (const child of container.children) {
      const childLines = child.draw({ width, height: 1000 });
      total += childLines.length;
    }
    return total;
  }

  /**
   * InteractiveElement method – when focused, editor should emit CURSOR_MARKER.
   * Our editor (Input) already handles that.
   */
  // No need to implement; focused element is the editor itself.

  /**
   * Clear cache for all children.
   */
  clearCache(): void {
    this.headerContainer.clearCache();
    this.chatContainer.clearCache();
    this.pendingContainer.clearCache();
    this.statusContainer.clearCache();
    this.widgetAboveContainer.clearCache();
    this.editorContainer.clearCache();
    this.widgetBelowContainer.clearCache();
    this.footerContainer.clearCache();
  }

  // ==================== Agent Integration ====================

  /**
   * Initialize agent integration: subscribe to events, setup initial messages.
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Register signal handlers (SIGTERM, SIGHUP)
    this.registerSignalHandlers();

    // Load changelog if needed (skip if verbose off? reference checks quietStartup)
    this.changelogMarkdown = ''; // TODO: load from file

    // Ensure tools? We don't need fd/rg in TUI side; agent handles that.

    // Build header (keybindings hints, logo, etc.)
    this.buildHeader();

    // Subscribe to agent events
    this.subscribeToAgent();

    // Initial messages
    if (this.options.initialMessage && this.session) {
      try {
        await this.session.prompt(this.options.initialMessage);
      } catch (e) {
        this.showError(e instanceof Error ? e.message : String(e));
      }
    }
    if (this.options.initialMessages) {
      for (const msg of this.options.initialMessages) {
        try {
          await this.session.prompt(msg);
        } catch (e) {
          this.showError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    // Set initial status
    if (this.options.initialStatus) {
      this.setStatus(this.options.initialStatus);
    }
  }

  /**
   * Build the header component (logo + keybinding hints).
   * Can be overridden by extensions via setHeader().
   */
  private buildHeader(): void {
    const logo = '[PI]'; // TODO: use theme and version
    const hint = (key: string, desc: string) => `${key}: ${desc}`;
    const instructions = [
      hint('Ctrl+C', 'interrupt'),
      hint('Ctrl+D', 'exit'),
      hint('Ctrl+Z', 'suspend'),
      '/', 'commands',
      '!', 'bash',
    ].join(' · ');
    this.builtInHeader = new Text(`${logo} ${instructions}`);
    this.headerContainer.append(this.builtInHeader);
  }

  /**
   * Subscribe to AgentSession events and update UI accordingly.
   */
  private subscribeToAgent(): void {
    if (!this.session) return;
    this.unsubscribe = this.session.subscribe(async (event: any) => {
      await this.handleEvent(event);
    });
  }

  /**
   * Handle agent events.
   */
  private async handleEvent(event: any): Promise<void> {
    // Simplified – will expand
    switch (event.type) {
      case 'agent:start':
        this.setStatus('🤖 Running...');
        break;
      case 'agent:end':
        this.setStatus('✅ Ready');
        break;
      case 'message:start':
        if (event.message.role === 'assistant') {
          // Create assistant message component with streaming support
          this.streamingMessage = event.message;
          // TODO: create component that can update
          this.streamingComponent = new AssistantMessage({ content: '' });
          this.chatContainer.append(this.streamingComponent);
        } else if (event.message.role === 'user') {
          this.addUserMessageToChat(event.message);
        }
        break;
      case 'message:delta':
        if (this.streamingComponent && this.streamingMessage) {
          // Update assistant message with delta
          this.streamingMessage.content = event.delta; // simplified
          // This component should support updating content; if not, recreate
        }
        break;
      case 'message:end':
        if (this.streamingComponent && this.streamingMessage) {
          // Finalize
          this.streamingComponent = null;
          this.streamingMessage = null;
        }
        break;
      case 'tool:call:start':
        // Create ToolExecutionMessage and add to chat
        // But reference adds to chatContainer immediately when tool call appears in assistant message
        break;
      case 'tool:call:end':
        // Update corresponding ToolExecutionMessage with result
        break;
      default:
        break;
    }
    this.tui.requestRender();
  }

  /**
   * Add a user message to chat (with optional history population).
   */
  private addUserMessageToChat(message: any): void {
    const text = this.extractTextFromMessage(message);
    if (text) {
      const msg = new UserMessage({ text });
      this.chatContainer.append(msg);
    }
  }

  private extractTextFromMessage(message: any): string {
    if (typeof message.content === 'string') return message.content;
    if (Array.isArray(message.content)) {
      return message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    }
    return '';
  }

  // ==================== Public API (subset) ====================

  addUserMessage(text: string): void {
    this.chatContainer.append(new UserMessage({ text }));
    this.tui.requestRender();
  }

  addAssistantMessage(text: string): void {
    this.chatContainer.append(new AssistantMessage({ content: text }));
    this.tui.requestRender();
  }

  addToolMessage(toolName: string, output: string, exitCode?: number): void {
    const msg = new ToolMessage({ toolName, output, error: exitCode !== 0 });
    this.chatContainer.append(msg);
    this.tui.requestRender();
  }

  setStatus(text: string): void {
    this.statusContainer.clear();
    if (text) {
      this.statusContainer.append(new Text(text));
    }
    this.footer.setLeftItems([{ label: text }]);
    this.tui.requestRender();
  }

  setRightItems(items: any[]): void {
    this.footer.setRightItems(items);
    this.tui.requestRender();
  }

  /**
   * Set a widget (string array or component) above or below editor.
   */
  setWidget(key: string, content: string[] | UIElement | null, options?: { placement?: 'aboveEditor' | 'belowEditor' }): void {
    const placement = options?.placement ?? 'aboveEditor';
    const container = placement === 'belowEditor' ? this.widgetBelowContainer : this.widgetAboveContainer;
    // Remove existing
    const existing = container.children.find(c => (c as any)._widgetKey === key);
    if (existing) container.remove(existing);
    if (content === null) {
      this.tui.requestRender();
      return;
    }
    let component: UIElement;
    if (Array.isArray(content)) {
      const c = new ElementContainer();
      for (const line of content.slice(0, MAX_WIDGET_LINES)) {
        c.append(new Text(line));
      }
      component = c;
      (component as any)._widgetKey = key;
    } else {
      component = content;
      (component as any)._widgetKey = key;
    }
    container.append(component);
    this.tui.requestRender();
  }

  setHeader(component: UIElement | null): void {
    this.headerContainer.clear();
    if (component) {
      this.headerContainer.append(component);
      this.customHeader = component;
    } else {
      this.customHeader = null;
      if (this.builtInHeader) this.headerContainer.append(this.builtInHeader);
    }
    this.tui.requestRender();
  }

  setCustomFooter(component: UIElement | null): void {
    this.footerContainer.clear();
    if (component) {
      this.footerContainer.append(component);
      this.customFooter = component;
    } else {
      this.customFooter = null;
      this.footerContainer.append(this.footer);
    }
    this.tui.requestRender();
  }

  /**
   * Show a modal dialog (panel).
   */
  async showDialog(component: UIElement): Promise<void> {
    this.tui.showPanel(component, { anchor: 'center' });
    // Wait for panel to close? Could use a callback.
  }

  // ... more methods to be added ...
}
