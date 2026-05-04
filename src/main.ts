/**
 * Agent TUI Integration - Full Example
 *
 * A terminal UI for AI agent using @picro/agent and @picro/tui
 */

import { createAgentSessionRuntime } from '@picro/agent';
import type { AgentSessionRuntime } from '@picro/agent';

import {
  TerminalUI,
  ProcessTerminal,
  Box,
  Text,
  Input,
  Divider,
} from '@picro/tui';
import type { ParsedKey, KeyHandler } from '@picro/tui';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'claude-3.5-sonnet';
const DEFAULT_THINKING_LEVEL: 'low' | 'medium' | 'high' = 'medium';
const MAX_MESSAGES = 100;

// ============================================================================
// AgentTUI: Connect AgentSessionRuntime with TerminalUI
// ============================================================================

export class AgentTUI {
  private runtime: AgentSessionRuntime;
  private tui: TerminalUI;

  private mainBox!: Box;
  private messagesBox!: Box;
  private input!: Input;
  private statusLine!: Text;
  private messageCount = 0;

  constructor(runtime: AgentSessionRuntime, tui: TerminalUI) {
    this.runtime = runtime;
    this.tui = tui;
    this.buildUI();
    this.setupAgentEvents();
    this.setupKeyHandlers();
  }

  private buildUI(): void {
    this.mainBox = new Box(1, 1);
    this.tui.append(this.mainBox);

    const session = this.runtime.session;
    const header = new Text(
      `🤖 Agent - Model: ${session.model?.name || 'none'} | Session: ${session.sessionId.slice(0, 8)}`,
      { color: 'cyan', bold: true }
    );
    this.mainBox.append(header);
    this.mainBox.append(new Divider());

    this.messagesBox = new Box(0, 0);
    this.mainBox.append(this.messagesBox);

    const inputLine = new Box(0, 0);
    const prompt = new Text('❯ ', { color: 'green', bold: true });
    this.input = new Input({
      placeholder: 'Ask the agent anything... (Ctrl+C to quit)',
      onSubmit: (value) => this.handleSubmit(value),
    });
    inputLine.append(prompt);
    inputLine.append(this.input);
    this.mainBox.append(inputLine);

    this.mainBox.append(new Divider());
    this.statusLine = new Text(' Ready', { color: 'gray' });
    this.mainBox.append(this.statusLine);

    this.tui.setFocus(this.input);
  }

  private setupAgentEvents(): void {
    const session = this.runtime.session;

    session.subscribe((event: any) => {
      const t = event.type;
      if (t === 'agent:start') this.setStatus('Running...');
      if (t === 'agent:end') this.setStatus('Ready');
      if (t === 'turn:start') this.addMessage(`[Turn ${event.turnIndex}]`, 'dim');
      if (t === 'message:end' && event.role === 'assistant') {
        const content = event.content?.map((b: any) => b.text || `[${b.type}]`).join('\n');
        this.addMessage(`Agent: ${content}`, 'white');
      }
      if (t === 'tool:call:start' || t === 'toolcall_start') {
        const name = event.toolCall?.name || event.toolName || 'tool';
        this.addMessage(`🔧 ${name}`, 'yellow');
      }
      if (t === 'tool:call:end' || t === 'toolcall_end') {
        const result = event.toolResult || event.result;
        const ok = result?.success ?? false;
        const out = result?.output?.toString().slice(0, 300) || '';
        this.addMessage(`   → ${out}`, ok ? 'green' : 'red');
        if (!ok && result?.error) this.addMessage(`   Error: ${result.error}`, 'red');
      }
      if (t === 'tool:progress') {
        this.setStatus(`Progress: ${event.message?.slice(0, 40)}`);
      }
      if (t === 'error') {
        this.addMessage(`❌ Error: ${event.error?.message || 'Unknown'}`, 'red');
        this.setStatus('Error');
      }
    });
  }

  private setupKeyHandlers(): void {
    const handler: KeyHandler = (key) => {
      if (key.modifiers?.ctrl && key.name === 'c') {
        this.setStatus('Shutting down...');
        process.exit(0);
      }
      return undefined;
    };
    this.tui.addKeyHandler(handler);
  }

  private async handleSubmit(value: string): Promise<void> {
    const prompt = value.trim();
    if (!prompt) return;
    this.input.setValue('');
    this.addMessage(`You: ${prompt}`, 'cyan', { bold: true });
    this.setStatus('Agent thinking...');
    try {
      await this.runtime.session.prompt(prompt);
    } catch (e: any) {
      this.addMessage(`Error: ${e.message}`, 'red');
      this.setStatus('Error');
    }
  }

  private addMessage(text: string, color = 'white', opts?: any): void {
    const msg = new Text(text, { color, ...opts });
    this.messagesBox.append(msg);
    this.messageCount++;
    if (this.messageCount > MAX_MESSAGES) {
      const excess = this.messageCount - MAX_MESSAGES;
      const removed = this.messagesBox.children.splice(0, excess);
      this.messageCount = MAX_MESSAGES;
    }
    this.tui.requestRender();
  }

  private setStatus(status: string): void {
    this.statusLine.setContent(` ${status}`);
    this.tui.requestRender();
  }

  public start(): void {
    this.tui.start();
  }

  public async dispose(): Promise<void> {
    await this.runtime.dispose();
    this.tui.stop();
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🤖 Starting Agent TUI...');

  const runtime = await createAgentSessionRuntime(
    async () => ({
      session: null as any,
      services: null as any,
      diagnostics: [],
    }),
    {
      cwd: process.cwd(),
      agentDir: './.pi/agent',
      model: DEFAULT_MODEL,
      thinkingLevel: DEFAULT_THINKING_LEVEL,
      tools: ['bash', 'read', 'write', 'edit', 'ls'],
    }
  );

  console.log('   Agent ready');
  console.log('   Starting TUI...');

  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);

  const agentTui = new AgentTUI(runtime, tui);

  console.log('✨ TUI started. Type your message and press Enter.');
  console.log('   Press Ctrl+C to exit.\n');

  agentTui.start();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
