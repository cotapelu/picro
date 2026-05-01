// SPDX-License-Identifier: Apache-2.0
/**
 * TerminalAgentRuntime - Agent runtime với terminal I/O
 * 
 * Dùng EventBus để tui và agent nói chuyện
 */

import type { Terminal } from '@picro/tui';
import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { Agent } from './agent.js';
import type { AgentRunResult } from './types.js';
import { createEventBus, type EventBus, type EventBusController } from './event-bus.js';

export interface TerminalAgentRuntimeOptions {
  terminal?: Terminal;
  agent: Agent;
  tuiOptions?: {
    showHardwareCursor?: boolean;
  };
  initialStatus?: string;
  onAgentResult?: (result: AgentRunResult) => void;
  /** Callback cho user input */
  onUserInput?: (text: string) => void;
}

/**
 * Event channels
 */
export const EVENTS = {
  USER_INPUT: 'user:input',
  AGENT_RESULT: 'agent:result',
  AGENT_ERROR: 'agent:error',
  STATUS: 'status',
} as const;

/**
 * TerminalAgentRuntime - Dùng EventBus để communicate với UI
 */
export class TerminalAgentRuntime {
  private terminal: Terminal;
  private tui: TerminalUI;
  private agent: Agent;
  private bus: EventBusController;
  private onAgentResult?: (result: AgentRunResult) => void;
  private onUserInput?: (text: string) => void;
  private statusText: string = '';

  constructor(options: TerminalAgentRuntimeOptions) {
    this.terminal = options.terminal || new ProcessTerminal();
    this.tui = new TerminalUI(this.terminal, options.tuiOptions?.showHardwareCursor);
    this.agent = options.agent;
    this.onAgentResult = options.onAgentResult;
    this.onUserInput = options.onUserInput;
    this.statusText = options.initialStatus || 'Ready';

    // Tạo EventBus cho tui ↔ agent communication
    this.bus = createEventBus();
    this.setupEventHandlers();
  }

  /**
   * Get EventBus để external có thể subscribe
   */
  get events(): EventBus {
    return this.bus;
  }

  private setupEventHandlers(): void {
    // Khi có user input từ TUI
    this.bus.on(EVENTS.USER_INPUT, async (data) => {
      const input = data as string;
      if (!input.trim()) return;
      
      this.setStatus('⏳ Working...');

      this.onUserInput?.(input);

      try {
        const result = await this.agent.run(input);
        this.bus.emit(EVENTS.AGENT_RESULT, result);
        this.onAgentResult?.(result);
        this.setStatus('Ready');
      } catch (error) {
        this.bus.emit(EVENTS.AGENT_ERROR, error);
        this.setStatus(`Error: ${error}`);
      }
    });
  }

  get tuiInstance(): TerminalUI {
    return this.tui;
  }

  get agentInstance(): Agent {
    return this.agent;
  }

  /**
   * Emit event để update status
   */
  setStatus(message: string): void {
    this.statusText = message;
    this.bus.emit(EVENTS.STATUS, message);
  }

  showError(message: string): void {
    this.setStatus(`Error: ${message}`);
  }

  /**
   * Run
   */
  async run(): Promise<void> {
    this.tui.start();
    this.setStatus(this.statusText);
  }

  stop(): void {
    this.bus.clear();
    this.tui.stop();
  }
}