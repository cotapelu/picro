/**
 * Command Tools
 * Tools for executing shell commands safely
 */

import { exec, spawn } from 'child_process';
import type { ToolDefinition, ToolHandler } from '@picro/agent';

export interface CommandToolOptions {
  timeout?: number;
  maxOutputSize?: number;
  allowedCommands?: string[];
  blockedCommands?: string[];
}

export class CommandTools {
  private timeout: number;
  private maxOutputSize: number;
  private allowedCommands: Set<string>;
  private blockedCommands: Set<string>;

  constructor(options: CommandToolOptions = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.maxOutputSize = options.maxOutputSize || 1024 * 1024; // 1MB default
    this.allowedCommands = new Set(options.allowedCommands || []);
    this.blockedCommands = new Set(options.blockedCommands || [
      'rm -rf /',
      'mkfs',
      'dd',
      'format',
      'fdisk',
      'shutdown',
      'reboot',
      'halt',
      'poweroff',
    ]);
  }

  private validateCommand(command: string): void {
    // Check blocked commands
    for (const blocked of this.blockedCommands) {
      if (command.toLowerCase().includes(blocked.toLowerCase())) {
        throw new Error(`Command is blocked: ${blocked}`);
      }
    }

    // Check allowed commands if specified
    if (this.allowedCommands.size > 0) {
      const commandName = command.trim().split(/\s+/)[0];
      if (!this.allowedCommands.has(commandName)) {
        throw new Error(`Command not allowed: ${commandName}`);
      }
    }
  }

  private truncateOutput(output: string): string {
    if (output.length <= this.maxOutputSize) {
      return output;
    }
    return output.substring(0, this.maxOutputSize) + '\n... (output truncated)';
  }

  private executeCommand(
    command: string,
    cwd?: string,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      this.validateCommand(command);

      const timer = setTimeout(() => {
        reject(new Error(`Command timeout after ${this.timeout}ms`));
      }, this.timeout);

      const args = command.trim().split(/\s+/);
      const cmd = args.shift()!;

      const child = spawn(cmd, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: this.truncateOutput(stdout),
          stderr: this.truncateOutput(stderr),
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private executeCommandStreaming(
    command: string,
    cwd?: string,
    env?: Record<string, string>,
    onChunk?: (chunk: string, isStderr: boolean) => void
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
      this.validateCommand(command);

      const timer = setTimeout(() => {
        reject(new Error(`Command timeout after ${this.timeout}ms`));
      }, this.timeout);

      const args = command.trim().split(/\s+/);
      const cmd = args.shift()!;

      const child = spawn(cmd, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        onChunk?.(text, false);
      });

      child.stderr?.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        onChunk?.(text, true);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: this.truncateOutput(stdout),
          stderr: this.truncateOutput(stderr),
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  // Tool handlers
  private handleExecute: ToolHandler = async (_context: any, args: any) => {
    const command = args?.command;
    const cwd = args?.cwd;
    const env = args?.env;

    if (!command) {
      throw new Error('Command is required. Provide a shell command like "ls -la"');
    }

    const result = await this.executeCommand(command, cwd, env);

    return JSON.stringify({
      success: result.exitCode === 0,
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  };

  private handleExecuteStreaming: ToolHandler = async (
    _context: any,
    args: any,
    onProgress?: (update: any) => void
  ) => {
    const command = args?.command;
    const cwd = args?.cwd;
    const env = args?.env;

    if (!command) {
      throw new Error('Command is required');
    }

    const chunks: string[] = [];

    const result = await this.executeCommandStreaming(
      command,
      cwd,
      env,
      (chunk, isStderr) => {
        chunks.push(chunk);
        onProgress?.({
          type: 'chunk',
          chunk,
          isStderr,
        });
      }
    );

    return JSON.stringify({
      success: result.exitCode === 0,
      command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      chunks: chunks.length,
    });
  };

  private handleShell: ToolHandler = async (_context: any, args: any) => {
    const commands = args?.commands;

    if (!commands || !Array.isArray(commands)) {
      throw new Error('Commands array is required');
    }

    const results: any[] = [];

    for (const cmd of commands) {
      try {
        const result = await this.executeCommand(cmd.command, cmd.cwd, cmd.env);
        results.push({
          command: cmd.command,
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        });
      } catch (error: any) {
        results.push({
          command: cmd.command,
          success: false,
          error: error.message,
        });
      }
    }

    return JSON.stringify({
      success: results.every(r => r.success),
      results,
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  };

  private handleWhich: ToolHandler = async (_context: any, args: any) => {
    const command = args?.command;

    if (!command) {
      throw new Error('Command name is required');
    }

    try {
      const result = await this.executeCommand(`which ${command}`);
      return JSON.stringify({
        success: result.exitCode === 0,
        command,
        path: result.stdout.trim(),
        exists: result.exitCode === 0,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        command,
        path: null,
        exists: false,
        error: error.message,
      });
    }
  };

  private handleTest: ToolHandler = async (_context: any, args: any) => {
    const command = args?.command;

    if (!command) {
      throw new Error('Command is required');
    }

    try {
      // Use 'type' command to test if command exists
      const result = await this.executeCommand(`type ${command}`);
      return JSON.stringify({
        success: result.exitCode === 0,
        command,
        exists: result.exitCode === 0,
        info: result.stdout.trim(),
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        command,
        exists: false,
        error: error.message,
      });
    }
  };

  // Get all tool definitions
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'command_execute',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute',
            },
            cwd: {
              type: 'string',
              description: 'Working directory (default: current directory)',
            },
            env: {
              type: 'object',
              description: 'Environment variables',
            },
          },
          required: ['command'],
        },
        handler: this.handleExecute,
      },
      {
        name: 'command_execute_streaming',
        description: 'Execute a shell command with streaming output',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute',
            },
            cwd: {
              type: 'string',
              description: 'Working directory',
            },
            env: {
              type: 'object',
              description: 'Environment variables',
            },
          },
          required: ['command'],
        },
        handler: this.handleExecuteStreaming,
      },
      {
        name: 'command_shell',
        description: 'Execute multiple shell commands in sequence',
        parameters: {
          type: 'object',
          properties: {
            commands: {
              type: 'array',
              description: 'Array of commands to execute',
              items: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description: 'Command to execute',
                  },
                  cwd: {
                    type: 'string',
                    description: 'Working directory',
                  },
                  env: {
                    type: 'object',
                    description: 'Environment variables',
                  },
                },
                required: ['command'],
              },
            },
          },
          required: ['commands'],
        },
        handler: this.handleShell,
      },
      {
        name: 'command_which',
        description: 'Find the path to a command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command name to find',
            },
          },
          required: ['command'],
        },
        handler: this.handleWhich,
      },
      {
        name: 'command_test',
        description: 'Test if a command exists',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command name to test',
            },
          },
          required: ['command'],
        },
        handler: this.handleTest,
      },
    ];
  }
}
