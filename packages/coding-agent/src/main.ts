#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Coding Agent - Main entry point
 * 
 * Sử dụng cấp cao nhất: AgentSessionRuntime
 */

import { TerminalUI, ProcessTerminal } from '@picro/tui';
import { 
  createAgentSessionRuntime, 
  type AgentSessionRuntime,
  type CreateAgentSessionRuntimeFactory 
} from '@picro/agent';
import type { Model } from '@picro/llm';
import { join } from 'node:path';
import { homedir } from 'node:os';
import fs from 'node:fs';

const AGENT_DIR = join(homedir(), '.pi', 'agent');

/**
 * Demo model config
 */
const modelConfig: Model = {
  id: 'claude-3-5-sonnet-20241022',
  name: 'Claude 3.5 Sonnet',
  provider: 'anthropic',
  api: 'anthropic',
  baseUrl: 'https://api.anthropic.com',
  contextWindow: 200000,
  maxTokens: 8192,
  reasoning: true,
  input: ['text', 'image'],
  cost: {
    input: 0.003,
    output: 0.015,
    cacheRead: 0,
    cacheWrite: 0
  }
};

async function main() {
  console.clear();
  console.log('🚀 Coding Agent\n');
  console.log('Model:', modelConfig.provider + '/' + modelConfig.id);
  console.log('');
  
  const cwd = process.cwd();
  if (!fs.existsSync(AGENT_DIR)) {
    fs.mkdirSync(AGENT_DIR, { recursive: true });
  }

  // Create terminal
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);

  // Create runtime factory
  const runtimeFactory: CreateAgentSessionRuntimeFactory = async (options) => {
    const { createAgentSessionServices, createAgentSessionFromServices } = await import('@picro/agent');
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
  };

  // Create AgentSessionRuntime (cấp cao nhất)
  const runtime: AgentSessionRuntime = await createAgentSessionRuntime(
    runtimeFactory,
    { cwd, agentDir: AGENT_DIR }
  );

  const session = runtime.session;

  console.log('✅ Ready! Gõ exit để thoát.\n');

  // Main loop - dùng session.prompt()
  tui.start();
  tui.requestRender();

  // Đơn giản: dùng readline cho input
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  
  rl.question('> ', async (input) => {
    if (!input.trim() || input === 'exit') {
      rl.close();
      tui.stop();
      process.exit(0);
    }

    try {
      await session.prompt(input);
    } catch (error) {
      console.log('Error:', error instanceof Error ? error.message : error);
    }

    rl.close();
    tui.stop();
  });

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});