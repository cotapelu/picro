// SPDX-License-Identifier: Apache-2.0
/**
 * TerminalAgentRuntime - Agent runtime với terminal I/O
 * 
 * Phần Agent: run loop, tool execution, session logic
 * Phần UI: Tự implement (không dùng InteractiveMode từ tui)
 */

import type { Terminal } from '@picro/tui';
import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { Agent } from './agent.js';
import type { AgentRunResult } from './types.js';

export interface TerminalAgentRuntimeOptions {
  terminal?: Terminal;
  agent: Agent;
  tuiOptions?: {
    showHardwareCursor?: boolean;
  };
  initialStatus?: string;
  inputPlaceholder?: string;
  onAgentResult?: (result: AgentRunResult) => void;
  onTurn?: (role: 'user' | 'assistant', content: string) => void;
  showWorking?: boolean;
}

/**
 * TerminalAgentRuntime - Tự implement UI riêng, không dùng tui InteractiveMode
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
  private statusText: string = '';
  private inputBuffer: string = '';

  constructor(options: TerminalAgentRuntimeOptions) {
    this.terminal = options.terminal || new ProcessTerminal();
    this.tui = new TerminalUI(this.terminal, options.tuiOptions?.showHardwareCursor);
    this.agent = options.agent;
    this.onAgentResult = options.onAgentResult;
    this.onTurn = options.onTurn;
    this.showWorking = options.showWorking ?? true;
    this.inputPlaceholder = options.inputPlaceholder || '> ';
    this.statusText = options.initialStatus || 'Ready';
  }

  get tuiInstance(): TerminalUI {
    return this.tui;
  }

  get agentInstance(): Agent {
    return this.agent;
  }

  setStatus(message: string): void {
    this.statusText = message;
    this.tui.requestRender();
  }

  showError(message: string): void {
    this.setStatus(`Error: ${message}`);
  }

  /**
   * Run - Main loop
   */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.tui.start();
    this.setStatus(this.statusText);

    try {
      while (this.running) {
        const input = await this.getInput();
        if (!input.trim()) break;
        
        this.onTurn?.('user', input);
        if (this.showWorking) this.setStatus('⏳ Working...');

        try {
          const result = await this.agent.run(input);
          const answer = typeof result.finalAnswer === 'string' ? result.finalAnswer : '';
          if (answer) this.onTurn?.('assistant', answer);
          this.onAgentResult?.(result);
          this.setStatus('Ready');
        } catch (error) {
          this.showError(error instanceof Error ? error.message : 'Unknown');
        }
      }
    } finally {
      this.stop();
    }
  }

  /**
   * Get input from terminal - đơn giản
   */
  private getInput(): Promise<string> {
    return new Promise((resolve) => {
      // Đợi input đơn giản - trong thực tế sẽ dùng readline
      import('readline').then(rl => {
        const r = rl.createInterface({ input: process.stdin, output: process.stdout });
        r.question(this.inputPlaceholder, (answer) => {
          r.close();
          resolve(answer);
        });
      }).catch(() => resolve(''));
    });
  }

  stop(): void {
    this.running = false;
    this.setStatus('');
    this.tui.stop();
  }
}