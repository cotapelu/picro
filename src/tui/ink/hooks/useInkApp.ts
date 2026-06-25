/** @jsxImportSource react */
import { useCallback, useEffect, useRef, useState } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import { createFooterDataProvider, type FooterDataProvider } from '../components/Footer/FooterDataProvider.js';
import { BUILTIN_SLASH_COMMANDS } from '../../../runtime/slash-commands.js';
import { VERSION } from '../../../config.js';

// Re-export modal type for external use
export type ModalState =
  | { type: 'command-palette'; filter?: string; isSlash?: boolean }
  | { type: 'thinking' }
  | { type: 'login' }
  | { type: 'editor'; initialValue: string; onSave: (value: string) => Promise<void> }
  | { type: 'help' }
  | { type: 'session-selector' }
  | { type: 'confirmation'; title: string; message: string; onConfirm: () => Promise<void> | void; onCancel?: () => void }
  | { type: 'settings' }
  | { type: 'model-selector' }
  | { type: 'scoped-models' }
  | { type: 'user-message-selector' }
  | { type: 'session-info' }
  | { type: 'changelog' }
  | { type: 'hotkeys' }
  | { type: 'tree-selector' }
  | { type: 'tree-summarization'; branchId: string }
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: { sampleCount: number; timeSpanMS: number; avgCpuUserMS: number; avgCpuSystemMS: number; avgRSSMB: number; avgHeapUsedMB: number; peakRSSMB: number; peakHeapUsedMB: number } }
  | { type: 'armin' }
  | { type: 'earendil' }
  | { type: 'custom' }
  | { type: 'input'; title: string; placeholder?: string; onSubmit: (value: string) => void; onCancel?: () => void }
  | { type: 'select'; title: string; options: readonly string[]; onSelect: (option: string) => void; onCancel?: () => void }
  | null;

interface UseInkAppReturn {
  // Modal state
  activeModal: ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  // Command handling
  handleCommandSelect: (commandId: string, slashArgs?: string) => Promise<void>;
  // Runtime integration
  footerProvider: FooterDataProvider;
  // Global keybindings
  useGlobalKeybindings: (input: string, key: any) => boolean;
  // Toasts
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  toasts: Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>;
}

export function useInkApp(runtime: AgentSessionRuntimeInterface, runtimeDeps: any): UseInkAppReturn {
  const {
    messages,
    status: runtimeStatus,
    thinkingLevel,
    sendMessage,
    isCompacting,
    retryAttempt,
    steeringMessages,
    followUpMessages,
    toolOutputExpanded,
    setToolOutputExpanded,
    hideThinkingBlock,
    setHideThinkingBlock,
    hiddenThinkingLabel,
    setHiddenThinkingLabel,
    currentModel,
    isStreaming,
  } = runtimeDeps;

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const toastIdRef = useRef(0);

  // Footer provider
  const footerProvider = useRef<FooterDataProvider>(createFooterDataProvider());

  // Toast helper
  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Command handler
  const handleCommandSelect = useCallback(async (commandId: string, slashArgs?: string) => {
    const runtimeAny = runtime as any;
    const builtIn = BUILTIN_SLASH_COMMANDS.find(cmd => cmd.name === commandId);

    if (!builtIn) {
      // Non-built-in: insert into input for sending as user message
      return 'insert';
    }

    // Extract args - slashArgs may be full '/cmd args' or just 'args'
    let args = '';
    if (slashArgs) {
      if (slashArgs.startsWith('/')) {
        const withoutSlash = slashArgs.slice(1).trim();
        const parts = withoutSlash.split(' ');
        if (parts[0] === commandId) {
          args = parts.slice(1).join(' ').trim();
        }
      } else {
        args = slashArgs.trim();
      }
    }

    switch (commandId) {
      case 'quit':
        process.exit(0);
        break;
      case 'thinking':
        if (args && ['off','minimal','low','medium','high','xhigh'].includes(args)) {
          runtime.setThinkingLevel(args as any);
          addToast(`Thinking level set to ${args}`, 'success');
        } else {
          setActiveModal({ type: 'thinking' });
        }
        break;
      case 'login':
        setActiveModal({ type: 'login' });
        break;
      case 'help':
        setActiveModal({ type: 'help' });
        break;
      case 'copy':
        const sessionMessages = (runtime.session as any).messages || [];
        if (args === 'all') {
          const conversation = sessionMessages.map((m: any) => {
            const role = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Assistant' : 'Tool';
            return `${role}: ${m.content}`;
          }).join('\n\n');
          try {
            await runtime.copyToClipboard(conversation);
            addToast('Copied full conversation to clipboard', 'success');
          } catch (err) {
            addToast('Copy failed', 'error');
          }
        } else {
          const lastAssistant = [...sessionMessages].reverse().find((m: any) => m.role === 'assistant');
          if (lastAssistant) {
            try {
              await runtime.copyToClipboard(lastAssistant.content);
              addToast('Copied last assistant message', 'success');
            } catch (err) {
              addToast('Copy failed', 'error');
            }
          } else {
            addToast('No assistant message to copy', 'info');
          }
        }
        break;
      case 'resume':
        setActiveModal({ type: 'session-selector' });
        break;
      case 'new':
        setActiveModal({
          type: 'confirmation',
          title: 'New Session',
          message: 'Create a new session? Current session will be saved.',
          onConfirm: async () => {
            try {
              await runtime.newSession();
              addToast('New session created', 'success');
            } catch (err) {
              addToast('Failed to create session', 'error');
            }
          },
          onCancel: () => {},
        });
        break;
      case 'settings':
        setActiveModal({ type: 'settings' });
        break;
      case 'model':
        setActiveModal({ type: 'model-selector' });
        break;
      case 'scoped-models':
        setActiveModal({ type: 'scoped-models' });
        break;
      case 'export':
        // Export implementation
        try {
          const sessionMsgs = runtime.session.messages as any[];
          if (sessionMsgs.length === 0) {
            addToast('No messages to export', 'info');
            break;
          }
          const cwd = runtime.cwd;
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
          addToast(`Exported to ${filename}`, 'success');
        } catch (err) {
          addToast('Export failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'import':
        try {
          const { execSync } = await import('node:child_process');
          const cwd = runtime.cwd;
          const output = execSync('fd --extension jsonl', { cwd, encoding: 'utf-8' }).trim();
          const files = output ? output.split('\n').filter(Boolean) : [];
          if (files.length === 0) {
            addToast('No JSONL files found', 'info');
            break;
          }
          const filepath = `${cwd}/${files[0]}`;
          const { cancelled } = await runtime.switchSession(filepath);
          if (cancelled) {
            addToast('Import cancelled', 'info');
          } else {
            addToast(`Imported session from ${files[0]}`, 'success');
          }
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            addToast('fd not found - install fd', 'error');
          } else {
            addToast('Import failed: ' + err.message, 'error');
          }
        }
        break;
      case 'share':
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to share', 'info');
            break;
          }
          const authStorage = runtime.authStorage as any;
          const token = await authStorage.getApiKey?.('github') || process.env.GITHUB_TOKEN;
          if (!token) {
            addToast('GitHub token required. Login with /login github first.', 'error');
            break;
          }
          const content = JSON.stringify(messages, (key, value) => {
            if (key === 'content' && Array.isArray(value)) {
              return value.map((v: any) => v.text || v.thinking || '').join('');
            }
            return value;
          }, 2);
          const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'Session export from picro', public: false, files: { 'session.json': { content } } }),
          });
          if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
          const data = await response.json();
          await runtime.copyToClipboard(data.html_url);
          addToast('Gist URL copied to clipboard', 'success');
        } catch (err: any) {
          addToast('Share failed: ' + (err.message || err), 'error');
        }
        break;
      case 'name':
        const currentName = runtime.settings?.get?.('sessionDisplayName') || '';
        setActiveModal({ type: 'editor', initialValue: currentName, onSave: async (val) => {
          const name = val.trim();
          try {
            if (runtime.settings) {
              runtime.settings.set('sessionDisplayName', name);
              await runtime.settings.save?.();
              const session = runtime.session as any;
              if (session?.sessionManager?.setSessionName) {
                session.sessionManager.setSessionName(name);
              }
              addToast(`Session name set to: ${name || '(default)'}`, 'success');
              footerProvider.updateFromRuntime(runtime);
            } else {
              addToast('Settings unavailable', 'error');
            }
          } catch (err) {
            addToast('Failed to set session name', 'error');
          }
        }});
        break;
      case 'session':
        setActiveModal({ type: 'session-info' });
        break;
      case 'changelog':
        setActiveModal({ type: 'changelog' });
        break;
      case 'hotkeys':
        setActiveModal({ type: 'hotkeys' });
        break;
      case 'clone':
        try {
          const leafId = (runtime.session as any).getLeafId?.();
          if (leafId) {
            await runtime.fork(leafId);
            addToast('Session cloned from current position', 'success');
          } else {
            await runtime.newSession();
            addToast('New empty session created', 'success');
          }
        } catch (err) {
          addToast('Clone failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'tree':
        setActiveModal({ type: 'tree-selector' });
        break;
      case 'compact':
        try {
          const session = runtime.session as any;
          if (typeof session.compact === 'function') {
            const customInstructions = args ? args : undefined;
            await session.compact(customInstructions ? { customInstructions } : undefined);
            addToast('Compaction completed', 'success');
          } else {
            addToast('Compaction not supported', 'error');
          }
        } catch (err) {
          addToast('Compaction failed', 'error');
        }
        break;
      case 'reload':
        try {
          await runtime.settings?.reload?.();
          const session = runtime.session as any;
          if (session?.resourceLoader?.reload) {
            await session.resourceLoader.reload();
          }
          addToast('All resources reloaded', 'success');
        } catch (err) {
          addToast('Reload failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'logout':
        try {
          const authStorage = runtime.authStorage as any;
          const providers = authStorage.getProviders?.() || [];
          let count = 0;
          for (const p of providers) {
            await authStorage.removeApiKey?.(p);
            count++;
          }
          addToast(`Logged out from ${count} provider(s)`, 'success');
        } catch (err) {
          addToast('Logout failed', 'error');
        }
        break;
      case 'fork':
        setActiveModal({ type: 'user-message-selector' });
        break;
      case 'stats':
        const stats = (runtime.session as any).getPerformanceStats?.();
        if (stats) {
          setActiveModal({ type: 'stats', stats });
        } else {
          addToast('Performance tracking disabled', 'info');
        }
        break;
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
              addToast('No image in clipboard or missing wl-paste/xclip', 'error');
              break;
            }
          }
          const fs = await import('node:fs');
          const path = await import('node:path');
          const timestamp = Date.now();
          const filename = `pasted-${timestamp}.png`;
          const filepath = path.join(runtime.cwd, filename);
          fs.writeFileSync(filepath, pngBuffer);
          // Will be handled by caller to insert into input
          return 'paste';
        } catch (err: any) {
          addToast(`Paste failed: ${err.message}`, 'error');
        }
        break;
      case 'debug':
        try {
          const rt = runtime as any;
          const session = rt.session;
          const { messages } = session;
          const stats = session.getSessionStats?.();
          const debugLogPath = require('node:path').join(require('node:os').tmpdir(), `picro-debug-${Date.now()}.log`);
          const lines: string[] = [
            `Picro Debug Log`, `Generated: ${new Date().toISOString()}`, `CWD: ${rt.cwd}`,
            `Session: ${stats?.sessionFile || 'in-memory'}`, `Model: ${session.model?.provider}/${session.model?.id}`,
            `Thinking: ${session.thinkingLevel}`, `Messages: ${messages.length} total`,
            `  User: ${stats?.userMessages || 0}`, `  Assistant: ${stats?.assistantMessages || 0}`,
            `  ToolCalls: ${stats?.toolCalls || 0}`, `  ToolResults: ${stats?.toolResults || 0}`,
            `Tokens: in=${stats?.tokens?.input || 0}, out=${stats?.tokens?.output || 0}, total=${stats?.tokens?.total || 0}`,
            `Cost: $${stats?.cost?.toFixed(4) || 0}`, '', '=== Full Message History (JSONL) ===',
          ];
          for (const msg of messages) {
            lines.push(JSON.stringify(msg));
          }
          require('node:fs').writeFileSync(debugLogPath, lines.join('\n'), 'utf-8');
          addToast(`Debug log written to ${debugLogPath}`, 'success');
        } catch (err: any) {
          addToast(`Debug failed: ${err.message}`, 'error');
        }
        break;
      case 'arminsayshi':
        setActiveModal({ type: 'armin' });
        break;
      case 'dementedelves':
        setActiveModal({ type: 'earendil' });
        break;
      default:
        addToast(`Command "/${commandId}" not yet implemented`, 'info');
        break;
    }
  }, [runtime, messages, addToast, footerProvider]);

  // Global keybindings handler
  const useGlobalKeybindings = useCallback((input: string, key: any): boolean => {
    // Extension shortcuts first
    // (shortcuts managed by caller via ref)
    return false; // Let caller handle
  }, []);

  // Initialize footer provider and signal handlers
  useEffect(() => {
    const fp = footerProvider.current;
    fp.updateFromRuntime(runtime);

    const session = runtime.session as any;
    const unsubscribe = session?.subscribe?.((event: any) => {
      switch (event.type) {
        case 'agent_end':
        case 'compaction_end':
        case 'model_change':
        case 'session_tree':
          fp.updateFromRuntime(runtime);
          break;
        default:
          break;
      }
    });

    // Signal handlers
    const handleSignal = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await runtime.dispose?.();
      } catch (err) {
        console.error('Error during shutdown:', err);
      }
      process.exit(0);
    };
    const onSigTerm = () => handleSignal('SIGTERM');
    const onSigHup = () => handleSignal('SIGHUP');
    process.on('SIGTERM', onSigTerm);
    process.on('SIGHUP', onSigHup);

    // Version check
    const checkVersion = async () => {
      try {
        const res = await fetch('https://registry.npmjs.org/picro');
        if (res.ok) {
          const data = await res.json();
          const latest = data?.['dist-tags']?.latest;
          if (latest && latest !== VERSION) {
            addToast(`New version ${latest} available (current: ${VERSION})`, 'info');
          }
        }
      } catch { /* ignore */ }
    };
    checkVersion();

    // Anthropic auth warning
    try {
      const authStorage = (runtime as any).authStorage;
      const apiKey = authStorage?.getApiKey?.('anthropic');
      if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-ant-oat')) {
        addToast('Anthropic subscription auth active - extra usage applies', 'warning');
      }
    } catch {}

    return () => {
      unsubscribe?.();
      process.off('SIGTERM', onSigTerm);
      process.off('SIGHUP', onSigHup);
    };
  }, [runtime, addToast]);

  return {
    activeModal,
    openModal: setActiveModal,
    closeModal: () => setActiveModal(null),
    handleCommandSelect,
    footerProvider: footerProvider.current,
    useGlobalKeybindings,
    addToast,
    toasts,
  };
}
