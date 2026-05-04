/**
 * Agent + InteractiveMode Demo
 *
 * Highest-level TUI integration using InteractiveMode.
 * This is the RECOMMENDED approach for building agent UIs.
 *
 * Features:
 * - Built-in chat layout (messages, input, footer)
 * - Message types: user, assistant, tool
 * - Status updates, widgets, dialogs
 * - Simple event-driven architecture
 *
 * Run: npm run start:example
 */

import { createAgentSessionRuntime } from '@picro/agent';
import type { AgentSessionRuntime } from '@picro/agent';

import { InteractiveMode } from '@picro/tui';
import { TerminalUI, ProcessTerminal } from '@picro/tui';

async function main(): Promise<void> {
  console.log('🚀 Agent + InteractiveMode\n');

  // Create agent runtime (high-level API)
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

  // Create InteractiveMode (top-level TUI)
  const interactive = new InteractiveMode({
    tui: new TerminalUI(new ProcessTerminal()),
    inputPlaceholder: 'Type a message... (Ctrl+C to quit)',
    initialStatus: 'Ready',
    onUserInput: async (text: string) => {
      // Forward user input to agent
      try {
        await runtime.session.prompt(text);
      } catch (error: any) {
        interactive.setStatus(`❌ ${error.message}`);
      }
    },
  });

  // Subscribe to agent events to update chat UI
  const session = runtime.session;

  session.subscribe((event: any) => {
    const t = event.type;

    // Status
    if (t === 'agent:start') interactive.setStatus('🤖 Running...');
    if (t === 'agent:end') interactive.setStatus('✅ Ready');
    if (t === 'turn:start') interactive.setStatus(`Turn ${event.turnIndex}...`);

    // User message
    if (t === 'message:end' && event.role === 'user') {
      const text = event.content?.map((b: any) => b.text || '').join('').trim();
      if (text) interactive.addUserMessage(text);
    }

    // Assistant message
    if (t === 'message:end' && event.role === 'assistant') {
      const text = event.content?.map((b: any) => b.text || '').join('').trim();
      if (text) interactive.addAssistantMessage(text);
    }

    // Tool start
    if (t === 'tool:call:start' || t === 'toolcall_start') {
      const name = event.toolCall?.name || event.toolName || 'tool';
      interactive.addToolMessage(name, 'Executing...');
    }

    // Tool end
    if (t === 'tool:call:end' || t === 'toolcall_end') {
      const result = event.toolResult || event.result;
      const ok = result?.success ?? false;
      const out = result?.output?.toString().slice(0, 500) || '';
      interactive.addToolMessage(
        ok ? '✓ Success' : '✗ Failed',
        out,
        result?.exitCode
      );
    }

    // Progress
    if (t === 'tool:progress') {
      interactive.setStatus(event.message?.slice(0, 50) || '...');
    }

    // Error
    if (t === 'error') {
      interactive.setStatus(`❌ ${event.error?.message || 'Error'}`);
    }
  });

  console.log('✨ Ready! Type your message and press Enter.');
  console.log('   Press Ctrl+C to exit.\n');

  // Start interactive loop (blocks)
  await interactive.run();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
