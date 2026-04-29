#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Coding Agent - Interactive Mode with AgentSessionRuntime + TUI
 */

import {
  TerminalUI,
  ProcessTerminal,
  InteractiveMode,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  SelectList,
  Modal,
  themeManager,
  darkTheme,
} from '@picro/tui';

import { createAgentSessionRuntime, createAgentSessionFromServices } from '@picro/agent';
import { join } from 'node:path';
import { homedir } from 'node:os';
import fs from 'node:fs';

const AGENT_DIR = join(homedir(), '.pi', 'agent');

async function main() {
  console.clear();
  console.log('🚀 Coding Agent (InteractiveMode)\n');

  const cwd = process.cwd();
  if (!fs.existsSync(AGENT_DIR)) {
    fs.mkdirSync(AGENT_DIR, { recursive: true });
  }

  try {
    // Create runtime
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

    // Setup TUI
    const terminal = new ProcessTerminal();  // No options
    const tui = new TerminalUI(terminal);
    themeManager.setTheme(darkTheme);

    // Create InteractiveMode - it auto-appends its chat interface to tui
    const interactive = new InteractiveMode({
      tui,
      inputPlaceholder: '💬 Tell me what you want to build...',
      onUserInput: async (input: string) => {
        await handleUserInput(input, session, interactive);
      },
    });

    // Subscribe to session events
    session.subscribe((event: any) => {
      handleSessionEvent(event, interactive);
    });

    // Initial status
    if (session.model) {
      interactive.setStatus(`Model: ${session.model.provider}/${session.model.id} | Thinking: ${session.thinkingLevel}`);
    } else {
      interactive.setStatus('Ready (no model set)');
    }

    console.log('✅ Ready!');
    tui.start();

  } catch (error: any) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

async function handleUserInput(input: string, session: any, interactive: any) {
  const trimmed = input.trim();
  if (!trimmed) return;

  // Commands
  if (trimmed === '/exit' || trimmed === '/quit') {
    process.exit(0);
    return;
  }

  if (trimmed === '/clear') {
    interactive.addAssistantMessage('--- Chat cleared ---');
    return;
  }

  if (trimmed === '/models') {
    await listModels(session, interactive);
    return;
  }

  if (trimmed === '/thinking') {
    cycleThinking(session, interactive);
    return;
  }

  // Add user message
  interactive.addUserMessage(trimmed);

  try {
    await session.prompt(trimmed);
  } catch (error: any) {
    interactive.addAssistantMessage(`❌ Error: ${error.message}`);
  }
}

function handleSessionEvent(event: any, interactive: any) {
  switch (event.type) {
    case 'agent:start':
      interactive.setStatus('⏳ Processing...');
      break;

    case 'agent:end':
      interactive.setStatus('Ready');
      break;

    case 'message:end':
      if (event.turn?.role === 'assistant') {
        const content = typeof event.turn.content === 'string'
          ? event.turn.content
          : (Array.isArray(event.turn.content) ? event.turn.content : [])
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join('');
        if (content) {
          interactive.addAssistantMessage(content);
        }
      }
      break;

    case 'error':
      interactive.addAssistantMessage(`❌ Error: ${event.message}`);
      break;
  }
}

async function listModels(session: any, interactive: any) {
  try {
    const models = await session.modelRegistry.getAvailable();
    if (models.length === 0) {
      interactive.addAssistantMessage('❌ No models available (check API keys)');
      return;
    }
    const modelList = models.map((m: any) => `  • ${m.provider}/${m.id}`).join('\n');
    interactive.addAssistantMessage(`📦 Available models:\n${modelList}`);
  } catch (error: any) {
    interactive.addAssistantMessage(`❌ Error: ${error.message}`);
  }
}

function cycleThinking(session: any, interactive: any) {
  const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  const current = session.thinkingLevel as string;
  const currentIdx = levels.indexOf(current);
  if (currentIdx === -1) {
    session.setThinkingLevel('medium');
    interactive.setStatus('Thinking: medium');
    return;
  }
  const next = levels[(currentIdx + 1) % levels.length];
  session.setThinkingLevel(next);
  interactive.setStatus(`Thinking: ${next}`);
}

main().catch(console.error);
