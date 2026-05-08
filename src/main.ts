/**
 * Simple Agent TUI Demo
 *
 * Basic terminal UI integration without full InteractiveMode.
 */

import { createAgentSessionRuntime } from './agent';
import { TerminalUI, ProcessTerminal } from './tui';
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove surrounding quotes if present
          const cleaned = value.replace(/^["']|["']$/g, '');
          process.env[key] = cleaned;
        }
      }
    }
  }
}

async function main(): Promise<void> {
  loadEnvFile();
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
      model: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16',
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
