#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Coding Agent - Main entry point
 * 
 * Sử dụng:
 * - InteractiveMode từ @picro/agent (kết hợp TUI + Agent)
 * - TerminalUI từ @picro/tui (nếu cần thêm UI components)
 */

import { TerminalAgentRuntime, Agent, ToolDefinition } from '@picro/agent';
import { TerminalUI, ProcessTerminal, UserMessage, AssistantMessage, ToolMessage } from '@picro/tui';
import type { Model, Message } from '@picro/llm';
import { complete } from '@picro/llm';
import { join } from 'node:path';
import { homedir } from 'node:os';
import fs from 'node:fs';

const AGENT_DIR = join(homedir(), '.pi', 'agent');

/**
 * Demo tools - thay bằng tools thật từ @picro/agent
 */
const tools: ToolDefinition[] = [
  {
    name: 'bash',
    description: 'Run a bash command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run' }
      },
      required: ['command']
    },
    handler: async (args: any, context: any): Promise<string> => {
      const { exec } = await import('node:child_process');
      return new Promise((resolve) => {
        exec(args.command, { cwd: context.cwd }, (error, stdout, stderr) => {
          if (error) {
            resolve(`Error: ${error.message}`);
          } else {
            resolve(stdout || stderr);
          }
        });
      });
    }
  },
  {
    name: 'read_file',
    description: 'Read a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' }
      },
      required: ['path']
    },
    handler: async (args: any, _context: any): Promise<string> => {
      const { readFile } = await import('node:fs/promises');
      try {
        const content = await readFile(join(process.cwd(), args.path), 'utf-8');
        return content.substring(0, 5000); // Limit output
      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    }
  },
  {
    name: 'write_file',
    description: 'Write to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    },
    handler: async (args: any, _context: any): Promise<string> => {
      const { writeFile } = await import('node:fs/promises');
      try {
        await writeFile(join(process.cwd(), args.path), args.content);
        return `Written to ${args.path}`;
      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    }
  }
];

/**
 * Demo model config - thay bằng model thật
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
  console.log('Tools:', tools.map(t => t.name).join(', '));
  console.log('');
  
  const cwd = process.cwd();
  if (!fs.existsSync(AGENT_DIR)) {
    fs.mkdirSync(AGENT_DIR, { recursive: true });
  }

  // Create Agent
  const agent = new Agent(modelConfig, tools, {
    maxRounds: 50,
    verbose: false,
    toolExecutionStrategy: 'parallel',
    steeringMode: 'dequeue-one',
    followUpMode: 'dequeue-one',
  });

  // Set LLM provider - dùng @picro/llm
  agent.setLLMProvider(async (prompt: string, _tools: any[], _options: any) => {
    try {
      const response = await complete(modelConfig, {
        messages: [{ role: 'user', content: prompt, timestamp: Date.now() }]
      }, {
        maxTokens: 4096,
      });
      return {
        content: response.content as string,
        stopReason: response.stopReason || 'stop',
        usage: response.usage,
        toolCalls: [],
      };
    } catch (error: any) {
      throw new Error(`LLM Error: ${error.message}`);
    }
  });

  // Create TerminalAgentRuntime
  const runtime = new TerminalAgentRuntime({
    agent,
    initialStatus: 'Ready',
    showWorking: true,
    onTurn: async (role, content) => {
      if (role === 'user') {
        console.log(`\n👤 You: ${content.substring(0, 50)}...`);
      } else {
        console.log(`🤖 Assistant: ${content.substring(0, 100)}...`);
      }
    },
    onAgentResult: (result) => {
      console.log(`\n✓ Done: ${result.totalRounds} rounds, ${result.totalToolCalls} tools`);
    }
  });

  console.log('✅ Ready! Gõ exit để thoát.\n');

  // Run - sẽ block cho đến khi user exit
  await runtime.run();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});