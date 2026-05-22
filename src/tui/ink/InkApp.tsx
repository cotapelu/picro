/** @jsxImportSource react */
import React, { useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime';
import type { Message } from './types';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import { useRuntime } from './hooks/useRuntime';
import { Header } from './components/Header/Header';
import { MessageList } from './components/MessageList/MessageList';
import { InputBox } from './components/InputBox/InputBox';
import { Footer } from './components/Footer/Footer';
import { ErrorBoundary, useGlobalErrorHandler } from './ErrorBoundary';
import { CommandPalette } from './modals/CommandPalette';
import { ThinkingModal } from './modals/ThinkingModal';
import { LoginModal } from './modals/LoginModal';
import { HelpModal } from './modals/HelpModal';
import { SessionSelectorModal } from './modals/SessionSelectorModal';
import { ConfirmationModal } from './modals/ConfirmationModal';
import { SettingsSelectorModal } from './modals/SettingsSelectorModal';
import { ModelSelectorModal } from './modals/ModelSelectorModal';
import { SessionInfoModal } from './modals/SessionInfoModal';
import { ChangelogModal } from './modals/ChangelogModal';
import { HotkeysModal } from './modals/HotkeysModal';
import { TreeSelectorModal } from './modals/TreeSelectorModal';
import { BashOutputModal } from './modals/BashOutputModal';
import { Modal } from './modals/Modal';
import { BUILTIN_SLASH_COMMANDS } from '../../runtime/slash-commands';

interface InkAppInnerProps {
  runtime: AgentSessionRuntimeInterface;
}

type ModalState =
  | { type: 'command-palette'; filter?: string; isSlash?: boolean }
  | { type: 'thinking' }
  | { type: 'login' }
  | { type: 'editor'; initialValue: string; onSave: (value: string) => Promise<void> }
  | { type: 'help' }
  | { type: 'session-selector' }
  | { type: 'confirmation'; title: string; message: string; onConfirm: () => Promise<void> | void; onCancel?: () => void }
  | { type: 'settings' }
  | { type: 'model-selector' }
  | { type: 'session-info' }
  | { type: 'changelog' }
  | { type: 'hotkeys' }
  | { type: 'tree-selector' }
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: { sampleCount: number; timeSpanMS: number; avgCpuUserMS: number; avgCpuSystemMS: number; avgRSSMB: number; avgHeapUsedMB: number; peakRSSMB: number; peakHeapUsedMB: number } }
  | { type: 'armin' }
  | { type: 'earendil' }
  | null;

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime }) => {
  const { messages, status: runtimeStatus, thinkingLevel, sendMessage, isCompacting, retryAttempt, steeringMessages, followUpMessages, toolOutputExpanded, setToolOutputExpanded, hideThinkingBlock, setHideThinkingBlock } = useRuntime(runtime as any);
  const [retryCountdown, setRetryCountdown] = React.useState(0);

  // Retry countdown timer
  React.useEffect(() => {
    if (retryAttempt > 0) {
      setRetryCountdown(3); // Assuming 3-second delay; could be configurable
      const timer = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryAttempt]);

  // Compute status display
  let displayStatus = runtimeStatus || 'Ready';
  if (isCompacting) {
    displayStatus = 'Compacting... (Esc to cancel)';
  } else if (retryAttempt > 0) {
    const maxAttempts = 3; // should get from runtime? For now hardcoded
    displayStatus = `Retrying (${retryAttempt}/${maxAttempts}) in ${retryCountdown}s... (Esc to cancel)`;
  }
  const { toggleTheme, isDark } = useTheme();
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<ModalState>(null);
  const [showDebug, setShowDebug] = React.useState(false);
  const messageListRef = React.useRef<{ scrollToBottom: () => void } | null>(null);
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const toastIdRef = React.useRef(0);
  const lastCtrlCTimeRef = React.useRef<number>(0);
  const [modelRefresh, setModelRefresh] = React.useState(0); // used to trigger footer re-render on model change

  // Close command palette if slash removed
  React.useEffect(() => {
    if (activeModal?.type === 'command-palette' && activeModal.isSlash && !inputValue.startsWith('/')) {
      setActiveModal(null);
    }
  }, [inputValue, activeModal]);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000); // auto-dismiss after 4s
  }, []);

  // Handle input submission
  const handleSubmit = useCallback(async () => {
    if (inputValue.trim() === '' || isSubmitting) return;

    const userInput = inputValue.trim();
    setInputValue('');
    setIsSubmitting(true);

    // Bash mode: !cmd or !!cmd
    if (userInput.startsWith('!')) {
      const withoutContext = userInput.startsWith('!!');
      const cmd = withoutContext ? userInput.slice(2).trim() : userInput.slice(1).trim();
      if (cmd) {
        try {
          const { execSync } = await import('node:child_process');
          const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
          setActiveModal({ type: 'bash-output', command: cmd, output });
        } catch (err: any) {
          setActiveModal({ type: 'bash-output', command: cmd, output: err.message || 'Error', error: true });
        }
      }
      setIsSubmitting(false);
      return;
    }

    try {
      await sendMessage(userInput);
    } catch (err: any) {
      console.error('Send error:', err.message || err);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isSubmitting, sendMessage]);

  // Version check on mount
  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('https://registry.npmjs.org/@mariozechner/pi-coding-agent/latest', { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          const latest = data.version;
          const current = '0.0.1'; // TODO: get from package.json dynamically
          if (latest && latest !== current) {
            addToast(`New version available: ${latest} (current: ${current})`, 'info');
            // Auto-open changelog modal
            setActiveModal({ type: 'changelog' });
          }
        }
      } catch {
        // ignore network errors
      }
    };
    checkVersion();
  }, [addToast]);

  // Global keybindings
  useInput((input, key) => {
    if (activeModal) return;

    if (key.ctrl && input === 'p') {
      setActiveModal({ type: 'command-palette' });
    } else if (key.ctrl && input === 't') {
      setActiveModal({ type: 'thinking' });
    } else if (key.ctrl && key.shift && input === 't') {
      // Toggle theme with Ctrl+Shift+T
      toggleTheme();
      // Persist
      try {
        runtime.settings?.set('theme', isDark ? 'light' : 'dark');
        runtime.settings?.save?.();
      } catch {
        // ignore
      }
    } else if (key.ctrl && key.shift && input === 'x') {
      // Toggle tool output expansion
      setToolOutputExpanded(prev => !prev);
      addToast('Tool output ' + (!toolOutputExpanded ? 'expanded' : 'collapsed'));
    } else if (key.ctrl && key.shift && input === 'h') {
      // Toggle thinking block visibility
      setHideThinkingBlock(prev => !prev);
      addToast('Thinking blocks: ' + (!hideThinkingBlock ? 'hidden' : 'visible'));
    } else if (key.ctrl && input === 'l') {
      setActiveModal({ type: 'login' });
    } else if (key.ctrl && input === 'r') {
      setActiveModal({ type: 'session-selector' });
    } else if (key.ctrl && input === 'd') {
      setShowDebug((prev) => !prev);
    } else if (key.ctrl && input === 'e') {
      setActiveModal({ type: 'editor', initialValue: inputValue, onSave: async (val) => setInputValue(val) });
    } else if (key.ctrl && key.shift && input === 'v') {
      // Paste from clipboard (async fire-and-forget)
      (async () => {
        try {
          const clipboardy = await import('clipboardy');
          const text = await clipboardy.default.read();
          setInputValue(prev => prev + text);
          addToast('Pasted from clipboard', 'info');
        } catch (err: any) {
          addToast('Paste failed: ' + (err.message || err), 'error');
        }
      })();
      return;
    } else if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (now - lastCtrlCTimeRef.current < 1000) {
        process.exit(0);
      } else {
        lastCtrlCTimeRef.current = now;
        try {
          (runtime.session as any)?.abort?.();
          addToast('Interrupted', 'info');
        } catch {
          // ignore
        }
      }
    }
  });

  const handleCommandSelect = useCallback(async (commandId: string, slashArgs?: string) => {
    setActiveModal(null);

    const builtIn = BUILTIN_SLASH_COMMANDS.find(cmd => cmd.name === commandId);

    if (!builtIn) {
      // Non-built-in: insert into input for sending as user message
      setInputValue(commandId);
      return;
    }

    // Extract args after command name if present
    let args = '';
    if (slashArgs) {
      const withoutSlash = slashArgs.slice(1).trim(); // remove leading '/'
      const parts = withoutSlash.split(' ');
      if (parts[0] === commandId) {
        args = parts.slice(1).join(' ').trim();
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
        // If args contain 'all', copy full conversation; else copy last assistant
        if (args === 'all') {
          const conversation = messages.map(m => {
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
          const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
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
        // Show confirmation before creating new session
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
          onCancel: () => {
            // no-op
          },
        });
        break;
      case 'settings':
        setActiveModal({ type: 'settings' });
        break;
      case 'model':
        setActiveModal({ type: 'model-selector' });
        break;
      case 'export':
        // Export current session to HTML file
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to export', 'info');
            break;
          }
          // Generate simple HTML
          const cwd = runtime.cwd;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `session-${timestamp}.html`;
          const filepath = `${cwd}/${filename}`;
          
          let html = `<!DOCTYPE html><html><head><title>Session Export</title>`;
          html += `<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px} .user{color:#0066cc} .assistant{color:#2e7d32} .tool{color:#d32f2f}</style>`;
          html += `</head><body><h1>Session Export</h1>`;
          for (const msg of messages) {
            const role = msg.role;
            const content = (msg.content as any[])?.map((c: any) => c.text || '').join('') || String(msg.content || '');
            const escaped = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            html += `<div class="${role}"><strong>${role}:</strong> ${escaped}</div>`;
          }
          html += `</body></html>`;
          
          // Write file (using node fs)
          const fs = await import('node:fs');
          fs.writeFileSync(filepath, html, 'utf-8');
          addToast(`Exported to ${filename}`, 'success');
        } catch (err) {
          addToast('Export failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'import':
        // Import session from JSONL file (use fd to pick)
        try {
          const { execSync } = await import('node:child_process');
          const cwd = runtime.cwd;
          // Find jsonl files
          const output = execSync('fd --extension jsonl', { cwd, encoding: 'utf-8' }).trim();
          const files = output ? output.split('\n').filter(Boolean) : [];
          if (files.length === 0) {
            addToast('No JSONL files found in current directory', 'info');
            break;
          }
          // For simplicity, pick the first one or prompt later
          const filepath = `${cwd}/${files[0]}`; // TODO: prompt user to select
          const { cancelled } = await runtime.switchSession(filepath);
          if (cancelled) {
            addToast('Import cancelled', 'info');
          } else {
            addToast(`Imported session from ${files[0]}`, 'success');
          }
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            addToast('fd not found - install fd for file picking', 'error');
          } else {
            addToast('Import failed: ' + err.message, 'error');
          }
        }
        break;
      case 'share':
        // Share current session as GitHub gist (requires GitHub auth)
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to share', 'info');
            break;
          }
          // Get GitHub token from authStorage (cast to any to bypass interface limitation)
          const authStorage = runtime.authStorage as any;
          const token = await authStorage.getApiKey?.('github') || process.env.GITHUB_TOKEN;
          if (!token) {
            addToast('GitHub token required. Login with /login github first.', 'error');
            break;
          }
          // Create gist content (JSON)
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
          if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
          }
          const data = await response.json();
          const gistUrl = data.html_url;
          await runtime.copyToClipboard(gistUrl);
          addToast('Gist URL copied to clipboard', 'success');
        } catch (err: any) {
          addToast('Share failed: ' + (err.message || err), 'error');
        }
        break;
      case 'name':
        // Set session display name via settings (persisted per session?)
        const currentName = runtime.settings?.get?.('sessionDisplayName') || '';
        setActiveModal({ type: 'editor', initialValue: currentName, onSave: async (val) => {
          const name = val.trim();
          try {
            if (runtime.settings) {
              runtime.settings.set('sessionDisplayName', name);
              await runtime.settings.save?.();
              addToast(`Session name set to: ${name || '(default)'}`, 'success');
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
        // Duplicate current session by forking from first message or creating new session with same messages
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to clone', 'info');
            break;
          }
          // Find earliest user message to fork from
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg && firstUserMsg.id) {
            await runtime.fork(firstUserMsg.id);
            addToast('Session cloned (forked from first message)', 'success');
          } else {
            // Fallback: create new session
            await runtime.newSession();
            addToast('New empty session created', 'success');
          }
        } catch (err) {
          addToast('Clone failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'tree':
        setActiveModal({ type: 'tree-selector' }); // Note: using 'tree' as type for modal mapping
        break;
      case 'compact':
        // Trigger manual compaction
        try {
          const session = runtime.session as any;
          if (typeof session.compact === 'function') {
            await session.compact();
            addToast('Compaction completed', 'success');
          } else {
            addToast('Compaction not supported', 'error');
          }
        } catch (err) {
          addToast('Compaction failed', 'error');
        }
        break;
      case 'reload':
        // Reload all resources (extensions, skills, prompts, themes, keybindings)
        try {
          const session = runtime.session as any;
          if (typeof session.reload === 'function') {
            await session.reload();
            addToast('All resources reloaded', 'success');
          } else {
            await runtime.settings?.reload?.();
            addToast('Settings reloaded (full reload not available)', 'success');
          }
        } catch (err) {
          addToast('Reload failed: ' + (err as Error).message, 'error');
        }
        break;
        // Reload settings and resources
        try {
          await runtime.settings?.reload?.();
          // TODO: also reload extensions, skills, prompts, themes from runtime
          addToast('Settings reloaded', 'success');
        } catch (err) {
          addToast('Reload failed', 'error');
        }
        break;
      case 'logout':
        // Remove authentication for all providers
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
      case 'scoped-models':
        // Toggle scoped models mode for model cycling
        try {
          const settings = runtime.settings;
          if (settings) {
            const current = settings.get('scopedModelsEnabled') ?? false;
            const next = !current;
            settings.set('scopedModelsEnabled', next);
            await settings.save?.();
            addToast(`Scoped models ${next ? 'enabled' : 'disabled'}`, 'success');
          } else {
            addToast('Settings not available', 'error');
          }
        } catch (err) {
          addToast('Failed to toggle scoped models', 'error');
        }
        break;
      case 'fork':
        // Fork current session at a specific message
        // For now, fork from the first user message if available
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to fork', 'info');
            break;
          }
          // Find a user message to fork from - prefer the last user message
          const userMessages = messages.filter(m => m.role === 'user');
          const targetMsg = userMessages[userMessages.length - 1] || userMessages[0];
          if (targetMsg?.id) {
            const result = await runtime.fork(targetMsg.id);
            if (result.cancelled) {
              addToast('Fork cancelled', 'info');
            } else {
              addToast('Fork created successfully', 'success');
            }
          } else {
            addToast('No suitable message to fork', 'error');
          }
        } catch (err) {
          addToast('Fork failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'stats':
        // Show performance metrics
        const stats = (runtime.session as any).getPerformanceStats?.();
        if (stats) {
          setActiveModal({ type: 'stats', stats });
        } else {
          addToast('Performance tracking is disabled or no data available', 'info');
        }
        break;
      case 'debug':
        handleDebugCommand();
        addToast('Debug log written', 'success');
        break;
      case 'help':
        setActiveModal({ type: 'help' });
        break;
      case 'arminsayshi':
        setActiveModal({ type: 'armin' });
        break;
      case 'dementedelves':
        setActiveModal({ type: 'earendil' });
        break;
      default:
        // Unimplemented command - show informative message
        addToast(`Command "/${commandId}" not yet implemented`, 'info');
        break;
    }
    setInputValue('');
  }, [runtime, messages, addToast, setActiveModal, setInputValue, BUILTIN_SLASH_COMMANDS]);

  const handleThinkingChange = useCallback((level: string) => {
    setActiveModal(null);
    runtime.setThinkingLevel(level as any);
  }, [runtime]);

  const handleLogin = useCallback(async (apiKey: string) => {
    const defaultProvider = runtime.settings?.getDefaultProvider() || 'openai';
    await runtime.authStorage.setApiKey(defaultProvider, apiKey);
    addToast('Logged in successfully', 'success');
    setActiveModal(null);
  }, [runtime, addToast]);

  const handleDebugCommand = useCallback(() => {
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
      addToast(`Debug log written to ${debugLogPath}`, 'success');
    } catch (err: any) {
      addToast(`Debug failed: ${err.message}`, 'error');
    }
  }, [runtime, addToast]);

  const handleTreeSelect = useCallback(async (branchId: string) => {
    try {
      const session = runtime.session as any;
      if (session.navigateTree) {
        const result = await session.navigateTree(branchId);
        if (result.cancelled) {
          addToast('Branch navigation cancelled', 'info');
        } else {
          addToast(`Switched to branch: ${branchId}`, 'success');
        }
      } else {
        addToast('Tree navigation not supported', 'error');
      }
    } catch (err: any) {
      addToast(`Tree navigation failed: ${err.message}`, 'error');
    }
  }, [runtime, addToast]);

  // Render active modal
  const renderModal = () => {
    if (!activeModal) return null;

    switch (activeModal.type) {
      case 'command-palette':
        // Collect commands from multiple sources
        const session = runtime.session as any;
        const builtinCmds = BUILTIN_SLASH_COMMANDS;
        const extensionCommands: any[] = session._extensionRunner?.getCommands?.() || [];
        const skills: any[] = session._resourceLoader?.getSkills?.()?.skills || [];
        const promptTemplates: any[] = session._resourceLoader?.getPromptTemplates?.() || [];

        // Merge and map to Command shape
        const allCommands = [
          ...builtinCmds.map(c => ({ id: c.name, label: `/${c.name}`, description: c.description, source: 'builtin' })),
          ...extensionCommands.map(c => ({ id: c.invocationName, label: c.invocationName.startsWith('/') ? c.invocationName : `/${c.invocationName}`, description: c.description, source: 'extension' })),
          ...skills.map(s => ({ id: `skill:${s.name}`, label: `skill:${s.name}`, description: s.description, source: 'skill' })),
          ...promptTemplates.map(t => ({ id: t.name, label: `template:${t.name}`, description: t.description, source: 'template' })),
        ];

        const filter = activeModal.filter || '';
        // For slash-prefixed filter, strip leading slashes for matching
        const search = filter.toLowerCase().replace(/^\/+/g, '');
        const filtered = allCommands.filter(cmd =>
          cmd.label.toLowerCase().includes(search) ||
          (cmd.description && cmd.description.toLowerCase().includes(search))
        );

        return (
          <Modal onClose={() => setActiveModal(null)}>
            <CommandPalette
              commands={filtered}
              onSelect={(id) => handleCommandSelect(id, filter)}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
        );
      case 'thinking':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ThinkingModal
              currentLevel={thinkingLevel}
              onChange={handleThinkingChange}
            />
          </Modal>
        );
      case 'login':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <LoginModal
              onLogin={handleLogin}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
        );
      case 'editor':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <Box flexDirection="column">
              <Text bold>Edit Input</Text>
              <InputBox
                value={activeModal.initialValue}
                onChange={setInputValue}
                onSubmit={async () => {
                  await activeModal.onSave(inputValue);
                  setActiveModal(null);
                }}
                multiline
                autoFocus
              />
            </Box>
          </Modal>
        );
      case 'help':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <HelpModal onClose={() => setActiveModal(null)} />
          </Modal>
        );
      case 'session-selector':
        return (
          <SessionSelectorModal runtime={runtime} onClose={() => setActiveModal(null)} />
        );
      case 'settings':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <SettingsSelectorModal runtime={runtime} onClose={() => setActiveModal(null)} />
          </Modal>
        );
      case 'model-selector':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ModelSelectorModal
              runtime={runtime}
              onClose={() => setActiveModal(null)}
              onSelect={() => setModelRefresh(v => v + 1)}
            />
          </Modal>
        );
      case 'session-info':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <SessionInfoModal runtime={runtime} onClose={() => setActiveModal(null)} />
          </Modal>
        );
      case 'changelog':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ChangelogModal onClose={() => setActiveModal(null)} />
          </Modal>
        );
      case 'hotkeys':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <HotkeysModal onClose={() => setActiveModal(null)} />
          </Modal>
        );
      case 'tree-selector':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <TreeSelectorModal
              runtime={runtime}
              onClose={() => setActiveModal(null)}
              onSelect={handleTreeSelect}
            />
          </Modal>
        );
      case 'bash-output':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <BashOutputModal
              command={activeModal.command}
              output={activeModal.output}
              error={activeModal.error}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
        );
      case 'confirmation':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ConfirmationModal
              title={activeModal.title}
              message={activeModal.message}
              onConfirm={async () => {
                await activeModal.onConfirm();
                setActiveModal(null);
              }}
              onCancel={() => {
                activeModal.onCancel?.();
                setActiveModal(null);
              }}
            />
          </Modal>
        );
      case 'stats':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
              <Text bold color="green">Performance Metrics</Text>
              <Box flexDirection="column" marginTop={1}>
                <Text>Samples: {activeModal.stats.sampleCount}</Text>
                <Text>Time Span: {activeModal.stats.timeSpanMS.toFixed(0)}ms</Text>
                <Text>Avg CPU User: {activeModal.stats.avgCpuUserMS.toFixed(2)}ms</Text>
                <Text>Avg CPU System: {activeModal.stats.avgCpuSystemMS.toFixed(2)}ms</Text>
                <Text>Avg RSS: {activeModal.stats.avgRSSMB.toFixed(2)} MB</Text>
                <Text>Avg Heap Used: {activeModal.stats.avgHeapUsedMB.toFixed(2)} MB</Text>
                <Text>Peak RSS: {activeModal.stats.peakRSSMB.toFixed(2)} MB</Text>
                <Text>Peak Heap Used: {activeModal.stats.peakHeapUsedMB.toFixed(2)} MB</Text>
              </Box>
            </Box>
          </Modal>
        );
      case 'armin':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <Box justifyContent="center" alignItems="center" flexDirection="column">
              <Text>HI! I'M ARMIN!</Text>
            </Box>
          </Modal>
        );
      case 'earendil':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <Box justifyContent="center" alignItems="center" flexDirection="column">
              <Text bold color="yellow">DEMENTED ELVES HAVE EMERGED</Text>
            </Box>
          </Modal>
        );
      default:
        return null;
    }
  };

  const modelId = (runtime.session as any)?.model?.id || 'No model';
  const themeLabel = isDark ? 'dark' : 'light';

  return (
    <Box flexDirection="column" width="100%" position="relative">
      <Header
        title="Picro Agent"
        status={status || 'Ready'}
        thinkingLevel={thinkingLevel}
        model={modelId}
        theme={themeLabel}
        showArmin={true}
      />
      <Box flexGrow={1} overflow="hidden" position="relative">
        {/* Pending messages indicator */}
        {(steeringMessages.length > 0 || followUpMessages.length > 0) && (
          <Box borderBottom paddingX={1}>
            <Text color="yellow" dim>
              Queued: {steeringMessages.length} steer, {followUpMessages.length} follow-up (Ctrl+E to edit)
            </Text>
          </Box>
        )}
        <MessageList
          ref={messageListRef}
          messages={messages}
          hideThinkingBlock={hideThinkingBlock}
        />
        {showDebug && (
          <Box position="absolute" top={0} right={0}>
            <Text color="yellow">Debug</Text>
          </Box>
        )}
      </Box>
      <InputBox
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder="Type your message..."
        disabled={isSubmitting}
        onSlashCommand={(prefix) => {
          // Open command palette with filter
          setActiveModal({ type: 'command-palette', filter: prefix, isSlash: true });
        }}
        onTab={() => {
          // Autocomplete: open command palette with all commands
          setActiveModal({ type: 'command-palette', filter: '', isSlash: false });
        }}
      />
      {/* Status line for compaction/retry */}
      {(isCompacting || retryAttempt > 0) && (
        <Box paddingX={1}>
          <Text color={isCompacting ? 'yellow' : 'orange'}>
            {displayStatus}
          </Text>
        </Box>
      )}
      <Footer runtime={runtime} hints={[
        'Ctrl+P: Commands',
        'Ctrl+T: Thinking',
        'Ctrl+Shift+T: Toggle Theme',
        'Ctrl+R: Resume Session',
        'Ctrl+E: Edit',
        'Ctrl+D: Debug',
        'Ctrl+C: Quit'
      ]} />
      {activeModal && renderModal()}
      {/* Toast notifications */}
      <Box flexDirection="column" position="absolute" top={0} right={0}>
        {toasts.map(toast => (
          <Box key={toast.id} borderStyle="round" paddingX={1} margin={1}>
            <Text color={toast.type === 'error' ? 'red' : toast.type === 'success' ? 'green' : 'cyan'}>
              {toast.message}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const InkApp: React.FC<{ runtime: AgentSessionRuntimeInterface }> = ({ runtime }) => {
  // Set up global error handling for unhandled errors and rejections
  useGlobalErrorHandler();
  // Determine initial theme from settings
  let initialMode: 'dark' | 'light' = 'dark';
  try {
    const themeSetting = runtime.settings?.get?.('theme');
    if (themeSetting === 'light') initialMode = 'light';
  } catch {
    // default dark
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('App error:', error, errorInfo);
      // TODO: report to telemetry if available
    }}>
      <ThemeProvider initialMode={initialMode}>
        <InkAppInner runtime={runtime} />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export const runInkApp = async (runtime: AgentSessionRuntimeInterface): Promise<void> => {
  const { waitUntilExit } = render(
    <InkApp runtime={runtime} />
  );
  await waitUntilExit();
};
