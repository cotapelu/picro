/**
 * Full Integration Example
 *
 * Combines TUI + Agent + built-in tools.
 */

import { TerminalUI, ProcessTerminal, Text, UserMessage, AssistantMessage } from '@picro/tui';
import { AgentSession, createBashToolDefinition, createReadToolDefinition } from '@picro/agent';

async function main() {
  // Create TUI
  const terminal = new ProcessTerminal();
  const tui = new TerminalUI(terminal);
  tui.start();

  // Simple UI layout
  class ChatUI extends ElementContainer {
    messages: any[] = [];

    addUser(text: string) {
      this.messages.push(new UserMessage({ text }));
      tui.requestRender();
    }

    addAssistant(text: string) {
      this.messages.push(new AssistantMessage({ content: text }));
      tui.requestRender();
    }

    draw(context) {
      const lines: string[] = [];
      for (const msg of this.messages.slice(-context.height + 2)) {
        const msgLines = msg.draw({ width: context.width, height: 1e6 });
        lines.push(...msgLines);
      }
      return lines;
    }
  }

  const chatUI = new ChatUI();
  tui.append(chatUI);

  // Create agent session
  const session = new AgentSession({
    cwd: process.cwd(),
    model: 'anthropic/claude-3.5-sonnet',
  });

  // Register tools
  session.registerTool(createBashToolDefinition());
  session.registerTool(createReadToolDefinition());

  chatUI.addUser('Hello! Can you help me explore this directory?');

  try {
    const response = await session.prompt(`
      List files in the current directory using the ls tool.
      Then read the README.md file if it exists.
    `);

    chatUI.addAssistant(response.content);
  } catch (error) {
    chatUI.addAssistant(`Error: ${error}`);
  }

  console.log('Agent running. Check terminal for UI.');
}

main().catch(console.error);
