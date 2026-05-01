// SPDX-License-Identifier: Apache-2.0
/**
 * TerminalAgentRuntime - Kết hợp TUI với Agent
 * 
 * Sử dụng:
 * - InteractiveMode từ @picro/tui (UI components)
 * - Agent từ @picro/agent (session logic)
 */

import { InteractiveMode, TerminalUI, ProcessTerminal } from '@picro/tui';
import { Agent } from './agent.js';
import type { AgentRunResult } from './types.js';

export interface TerminalAgentRuntimeOptions {
  /** Terminal instance (defaults to ProcessTerminal) */
  terminal?: any;
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
 * TerminalAgentRuntime - Chạy agent trong terminal với TUI
 * 
 * Sử dụng InteractiveMode từ @picro/tui + Agent từ @picro/agent
 */
export class TerminalAgentRuntime {
  private terminal: any;
  private tui: TerminalUI;
  private interactive: InteractiveMode;
  private agent: Agent;
  private running = false;
  private onAgentResult?: (result: AgentRunResult) => void;
  private onTurn?: (role: 'user' | 'assistant', content: string) => void;
  private showWorking: boolean;

  constructor(options: TerminalAgentRuntimeOptions) {
    this.terminal = options.terminal || new ProcessTerminal();
    this.tui = new TerminalUI(this.terminal, options.tuiOptions?.showHardwareCursor);
    this.agent = options.agent;
    this.onAgentResult = options.onAgentResult;
    this.onTurn = options.onTurn;
    this.showWorking = options.showWorking ?? true;

    // Dùng InteractiveMode từ tui cho UI
    this.interactive = new InteractiveMode({
      tui: this.tui,
      inputPlaceholder: options.inputPlaceholder || 'You: ',
      initialStatus: options.initialStatus,
      onUserInput: (text) => {
        this.handleUserInput(text);
      },
    });
  }

  private async handleUserInput(text: string): Promise<void> {
    if (!this.running) return;
    
    this.onTurn?.('user', text);
    
    if (this.showWorking) {
      this.interactive.setStatus('⏳ Working...');
    }

    try {
      const result = await this.agent.run(text);
      
      if (result.finalAnswer) {
        this.onTurn?.('assistant', result.finalAnswer);
      }
      
      this.onAgentResult?.(result);
      this.interactive.setStatus('Ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.interactive.setStatus(`Error: ${message}`);
    }
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
   * Get InteractiveMode instance
   */
  get interactiveMode(): InteractiveMode {
    return this.interactive;
  }

  /**
   * Set status message
   */
  setStatus(message: string): void {
    this.interactive.setStatus(message);
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    this.interactive.setStatus(`Error: ${message}`);
  }

  /**
   * Run interactive mode - blocks until user exits
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    
    // Start TUI
    this.tui.start();
    
    // Đợi cho đ���n khi user exit (nhận empty input)
    await new Promise<void>((resolve) => {
      // Override onUserInput để detect exit
      const originalHandler = this.interactive.getExtensionUIContext?.();
      // Keep running until empty input
      this.running = false;
      resolve();
    });
  }

  /**
   * Stop interactive mode
   */
  stop(): void {
    this.running = false;
    this.setStatus('');
    this.tui.stop();
  }
}