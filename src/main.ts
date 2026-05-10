/**
 * InteractiveMode TUI Demo
 *
 * Full terminal UI with InteractiveMode for chat interface.
 */

import { createAgentSessionRuntime, type AgentSessionRuntime } from './runtime';
import { TerminalUI, ProcessTerminal, InteractiveMode } from './tui';
import type { Model } from './llm';
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
  console.log('🚀 Picro Agent TUI Demo (InteractiveMode)\n');

  // Create agent runtime with proper Model type
  const model: Model = {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3.5-sonnet',
    api: 'anthropic',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    reasoning: false,
    input: ['text'],
    cost: { input: 0.000003, output: 0.000015, cacheRead: 0.0000003, cacheWrite: 0.000015 },
    contextWindow: 200000,
    maxTokens: 8192,
  };

  console.log('✅ Model configured');

  // Create agent session runtime
  let runtime: AgentSessionRuntime;
  
  try {
    runtime = await createAgentSessionRuntime(
      async () => ({ session: null as any, services: null as any, diagnostics: [] }),
      {
        cwd: process.cwd(),
        agentDir: '.picro-agent',
        model,
      }
    );
    console.log('✅ Runtime created');
  } catch (err) {
    console.error('❌ Failed to create runtime:', err);
    console.log('⚠️  Running in demo mode without backend...\n');
    runtime = null as any;
  }

  // Create terminal UI
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);

  // Create InteractiveMode
  const interactive = new InteractiveMode(tui, {
    inputPlaceholder: 'Type your message...',
    initialStatus: 'Ready',
  });

  // Connect runtime to interactive mode (if runtime exists)
  if (runtime) {
    interactive.setRuntime(runtime);
    console.log('✅ Runtime connected to InteractiveMode');
  }

  console.log('🎨 Starting InteractiveMode...\n');

  // Start the interactive mode (this blocks)
  try {
    await interactive.run();
  } catch (err) {
    console.error('\n❌ InteractiveMode error:', err);
  }

  tui.stop();
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});