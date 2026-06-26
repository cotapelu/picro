// Interactive App - Main application class for interactive mode
// Combines state management, runtime integration, and TUI rendering

import { Screen } from '../tui/Screen';
import {
  StateManager,
  createInitialState,
  StateSubscriber,
} from './components/StateManager';
import type { InteractiveState } from './components/types';
import { subscribeToRuntimeEvents, flushCompactionQueue } from './app-events';
import { handleCommand, CommandContext } from './command-handlers';
import type { AgentSessionRuntimeInterface } from '../runtime/index';

export interface InteractiveAppOptions {
  /**
   * Runtime to connect to
   */
  runtime: AgentSessionRuntimeInterface;
  /**
   * Screen title
   */
  title?: string;
  /**
   * Custom render function (if you want to override default layout)
   */
  customRenderer?: (state: InteractiveState, width: number, height: number) => string;
  /**
   * Initial state overrides
   */
  initialState?: Partial<InteractiveState>;
}

export class InteractiveApp {
  private screen: Screen;
  private state: StateManager;
  private runtime: AgentSessionRuntimeInterface;
  private customRenderer?: InteractiveAppOptions['customRenderer'];
  private width: number;
  private height: number;
  private isRunning = false;

  constructor(options: InteractiveAppOptions) {
    this.runtime = options.runtime;
    this.customRenderer = options.customRenderer;

    // Initialize state
    const initialState = createInitialState();
    if (options.initialState) {
      Object.assign(initialState, options.initialState);
    }
    this.state = new StateManager(initialState);

    // Create screen
    this.screen = new Screen({
      title: options.title || 'picro',
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
    this.screen.onInput(async (key) => {
      switch (key) {
        case '\r': // Enter
          await this.handleEnter();
          break;
        case '\u0003': // Ctrl+C
          this.screen.stop();
          process.exit(0);
          break;
        case '\x1b[A': // Arrow up
          this.state.update('input', (s) => {
            const updated = require('../interactive/components/Input').moveInputHistoryUp(s);
            return updated;
          });
          break;
        case '\x1b[B': // Arrow down
          this.state.update('input', (s) => {
            const updated = require('../interactive/components/Input').moveInputHistoryDown(s);
            return updated;
          });
          break;
        case '\u007f': // Backspace (Delete)
        case '\b':   // Backspace (Ctrl+H)
          this.state.update('input', (s) => ({
            ...s,
            value: s.value.slice(0, -1),
          }));
          break;
        default:
          // Printable character
          if (key.length === 1 && key >= ' ' && key <= '~') {
            this.state.update('input', (s) => ({
              ...s,
              value: s.value + key,
            }));
          } else if (key === '/') {
            // Slash command detection will be handled in handleEnter
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
      onMessageEnd: (event) => {
        this.state.update('isProcessing', false);
        this.state.update('messages', (prev) => [
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
      addToast: (message, type = 'info') => {
        this.state.update('toasts', (prev) => [
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
      setInputValue: (value) => {
        this.state.update('input', (s) => ({ ...s, value }));
      },
      setMessages: (updater) => {
        this.state.update('messages', updater);
      },
      sendMessage: async (text) => {
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
        showToast: (message, type) => {
          this.state.update('toasts', (prev) => [
            ...prev,
            { id: `toast-${Date.now()}`, message, type, duration: 3000, createdAt: Date.now() },
          ]);
        },
        showModal: (modal) => {
          this.state.update('modal', modal);
        },
      };

      const result = await handleCommand(ctx, commandId, args);

      if (result === 'insert') {
        // Not a built-in command, insert as normal message
        await this.sendUserMessage(text);
      } else if (typeof result === 'object' && result.type === 'toast') {
        this.state.update('toasts', (prev) => [
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
    this.state.update('input', (s) => ({ ...s, value: '' }));
  }

  private async sendUserMessage(text: string): Promise<void> {
    // Add user message to state
    this.state.update('messages', (prev) => [
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
      this.state.update('toasts', (prev) => [
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
    if (this.customRenderer) {
      const output = this.customRenderer(state, this.width, this.height);
      this.screen.clear();
      this.screen.stdout.write(output);
      return;
    }

    // Default layout
    const lines = this.buildDefaultLayout(state);
    this.screen.clear();
    this.screen.stdout.write(lines);
  }

  private buildDefaultLayout(state: InteractiveState): string {
    const lines: string[] = [];

    // Header (1-2 lines)
    const header = this.renderHeader(state);
    lines.push(header);

    // Messages
    const availableHeight = this.height - 4; // header + input + footer + spacing
    const messages = this.renderMessages(state, availableHeight);
    if (messages) {
      lines.push(messages);
    } else {
      lines.push('\n[No messages yet. Type a message to start.]\n');
    }

    // Input
    const input = this.renderInput(state);
    lines.push(input);

    // Footer
    const footer = this.renderFooter(state);
    lines.push(footer);

    // Modal overlay (insert after header)
    if (state.modal.type !== 'none') {
      const modal = this.renderModal(state.modal);
      const modalLines = modal.split('\n');
      const insertPos = 1;
      for (let i = 0; i < modalLines.length; i++) {
        lines.splice(insertPos + i, 0, modalLines[i]);
      }
    }

    return lines.join('\n');
  }

  private renderHeader(state: InteractiveState): string {
    // Import local to avoid circular
    const { renderHeader: renderHeaderComp } = require('../interactive/components/Header');
    return renderHeaderComp(state, { width: this.width });
  }

  private renderMessages(state: InteractiveState, maxHeight: number): string {
    const { renderMessageList } = require('../interactive/components/MessageList');
    // Approximate: max lines = maxHeight - some buffer
    const maxMsgs = Math.max(1, maxHeight - 3);
    return renderMessageList(state.messages, { width: this.width, maxMessages: maxMsgs });
  }

  private renderInput(state: InteractiveState): string {
    const { renderInput: renderInputComp } = require('../interactive/components/Input');
    return renderInputComp(state.input, '> ', this.width);
  }

  private renderFooter(state: InteractiveState): string {
    const { renderFooter: renderFooterComp } = require('../interactive/components/Footer');
    return renderFooterComp(state, { width: this.width });
  }

  private renderModal(modal: InteractiveState['modal']): string {
    const { renderModal: renderModalComp } = require('../interactive/components/Modal');
    return renderModalComp(modal);
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.screen.start();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the application
   */
  stop(): void {
    this.screen.stop();
    this.isRunning = false;
  }

  /**
   * Force re-render
   */
  refresh(): void {
    this.render();
  }

  /**
   * Get state manager
   */
  getState(): StateManager {
    return this.state;
  }
}
