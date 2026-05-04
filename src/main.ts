/**
 * Simple Agent TUI Demo
 *
 * Basic terminal UI integration without full InteractiveMode.
 */

import { createAgentSessionRuntime } from './agent';
import { TerminalUI, ProcessTerminal } from './tui';

async function main(): Promise<void> {
  console.log('🚀 Picro Agent TUI Demo\n');

  // Create agent runtime
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
  console.log('🎨 Starting TerminalUI...\n');

  // Create terminal UI
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);

  // Start the UI
  tui.start();

  console.log('✨ Ready! Press Ctrl+C to quit.\n');

  // Keep process alive
  process.on('SIGINT', () => {
    tui.stop();
    process.exit(0);
  });

  // Simple event loop wait
  await new Promise(() => {}); // run forever until SIGINT
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
