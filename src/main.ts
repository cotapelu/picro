/**
 * Agent + InteractiveMode (Full Integration)
 *
 * Highest-level TUI integration.
 * AgentInteractiveMode wraps InteractiveMode and automatically connects
 * to AgentSessionRuntime.
 *
 * Run: npm start
 */

import { createAgentSessionRuntime } from '@picro/agent';
import type { AgentSessionRuntime, AgentSession } from '@picro/agent';

import { InteractiveMode } from '@picro/tui';
import { TerminalUI, ProcessTerminal } from '@picro/tui';

// ============================================================================
// AgentInteractiveMode - Glue layer (top-level TUI class)
// ============================================================================

/**
 * AgentInteractiveMode connects an AgentSessionRuntime to InteractiveMode.
 *
 * It automatically:
 * - Forwards user input to session.prompt()
 * - Subscribes to session events and updates UI
 * - Manages status, messages, tool display
 */
class AgentInteractiveMode extends InteractiveMode {
  private runtime: AgentSessionRuntime;
  private session: AgentSession;

  constructor(runtime: AgentSessionRuntime, options: {
    tui: TerminalUI;
    inputPlaceholder?: string;
    initialStatus?: string;
  }) {
    super({
      tui: options.tui,
      inputPlaceholder: options.inputPlaceholder ?? 'Type a message... (Ctrl+C to quit)',
      initialStatus: options.initialStatus ?? 'Ready',
      onUserInput: (text: string) => this.handleUserInput(text),
    });

    this.runtime = runtime;
    this.session = runtime.session;
    this.setupAgentEvents();
  }

  /**
   * Handle user input: forward to agent
   */
  private async handleUserInput(text: string): Promise<void> {
    try {
      await this.session.prompt(text);
    } catch (error: any) {
      this.setStatus(`❌ ${error.message}`);
    }
  }

  /**
   * Subscribe to agent events and update UI
   */
  private setupAgentEvents(): void {
    this.session.subscribe((event: any) => {
      const t = event.type;

      // Agent lifecycle
      if (t === 'agent:start') this.setStatus('🤖 Running...');
      if (t === 'agent:end') this.setStatus('✅ Ready');
      if (t === 'turn:start') this.setStatus(`Turn ${event.turnIndex}...`);

      // User message (echo)
      if (t === 'message:end' && event.role === 'user') {
        const text = event.content?.map((b: any) => b.text || '').join('').trim();
        if (text) this.addUserMessage(text);
      }

      // Assistant message
      if (t === 'message:end' && event.role === 'assistant') {
        const text = event.content?.map((b: any) => b.text || '').join('').trim();
        if (text) this.addAssistantMessage(text);
      }

      // Tool start
      if (t === 'tool:call:start' || t === 'toolcall_start') {
        const name = event.toolCall?.name || event.toolName || 'tool';
        this.addToolMessage(name, 'Executing...');
      }

      // Tool end
      if (t === 'tool:call:end' || t === 'toolcall_end') {
        const result = event.toolResult || event.result;
        const ok = result?.success ?? false;
        const out = result?.output?.toString().slice(0, 500) || '';
        this.addToolMessage(
          ok ? '✓ Success' : '✗ Failed',
          out,
          result?.exitCode
        );
      }

      // Progress
      if (t === 'tool:progress') {
        this.setStatus(event.message?.slice(0, 50) || '...');
      }

      // Error
      if (t === 'error') {
        this.setStatus(`❌ ${event.error?.message || 'Error'}`);
      }
    });
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  console.log('🚀 Agent InteractiveMode Demo\n');

  // 1. Create agent runtime (high-level API)
  const runtime = await createAgentSessionRuntime(
    async () => ({
      session: null as any,
      services: null as any,
      diagnostics: [],
    }),
    {
      cwd: process.cwd(),
      agentDir: './.pi/agent',
      model: 'claude-3.5-sonnet',
      thinkingLevel: 'medium',
      tools: ['bash', 'read', 'write', 'edit', 'ls'],
    }
  );

  console.log('✅ Agent ready');
  console.log('🎨 Starting InteractiveMode...\n');

  // 2. Create TerminalUI (core TUI)
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);

  // 3. Create AgentInteractiveMode (glue + top-level)
  const interactive = new AgentInteractiveMode(runtime, {
    tui,
    inputPlaceholder: 'Ask anything... (Ctrl+C to quit)',
    initialStatus: 'Ready',
  });

  console.log('✨ Ready! Type your message.\n');
  console.log('─────────────────────────────────────');

  // 4. Run (blocking event loop)
  await interactive.run();
}

// Error handling
main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
