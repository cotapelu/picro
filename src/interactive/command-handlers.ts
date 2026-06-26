// Backend command handlers for slash commands
// Pure logic, reusable, testable - no React dependencies

import type { AgentSessionRuntimeInterface } from '../runtime/index.js';

export interface CommandContext {
  runtime: AgentSessionRuntimeInterface;
  messages: any[];
  cwd: string;
  // UI callbacks (optional, for toasts/modals)
  showToast?: (message: string, type?: 'info' | 'success' | 'error') => void;
  showModal?: (modal: any) => void;
}

/**
 * Handle all slash commands - returns result for FE to handle UI updates
 */
export async function handleCommand(ctx: CommandContext, commandId: string, slashArgs?: string): Promise<CommandResult | 'insert' | 'paste' | void> {
  const { runtime, cwd } = ctx;
  const builtInCmds = BUILTIN_SLASH_COMMANDS;

  const builtIn = builtInCmds.find(cmd => cmd.name === commandId);

  if (!builtIn) {
    return 'insert'; // Non-built-in, insert into input
  }

  // Extract args
  let args = '';
  if (slashArgs) {
    const withoutSlash = slashArgs.slice(1).trim();
    const parts = withoutSlash.split(' ');
    if (parts[0] === commandId) {
      args = parts.slice(1).join(' ').trim();
    }
  }

  switch (commandId) {
    case 'quit':
      process.exit(0);
      return { type: 'none' };

    case 'thinking':
      if (args && ['off','minimal','low','medium','high','xhigh'].includes(args)) {
        runtime.setThinkingLevel(args as any);
        return { type: 'toast', message: `Thinking level set to ${args}`, toastType: 'success' };
      } else {
        return { type: 'modal', modal: { type: 'thinking' } };
      }

    case 'login':
      return { type: 'modal', modal: { type: 'login' } };

    case 'help':
      return { type: 'modal', modal: { type: 'help' } };

    case 'copy':
      if (args === 'all') {
        const conversation = ctx.messages.map((m: any) => {
          const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
          return `${role}: ${m.content}`;
        }).join('\n\n');
        try {
          await runtime.copyToClipboard(conversation);
          return { type: 'toast', message: 'Copied full conversation to clipboard', toastType: 'success' };
        } catch (err) {
          return { type: 'toast', message: 'Copy failed', toastType: 'error' };
        }
      } else {
        const lastAssistant = [...ctx.messages].reverse().find((m: any) => m.role === 'assistant');
        if (lastAssistant) {
          try {
            await runtime.copyToClipboard(lastAssistant.content);
            return { type: 'toast', message: 'Copied last assistant message', toastType: 'success' };
          } catch (err) {
            return { type: 'toast', message: 'Copy failed', toastType: 'error' };
          }
        } else {
          return { type: 'toast', message: 'No assistant message to copy', toastType: 'info' };
        }
      }

    case 'resume':
      return { type: 'modal', modal: { type: 'session-selector' } };

    case 'new':
      return {
        type: 'modal',
        modal: {
          type: 'confirmation',
          title: 'New Session',
          message: 'Create a new session? Current session will be saved.',
          onConfirm: async () => {
            try {
              await runtime.newSession();
              return { type: 'toast', message: 'New session created', toastType: 'success' };
            } catch (err) {
              return { type: 'toast', message: 'Failed to create session', toastType: 'error' };
            }
          },
          onCancel: () => {}
        }
      };

    case 'settings':
      return { type: 'modal', modal: { type: 'settings' } };

    case 'model':
      return { type: 'modal', modal: { type: 'model-selector' } };

    case 'scoped-models':
      return { type: 'modal', modal: { type: 'scoped-models' } };

    case 'export':
      try {
        const sessionMsgs = runtime.session.messages as any[];
        if (sessionMsgs.length === 0) {
          return { type: 'toast', message: 'No messages to export', toastType: 'info' };
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `session-${timestamp}.html`;
        const filepath = `${cwd}/${filename}`;
        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Session Export</title>`;
        html += `<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px}.user{background:#e3f2fd}.assistant{background:#e8f5e9}</style>`;
        html += `</head><body><h1>Session Export</h1><p>CWD: ${cwd}</p><p>Messages: ${sessionMsgs.length}</p>`;
        for (const msg of sessionMsgs) {
          const roleName = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : msg.role;
          html += `<div class="${msg.role}"><strong>${roleName}:</strong> `;
          if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if (block.type === 'text') html += `<p>${block.text}</p>`;
            }
          } else {
            html += `<p>${String(msg.content || '')}</p>`;
          }
          html += `</div>`;
        }
        html += `<hr><p><em>Generated by Picro Agent</em></p></body></html>`;
        const fs = await import('node:fs');
        fs.writeFileSync(filepath, html, 'utf-8');
        return { type: 'toast', message: `Exported to ${filename}`, toastType: 'success' };
      } catch (err) {
        return { type: 'toast', message: 'Export failed: ' + (err as Error).message, toastType: 'error' };
      }

    case 'import':
      try {
        const { execSync } = await import('node:child_process');
        const output = execSync('fd --extension jsonl', { cwd, encoding: 'utf-8' }).trim();
        const files = output ? output.split('\n').filter(Boolean) : [];
        if (files.length === 0) {
          return { type: 'toast', message: 'No JSONL files found', toastType: 'info' };
        }
        const filepath = `${cwd}/${files[0]}`;
        const { cancelled } = await runtime.switchSession(filepath);
        if (cancelled) {
          return { type: 'toast', message: 'Import cancelled', toastType: 'info' };
        } else {
          return { type: 'toast', message: `Imported session from ${files[0]}`, toastType: 'success' };
        }
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { type: 'toast', message: 'fd not found - install fd', toastType: 'error' };
        } else {
          return { type: 'toast', message: 'Import failed: ' + err.message, toastType: 'error' };
        }
      }

    case 'share':
      try {
        const messages = runtime.session.messages as any[];
        if (messages.length === 0) {
          return { type: 'toast', message: 'No messages to share', toastType: 'info' };
        }
        const authStorage = runtime.authStorage as any;
        const token = await authStorage.getApiKey?.('github') || process.env.GITHUB_TOKEN;
        if (!token) {
          return { type: 'toast', message: 'GitHub token required. Login with /login github first.', toastType: 'error' };
        }
        const content = JSON.stringify(messages, (key, value) => {
          if (key === 'content' && Array.isArray(value)) {
            return value.map((v: any) => v.text || v.thinking || '').join('');
          }
          return value;
        }, 2);
        const response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: 'Session export from picro',
            public: false,
            files: { 'session.json': { content } },
          }),
        });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        const data = await response.json();
        await runtime.copyToClipboard(data.html_url);
        return { type: 'toast', message: 'Gist URL copied to clipboard', toastType: 'success' };
      } catch (err: any) {
        return { type: 'toast', message: 'Share failed: ' + (err.message || err), toastType: 'error' };
      }

    case 'name':
      const currentName = runtime.settings?.get?.('sessionDisplayName') || '';
      return {
        type: 'modal',
        modal: {
          type: 'editor',
          initialValue: currentName,
          onSave: async (val: string) => {
            const name = val.trim();
            try {
              if (runtime.settings) {
                runtime.settings.set('sessionDisplayName', name);
                await runtime.settings.save?.();
                const session = runtime.session as any;
                if (session?.sessionManager?.setSessionName) {
                  session.sessionManager.setSessionName(name);
                }
                return { type: 'toast', message: `Session name set to: ${name || '(default)'}`, toastType: 'success' };
              } else {
                return { type: 'toast', message: 'Settings unavailable', toastType: 'error' };
              }
            } catch (err) {
              return { type: 'toast', message: 'Failed to set session name', toastType: 'error' };
            }
          }
        }
      };

    case 'session':
      return { type: 'modal', modal: { type: 'session-info' } };

    case 'changelog':
      return { type: 'modal', modal: { type: 'changelog' } };

    case 'hotkeys':
      return { type: 'modal', modal: { type: 'hotkeys' } };

    case 'clone':
      try {
        const leafId = runtime.session.getLeafId();
        if (leafId) {
          await runtime.fork(leafId);
          return { type: 'toast', message: 'Session cloned from current position', toastType: 'success' };
        } else {
          await runtime.newSession();
          return { type: 'toast', message: 'New empty session created', toastType: 'success' };
        }
      } catch (err) {
        return { type: 'toast', message: 'Clone failed: ' + (err as Error).message, toastType: 'error' };
      }

    case 'tree':
      return { type: 'modal', modal: { type: 'tree-selector' } };

    case 'compact':
      try {
        const session = runtime.session as any;
        if (typeof session.compact === 'function') {
          const customInstructions = args ? args : undefined;
          await session.compact(customInstructions ? { customInstructions } : undefined);
          return { type: 'toast', message: 'Compaction completed', toastType: 'success' };
        } else {
          return { type: 'toast', message: 'Compaction not supported', toastType: 'error' };
        }
      } catch (err) {
        return { type: 'toast', message: 'Compaction failed', toastType: 'error' };
      }

    case 'reload':
      try {
        await runtime.settings?.reload?.();
        const session = runtime.session as any;
        if (session?.resourceLoader?.reload) {
          await session.resourceLoader.reload();
        }
        return { type: 'toast', message: 'All resources reloaded', toastType: 'success' };
      } catch (err) {
        return { type: 'toast', message: 'Reload failed: ' + (err as Error).message, toastType: 'error' };
      }

    case 'logout':
      try {
        const authStorage = runtime.authStorage as any;
        const providers = authStorage.getProviders?.() || [];
        let count = 0;
        for (const p of providers) {
          await authStorage.removeApiKey?.(p);
          count++;
        }
        return { type: 'toast', message: `Logged out from ${count} provider(s)`, toastType: 'success' };
      } catch (err) {
        return { type: 'toast', message: 'Logout failed', toastType: 'error' };
      }

    case 'fork':
      return { type: 'modal', modal: { type: 'user-message-selector' } };

    case 'stats':
      const stats = (runtime.session as any).getPerformanceStats?.();
      if (stats) {
        return { type: 'modal', modal: { type: 'stats', stats } };
      } else {
        return { type: 'toast', message: 'Performance tracking is disabled or no data available', toastType: 'info' };
      }

    case 'paste':
      try {
        let pngBuffer: Buffer;
        try {
          const { execFileSync } = await import('node:child_process');
          pngBuffer = execFileSync('wl-paste', ['--no-size', '--type', 'image/png']);
        } catch (e1) {
          try {
            const { execFileSync } = await import('node:child_process');
            pngBuffer = execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
          } catch (e2) {
            return { type: 'toast', message: 'No image in clipboard or missing wl-paste/xclip', toastType: 'error' };
          }
        }
        const fs = await import('node:fs');
        const path = await import('node:path');
        const timestamp = Date.now();
        const filename = `pasted-${timestamp}.png`;
        const filepath = path.join(cwd, filename);
        fs.writeFileSync(filepath, pngBuffer);
        return { type: 'paste', filepath };
      } catch (err: any) {
        return { type: 'toast', message: `Paste failed: ${err.message}`, toastType: 'error' };
      }

    case 'debug':
      try {
        const rt = runtime as any;
        const session = rt.session;
        const { messages } = session;
        const stats = session.getSessionStats?.();
        const debugLogPath = require('node:path').join(require('node:os').tmpdir(), `picro-debug-${Date.now()}.log`);
        const lines: string[] = [
          `Picro Debug Log`,
          `Generated: ${new Date().toISOString()}`,
          `CWD: ${rt.cwd}`,
          `Session: ${stats?.sessionFile || 'in-memory'}`,
          `Model: ${session.model?.provider}/${session.model?.id}`,
          `Thinking level: ${session.thinkingLevel}`,
          `Messages: ${messages.length} total`,
          `  User: ${stats?.userMessages || 0}`,
          `  Assistant: ${stats?.assistantMessages || 0}`,
          `  ToolCalls: ${stats?.toolCalls || 0}`,
          `  ToolResults: ${stats?.toolResults || 0}`,
          `Tokens: in=${stats?.tokens?.input || 0}, out=${stats?.tokens?.output || 0}, total=${stats?.tokens?.total || 0}`,
          `Cost: $${stats?.cost?.toFixed(4) || 0}`,
          '',
          '=== Full Message History (JSONL) ===',
        ];
        for (const msg of messages) {
          lines.push(JSON.stringify(msg));
        }
        require('node:fs').writeFileSync(debugLogPath, lines.join('\n'), 'utf-8');
        return { type: 'toast', message: `Debug log written to ${debugLogPath}`, toastType: 'success' };
      } catch (err: any) {
        return { type: 'toast', message: `Debug failed: ${err.message}`, toastType: 'error' };
      }

    case 'arminsayshi':
      return { type: 'modal', modal: { type: 'armin' } };

    case 'dementedelves':
      return { type: 'modal', modal: { type: 'earendil' } };

    default:
      return { type: 'toast', message: `Command "/${commandId}" not yet implemented`, toastType: 'info' };
  }
}

// Built-in slash commands definition (same as runtime/slash-commands.js)
export const BUILTIN_SLASH_COMMANDS = [
  { name: 'quit', description: 'Quit the application' },
  { name: 'thinking', description: 'Configure thinking level' },
  { name: 'login', description: 'Login to provider' },
  { name: 'help', description: 'Show help' },
  { name: 'copy', description: 'Copy conversation or last assistant message to clipboard' },
  { name: 'resume', description: 'Resume a saved session' },
  { name: 'new', description: 'Create new session' },
  { name: 'settings', description: 'Open settings' },
  { name: 'model', description: 'Select model' },
  { name: 'scoped-models', description: 'Configure scoped models' },
  { name: 'export', description: 'Export session to HTML' },
  { name: 'import', description: 'Import session from JSONL file' },
  { name: 'share', description: 'Share session as GitHub gist' },
  { name: 'name', description: 'Set session name' },
  { name: 'session', description: 'Show session info' },
  { name: 'changelog', description: 'Show changelog' },
  { name: 'hotkeys', description: 'Show hotkeys reference' },
  { name: 'clone', description: 'Clone/fork current session' },
  { name: 'tree', description: 'Show session tree' },
  { name: 'compact', description: 'Compact session context' },
  { name: 'reload', description: 'Reload resources' },
  { name: 'logout', description: 'Logout from provider' },
  { name: 'fork', description: 'Fork from a user message' },
  { name: 'stats', description: 'Show performance stats' },
  { name: 'paste', description: 'Paste image from clipboard' },
  { name: 'debug', description: 'Generate debug log' },
  { name: 'arminsayshi', description: 'Easter egg' },
  { name: 'dementedelves', description: 'Easter egg' },
];

// Result types
export type CommandResult =
  | { type: 'toast'; message: string; toastType?: 'info' | 'success' | 'error' }
  | { type: 'modal'; modal: any }
  | { type: 'none' };
