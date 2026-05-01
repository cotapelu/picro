// SPDX-License-Identifier: Apache-2.0
/**
 * TerminalAgentRuntime - Agent runtime với terminal I/O
 * 
 * COMPOSE, không phụ thuộc:
 * - tui: TRUYỀN VÀO (required)
 * - session: TRUYỀN VÀO (required) - AgentSession từ layer trên Agent
 */

import { AgentSession } from './agent-session.js';
import type { AgentSessionEvent } from './agent-session-types.js';
import type { AgentRunResult } from './types.js';
import { createEventBus, type EventBus, type EventBusController } from './event-bus.js';

export interface TerminalAgentRuntimeOptions {
  /** REQUIRED: tui instance - truyền vào từ bên ngoài */
  tui: any;
  /** Terminal instance */
  terminal?: any;
  /** REQUIRED: AgentSession - truyền vào */
  session: AgentSession;
  initialStatus?: string;
  onAgentResult?: (result: AgentRunResult) => void;
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
  private terminal?: any;
  private tui: any;
  private session: AgentSession;
  private bus: EventBusController;
  private onAgentResult?: (result: AgentRunResult) => void;
  private onUserInput?: (text: string) => void;
  private statusText: string = '';

  constructor(options: TerminalAgentRuntimeOptions) {
    // Dùng session được truyền vào (COMPOSE)
    this.tui = options.tui;
    this.terminal = options.terminal;
    this.session = options.session;
    this.onAgentResult = options.onAgentResult;
    this.onUserInput = options.onUserInput;
    this.statusText = options.initialStatus || 'Ready';

    // Tạo EventBus cho tui ↔ session communication
    this.bus = createEventBus();
    this.setupEventHandlers();
    this.subscribeToSession();
  }

  /**
   * Get EventBus để external có thể subscribe
   */
  get events(): EventBus {
    return this.bus;
  }

  private subscribeToSession(): void {
    // Subscribe to session events
    this.session.subscribe((event: AgentSessionEvent) => {
      switch (event.type) {
        case 'agent:start':
          this.setStatus('⏳ Working...');
          break;
        case 'agent:end':
          this.setStatus('Ready');
          break;
        case 'message:end':
          if (event.turn?.role === 'assistant') {
            const content = this.extractContent(event.turn.content);
            if (content) {
              this.bus.emit(EVENTS.AGENT_RESULT, { finalAnswer: content });
            }
          }
          break;
        case 'error':
          this.bus.emit(EVENTS.AGENT_ERROR, event.message);
          this.setStatus(`Error: ${event.message}`);
          break;
      }
    });
  }

  private extractContent(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('');
    }
    return '';
  }

  private setupEventHandlers(): void {
    // Khi có user input từ TUI
    this.bus.on(EVENTS.USER_INPUT, async (data) => {
      const input = data as string;
      if (!input.trim()) return;
      
      this.onUserInput?.(input);

      try {
        // Dùng session.prompt() thay vì agent.run()
        await this.session.prompt(input);
        // Result sẽ được emit qua session events
      } catch (error) {
        this.bus.emit(EVENTS.AGENT_ERROR, error);
        this.setStatus(`Error: ${error}`);
      }
    });
  }

  get tuiInstance(): any {
    return this.tui;
  }

  get sessionInstance(): AgentSession {
    return this.session;
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