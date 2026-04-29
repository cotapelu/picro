// SPDX-License-Identifier: Apache-2.0
/**
 * Coding Agent - Minimal REPL with AgentSessionRuntime
 */

import { createAgentSessionRuntime, createAgentSessionFromServices } from '@picro/agent';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import { homedir } from 'node:os';

const AGENT_DIR = join(homedir(), '.pi', 'agent');

async function main() {
  console.clear();
  console.log('🚀 Coding Agent (AgentSessionRuntime)\n');

  const cwd = process.cwd();

  // Ensure agent directory
  const fs = require('node:fs');
  if (!fs.existsSync(AGENT_DIR)) {
    fs.mkdirSync(AGENT_DIR, { recursive: true });
  }

  try {
    // Create runtime with factory
    const runtime = await createAgentSessionRuntime(
      async (options) => {
        const { createAgentSessionServices } = await import('@picro/agent');
        const services = await createAgentSessionServices({
          cwd: options.cwd,
          agentDir: options.agentDir,
        });

        return {
          session: await createAgentSessionFromServices({
            services,
            sessionManager: options.sessionManager,
          }),
          services,
          diagnostics: [],
        };
      },
      { cwd, agentDir: AGENT_DIR }
    );

    const session = runtime.session;

    // Show model
    if (session.model) {
      console.log(`✅ Model: ${session.model.provider}/${session.model.id}`);
    } else {
      console.log('✅ Using default model from settings');
    }
    console.log(`   CWD: ${cwd}\n`);

    // Subscribe to events
    session.subscribe((event: any) => {
      if (event.type === 'message:end' && event.turn?.role === 'assistant') {
        const content = typeof event.turn.content === 'string'
          ? event.turn.content
          : (event.turn.content as any[])?.find((c: any) => c.type === 'text')?.text || '';
        if (content) {
          console.log(`\n🤖 Assistant: ${content}\n`);
        }
      }
      if (event.type === 'tool_call:start' && event.toolName) {
        console.log(`🔧 Running: ${event.toolName}`);
      }
      if (event.type === 'error') {
        console.error(`❌ Error: ${event.message}`);
      }
    });

    // REPL
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖> ',
    });

    rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) {
        rl.prompt();
        return;
      }

      if (trimmed === '/exit' || trimmed === '/quit') {
        await runtime.dispose();
        rl.close();
        process.exit(0);
        return;
      }

      if (trimmed === '/models') {
        try {
          const models = await session.modelRegistry.getAvailable();
          console.log('\n📦 Models:');
          for (const m of models) {
            console.log(`   ${m.provider}/${m.id}`);
          }
          console.log('');
        } catch (e) {
          console.error('Failed to list models');
        }
        rl.prompt();
        return;
      }

      if (trimmed === '/thinking') {
        const levels: Array<'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'> = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
        const current = session.thinkingLevel as string;
        const currentIdx = levels.indexOf(current as any);
        if (currentIdx === -1) {
          session.setThinkingLevel('medium');
          console.log(`🧠 Thinking level: medium\n`);
        } else {
          const next = levels[(currentIdx + 1) % levels.length];
          session.setThinkingLevel(next);
          console.log(`🧠 Thinking level: ${next}\n`);
        }
        rl.prompt();
        return;
      }

      if (trimmed === '/clear') {
        console.clear();
        rl.prompt();
        return;
      }

      console.log(`\n👤 You: ${trimmed}\n`);
      try {
        await session.prompt(trimmed);
      } catch (error: any) {
        console.error(`❌ ${error.message}\n`);
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      await runtime.dispose();
      process.exit(0);
    });

    rl.prompt();

  } catch (error: any) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main().catch(console.error);
