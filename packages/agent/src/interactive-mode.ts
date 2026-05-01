// SPDX-License-Identifier: Apache-2.0
/**
 * InteractiveMode - Kết hợp TUI với Agent
 * 
 * Phần session engine từ llm-context/interactive-mode.ts
 * Kết hợp với TerminalUI từ @picro/tui và Agent từ @picro/agent
 */

import type { Terminal } from '@picro/tui';
import { TerminalUI, ProcessTerminal, Input } from '@picro/tui';
import { ElementContainer } from '@picro/tui';
import { Agent } from './agent.js';
import type { AgentConfig, AgentRunResult, ToolDefinition } from './types.js';
import type { Model } from '@picro/llm';

export interface TerminalAgentRuntimeOptions {
  /** Terminal instance (defaults to ProcessTerminal) */
  terminal?: Terminal;
  /** Agent instance */
  agent: Agent;
  /** Custom TerminalUI options */
  tuiOptions?: {
    showHardwareCursor?: boolean;
  };
  /** Initial status message */
  initialStatus?: string;
  /** Input placeholder */
  inputPlaceholder?: string;
  /** Called when agent returns a result */
  onAgentResult?: (result: AgentRunResult) => void;
  /** Called on each turn */
  onTurn?: (role: 'user' | 'assistant', content: string) => void;
  /** Show loading indicator while agent runs */
  showWorking?: boolean;
}

/**
 * AgentSessionRuntime - Chạy agent trong terminal với TUI
 * 
 * Phần session engine + TUI kết hợp
 * 
 *_usage:
 * ```ts
 * import { AgentSessionRuntime } from '@picro/agent';
 * import { Agent } from '@picro/agent';
 * 
 * const agent = new Agent(model, tools, config);
 * const runtime = new AgentSessionRuntime({ agent });
 * await runtime.run();
 * ```
 */
export class TerminalAgentRuntime {
  private terminal: Terminal;
  private tui: TerminalUI;
  private agent: Agent;
  private running = false;
  private onAgentResult?: (result: AgentRunResult) => void;
  private onTurn?: (role: 'user' | 'assistant', content: string) => void;
  private showWorking: boolean;
  private inputPlaceholder: string;

  // UI elements for status
  private statusText: string = '';
  private loadingMessage: string = 'Thinking...';

  // Input state
  private inputContainer!: ElementContainer;
  private inputComponent!: Input;
  private inputResolver?: (value: string) => void;

  constructor(options: TerminalAgentRuntimeOptions) {
    this.terminal = options.terminal || new ProcessTerminal();
    this.tui = new TerminalUI(this.terminal, options.tuiOptions?.showHardwareCursor);
    this.agent = options.agent;
    this.onAgentResult = options.onAgentResult;
    this.onTurn = options.onTurn;
    this.showWorking = options.showWorking ?? true;
    this.inputPlaceholder = options.inputPlaceholder || 'You: ';
    
    if (options.initialStatus) {
      this.statusText = options.initialStatus;
    }

    this.setupInput();
  }

  private setupInput(): void {
    // Tạo input component
    this.inputComponent = new Input({
      placeholder: this.inputPlaceholder,
      onSubmit: (value) => {
        if (this.inputResolver) {
          const resolver = this.inputResolver;
          this.inputResolver = undefined;
          resolver(value);
        }
      },
      onCancel: () => {
        if (this.inputResolver) {
          const resolver = this.inputResolver;
          this.inputResolver = undefined;
          resolver('');
        }
      },
    });

    // Container
    this.inputContainer = new ElementContainer();
    this.inputContainer.append(this.inputComponent);

    // Thêm vào TUI
    this.tui.append(this.inputContainer);
  }

  /**
   * Get the TerminalUI instance
   */
  get tuiInstance(): TerminalUI {
    return this.tui;
  }

  /**
   * Get the Agent instance
   */
  get agentInstance(): Agent {
    return this.agent;
  }

  /**
   * Set status message
   */
  setStatus(message: string): void {
    this.statusText = message;
    this.tui.requestRender();
  }

  /**
   * Set working indicator
   */
  setWorking(message: string | null): void {
    if (message === null) {
      this.loadingMessage = '';
    } else {
      this.loadingMessage = message || 'Thinking...';
    }
    this.tui.requestRender();
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    this.setStatus(`Error: ${message}`);
  }

  /**
   * Run interactive mode - blocks until user exits
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Start TUI
    this.tui.start();
    this.setStatus(this.statusText || 'Ready');

    // Focus input
    this.tui.setFocus(this.inputComponent);

    try {
      while (this.running) {
        // Get user input
        const userInput = await this.getUserInput();
        
        if (!userInput.trim()) {
          // Empty input - exit
          break;
        }

        // Show user message in UI
        this.onTurn?.('user', userInput);

        // Show working indicator
        if (this.showWorking) {
          this.setWorking(this.loadingMessage);
        }

        try {
          // Run agent
          const result = await this.agent.run(userInput);
          
          // Clear working
          this.setWorking(null);

          // Show result
          if (result.finalAnswer) {
            this.onTurn?.('assistant', result.finalAnswer);
          }

          // Callback
          this.onAgentResult?.(result);

          this.setStatus('Ready');
        } catch (error) {
          this.setWorking(null);
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.showError(message);
        }

        // Refocus input cho lần tiếp theo
        this.tui.setFocus(this.inputComponent);
      }
    } finally {
      this.stop();
    }
  }

  /**
   * Get user input from TUI Input component
   */
  private getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this.inputResolver = resolve;
      // Focus input component
      this.tui.setFocus(this.inputComponent);
    });
  }

  /**
   * Stop interactive mode
   */
  stop(): void {
    this.running = false;
    if (this.inputResolver) {
      this.inputResolver('');
      this.inputResolver = undefined;
    }
    this.setStatus('');
    this.tui.stop();
  }
}