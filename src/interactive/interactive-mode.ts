// Interactive Mode - Pure TypeScript TUI (no Ink/React)
// Entry point for interactive terminal UI using the custom TUI library

import { Screen } from '../tui/Screen.js';
import { StateManager, createInitialState } from './components/StateManager.js';
import type { InteractiveState, InputState, Message, Toast, ModalState } from './components/types.js';
import { subscribeToRuntimeEvents } from './app-events.js';
import { handleCommand, CommandContext } from './command-handlers.js';
import type { AgentSessionRuntimeInterface } from '../runtime/index.js';
import { moveInputHistoryUp, moveInputHistoryDown, updateInputValue, addToHistory, renderInput as renderInputComp, renderMessageList, renderHeader, renderFooter, renderModal, renderToast } from './components/index.js';
import { getAgentDir } from '../config.js';
import type { CreateAgentSessionRuntimeFactory } from '../runtime/agent-session-runtime.js';
import { createAgentSessionRuntime } from '../runtime/agent-session-runtime.js';

/**
 * Options for interactive mode
 */
export interface InteractiveModeOptions {
  /**
   * Working directory (default: process.cwd())
   */
  cwd?: string;
  /**
   * Agent directory (default: ~/.pi/agent)
   */
  agentDir?: string;
  /**
   * Model to use
   */
  model?: any;
  /**
   * Thinking level
   */
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  /**
   * Custom factory for extending runtime creation
   */
  createRuntime?: CreateAgentSessionRuntimeFactory;
  /**
   * Screen title
   */
  title?: string;
  /**
   * Custom render function (if you want to override default layout)
   */
  customRenderer?: (state: InteractiveState, width: number, height: number) => string;
}

/**
 * InteractiveMode - Main class for running the interactive TUI
 */
export class InteractiveMode {
  private screen!: Screen;
  private state!: StateManager;
  private runtime!: AgentSessionRuntimeInterface;
  private width!: number;
  private height!: number;
  private options: InteractiveModeOptions;

  constructor(options: InteractiveModeOptions = {}) {
    this.options = options;
  }

  /**
   * Start interactive mode
   */
  async start(): Promise<void> {
    const cwd = this.options.cwd || process.cwd();
    const agentDir = this.options.agentDir || getAgentDir();

    // Create factory
    const factory = this.options.createRuntime || (async (opts: any) => ({ diagnostics: [], session: null as any, services: null as any }));

    // Create runtime
    const runtime = await createAgentSessionRuntime(factory, {
      cwd,
      agentDir,
      model: this.options.model,
      thinkingLevel: this.options.thinkingLevel,
    });

    this.runtime = runtime;

    // Initialize state
    const initialState = createInitialState();
    if (this.options.initialState) {
      Object.assign(initialState, this.options.initialState);
    }
    this.state = new StateManager(initialState);

    // Create screen
    this.screen = new Screen({
      title: this.options.title || 'picro',
      input: true,
      exitOnCtrlC: true,
    });

    // Get terminal size
    const size = this.screen.getSize();
    this.width = size.width;
    this.height = size.height;

    this.setup();
  }

  private setup(): void {
    this.setupInputHandlers();
    this.setupResizeHandler();
    this.setupRender();
    this.subscribeToRuntime();
  }

  private setupInputHandlers(): void {
    this.screen.onInput(async (key: string) => {
      switch (key) {
        case '\r': // Enter
          await this.handleEnter();
          break;
        case '\u0003': // Ctrl+C
          this.screen.stop();
          process.exit(0);
          break;
        case '\x1b[A': // Arrow up
          this.state.update('input', moveInputHistoryUp);
          break;
        case '\x1b[B': // Arrow down
          this.state.update('input', moveInputHistoryDown);
          break;
        case '\u007f': // Backspace (Delete)
        case '\b':   // Backspace (Ctrl+H)
          this.state.update('input', (s: InputState) => ({
            ...s,
            value: s.value.slice(0, -1),
          }));
          break;
        default:
          // Printable character
          if (key.length === 1 && key >= ' ' && key <= '~') {
            this.state.update('input', (s: InputState) => ({
              ...s,
              value: s.value + key,
            }));
          }
      }
    });
  }

  private setupResizeHandler(): void {
    this.screen.onResize(() => {
      const size = this.screen.getSize();
      this.width = size.width;
      this.height = size.height;
      this.render();
    });
  }

  private setupRender(): void {
    this.state.subscribeAll(() => this.render());
  }

  private subscribeToRuntime(): void {
    subscribeToRuntimeEvents(this.runtime, {
      onAgentStart: () => {
        this.state.update('isProcessing', true);
      },
      onAgentEnd: () => {
        this.state.update('isProcessing', false);
      },
      onMessageStart: () => {
        this.state.update('isProcessing', true);
      },
      onMessageEnd: (event: any) => {
        this.state.update('isProcessing', false);
        this.state.update('messages', (prev: Message[]) => [
          ...prev,
          {
            id: event.messageId || `msg-${Date.now()}`,
            role: 'assistant',
            content: event.content || '',
            timestamp: Date.now(),
          },
        ]);
      },
      onToolExecutionStart: () => {
        // Could update status bar to show "Running tool: X"
      },
      onToolExecutionEnd: () => {
        // Clear tool status
      },
      addToast: (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        this.state.update('toasts', (prev: Toast[]) => [
          ...prev,
          {
            id: `toast-${Date.now()}`,
            message,
            type,
            duration: 3000,
            createdAt: Date.now(),
          },
        ]);
      },
      setInputValue: (value: string | ((prev: InputState) => InputState)) => {
        this.state.update('input', value);
      },
      setMessages: (updater: (prev: Message[]) => Message[]) => {
        this.state.update('messages', updater);
      },
      sendMessage: async (text: string) => {
        await this.runtime.prompt(text);
      },
    });
  }

  private async handleEnter(): Promise<void> {
    const input = this.state.getProperty('input');
    const text = input.value.trim();

    if (!text) return;

    // Check for slash command
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const commandId = parts[0].slice(1);
      const args = parts.slice(1).join(' ');

      const ctx: CommandContext = {
        runtime: this.runtime,
        messages: this.state.getProperty('messages'),
        cwd: this.state.getProperty('cwd'),
        showToast: (message: string, type?: 'info' | 'success' | 'error') => {
          this.state.update('toasts', (prev: Toast[]) => [
            ...prev,
            { id: `toast-${Date.now()}`, message, type: type || 'info', duration: 3000, createdAt: Date.now() },
          ]);
        },
        showModal: (modal: ModalState) => {
          this.state.update('modal', modal);
        },
      };

      const result = await handleCommand(ctx, commandId, args);

      if (result === 'insert') {
        // Not a built-in command, insert as normal message
        await this.sendUserMessage(text);
      } else if (typeof result === 'object' && result.type === 'toast') {
        this.state.update('toasts', (prev: Toast[]) => [
          ...prev,
          { id: `toast-${Date.now()}`, message: result.message, type: result.toastType || 'info', duration: 3000, createdAt: Date.now() },
        ]);
      }
      // Modal results will be handled via state.modal already set by handlers
    } else {
      // Normal message
      await this.sendUserMessage(text);
    }

    // Clear input
    this.state.update('input', (s: InputState) => ({ ...s, value: '' }));
  }

  private async sendUserMessage(text: string): Promise<void> {
    // Add user message to state
    this.state.update('messages', (prev: Message[]) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ]);

    // Call runtime
    try {
      await this.runtime.prompt(text);
    } catch (err) {
      this.state.update('toasts', (prev: Toast[]) => [
        ...prev,
        {
          id: `toast-${Date.now()}`,
          message: `Error: ${(err as Error).message}`,
          type: 'error',
          duration: 5000,
          createdAt: Date.now(),
        },
      ]);
    }
  }

  private render(): void {
    const state = this.state.get();

    // Use custom renderer if provided
    if (this.options.customRenderer) {
      const output = this.options.customRenderer(state, this.width, this.height);
      this.screen.clear();
      this.screen.stdout.write(output);
      return;
    }

    // Build output
    const lines: string[] = [];

    // Header
    lines.push(renderHeader(state, { width: this.width }));

    // Messages
    const availableHeight = this.height - 4;
    const maxMessages = Math.max(5, availableHeight - 5);
    const messagesOutput = renderMessageList(state.messages, {
      width: this.width,
      maxMessages: maxMessages,
    });
    if (messagesOutput) {
      lines.push(messagesOutput);
    } else {
      lines.push('\n[No messages yet. Type a message to start.]\n');
    }

    // Input
    lines.push(renderInputComp(state.input, '> ', this.width));

    // Footer
    lines.push(renderFooter(state, { width: this.width }));

    // Toasts (overlay at top)
    if (state.toasts.length > 0) {
      const toastLines = state.toasts
        .map((t: Toast, i: number) => renderToast(t, i, this.width))
        .join('\n');
      lines.splice(1, 0, toastLines);
    }

    // Modal overlay
    if (state.modal.type !== 'none') {
      const modalOutput = renderModal(state.modal);
      const modalLines = modalOutput.split('\n');
      lines.splice(1, 0, ...modalLines);
    }

    this.screen.clear();
    this.screen.stdout.write(lines.join('\n'));
  }

  /**
   * Stop interactive mode
   */
  stop(): void {
    this.screen.stop();
  }

  /**
   * Get the runtime instance
   */
  getRuntime(): AgentSessionRuntimeInterface {
    return this.runtime;
  }

  /**
   * Get the state manager
   */
  getState(): StateManager {
    return this.state;
  }
}

/**
 * Run interactive mode (convenience function)
 */
export async function runInteractiveMode(options: InteractiveModeOptions = {}): Promise<void> {
  const mode = new InteractiveMode(options);
  await mode.start();
}
