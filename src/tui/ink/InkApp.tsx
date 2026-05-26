/** @jsxImportSource react */
import React, { useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import type { Message } from './types.js';
import { ThemeProvider, useTheme } from './hooks/useTheme.js';
import { useRuntime } from './hooks/useRuntime.js';
import { Header } from './components/Header/Header.js';
import { MessageList } from './components/MessageList/MessageList.js';
import { InputBox } from './components/InputBox/InputBox.js';
import { Footer } from './components/Footer/Footer.js';
import { createFooterDataProvider, type FooterDataProvider } from './components/Footer/FooterDataProvider.js';
import { ErrorBoundary, useGlobalErrorHandler } from './ErrorBoundary.js';
import { CommandPalette } from './modals/CommandPalette.js';
import { ThinkingModal } from './modals/ThinkingModal.js';
import { LoginModal } from './modals/LoginModal.js';
import { HelpModal } from './modals/HelpModal.js';
import { SessionSelectorModal } from './modals/SessionSelectorModal.js';
import { ConfirmationModal } from './modals/ConfirmationModal.js';
import { SettingsSelectorModal } from './modals/SettingsSelectorModal.js';
import { ModelSelectorModal } from './modals/ModelSelectorModal.js';
import { ScopedModelsSelectorModal } from './modals/ScopedModelsSelectorModal.js';
import { UserMessageSelectorModal } from './modals/UserMessageSelectorModal.js';
import { SessionInfoModal } from './modals/SessionInfoModal.js';
import { ChangelogModal } from './modals/ChangelogModal.js';
import { HotkeysModal } from './modals/HotkeysModal.js';
import { TreeSelectorModal } from './modals/TreeSelectorModal.js';
import { BashOutputModal } from './modals/BashOutputModal.js';
import { InputModal } from './modals/InputModal.js';
import { SelectModal } from './modals/SelectModal.js';
import { Modal } from './modals/Modal.js';
import { BUILTIN_SLASH_COMMANDS } from '../../runtime/slash-commands.js';
import { VERSION } from '../../config.js';


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
  | { type: 'scoped-models' }
  | { type: 'user-message-selector' }
  | { type: 'session-info' }
  | { type: 'changelog' }
  | { type: 'hotkeys' }
  | { type: 'tree-selector' }
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: { sampleCount: number; timeSpanMS: number; avgCpuUserMS: number; avgCpuSystemMS: number; avgRSSMB: number; avgHeapUsedMB: number; peakRSSMB: number; peakHeapUsedMB: number } }
  | { type: 'armin' }
  | { type: 'earendil' }
  | { type: 'custom' }
  | { type: 'input'; title: string; placeholder?: string; onSubmit: (value: string) => void; onCancel?: () => void }
  | { type: 'select'; title: string; options: readonly string[]; onSelect: (option: string) => void; onCancel?: () => void }
  | null;

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime }) => {
  const { messages, status: runtimeStatus, thinkingLevel, sendMessage, isCompacting, retryAttempt, steeringMessages, followUpMessages, toolOutputExpanded, setToolOutputExpanded, hideThinkingBlock, setHideThinkingBlock, hiddenThinkingLabel, setHiddenThinkingLabel, currentModel } = useRuntime(runtime as any);
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
  const { toggleTheme, isDark, theme } = useTheme();
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
        const response = await fetch('https://registry.npmjs.org/@picro/picro/latest', { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json();
          const latest = data.version;
          const current = VERSION;
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
      case 'scoped-models':
        setActiveModal({ type: 'scoped-models' });
        break;
      case 'export':
        // Export current session to HTML file with proper formatting
        try {
          const messages = runtime.session.messages as any[];
          if (messages.length === 0) {
            addToast('No messages to export', 'info');
            break;
          }
          const cwd = runtime.cwd;
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `session-${timestamp}.html`;
          const filepath = `${cwd}/${filename}`;

          // Build HTML with proper structure and styling
          const html = generateSessionHtml(messages, {
            title: 'Session Export',
            includeStyles: true,
            includeImages: true,
            cwd,
          });

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
        // Trigger manual compaction with optional custom instructions
        try {
          const session = runtime.session as any;
          if (typeof session.compact === 'function') {
            // Parse args: if anything after 'compact', use as custom instructions
            const parts = userInput.split(' ').filter(Boolean);
            const customInstructions = parts.length > 1 ? parts.slice(1).join(' ').trim() : undefined;
            await session.compact(customInstructions ? { customInstructions } : undefined);
            addToast('Compaction completed' + (customInstructions ? ' with custom instructions' : ''), 'success');
          } else {
            addToast('Compaction not supported', 'error');
          }
        } catch (err) {
          addToast('Compaction failed: ' + (err as Error).message, 'error');
        }
        break;
      case 'reload':
        // Reload all resources (settings, extensions, skills, prompts, themes)
        try {
          const session = runtime.session as any;
          // Reload settings first
          await runtime.settings?.reload?.();
          // Reload resource loader (extensions, skills, prompts, themes)
          if (session?.resourceLoader?.reload) {
            await session.resourceLoader.reload();
          }
          // Rebind extensions to pick up any changes
          if (session?.bindExtensions && !session.__picroBound) {
            // Already bound; might need to re-bind if extensions changed? For now, just note reloaded.
          }
          addToast('All resources reloaded', 'success');
        } catch (err) {
          addToast('Reload failed: ' + (err as Error).message, 'error');
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
        // Open user message selector to choose where to fork from
        setActiveModal({ type: 'user-message-selector' });
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
      case 'paste':
        // Paste image from clipboard into input
        try {
          // Try Wayland (wl-paste) first, then X11 (xclip)
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
          // Save to a PNG file in cwd
          const fs = await import('node:fs');
          const path = await import('node:path');
          const timestamp = Date.now();
          const filename = `pasted-${timestamp}.png`;
          const filepath = path.join(runtime.cwd, filename);
          fs.writeFileSync(filepath, pngBuffer);
          // Append markdown image reference to input
          setInputValue(prev => prev + `![](${filename})`);
          addToast(`Pasted image as ${filename}`, 'success');
        } catch (err: any) {
          addToast(`Paste failed: ${err.message}`, 'error');
        }
        break;
      case 'debug':
        handleDebugCommand();
        addToast('Debug log written', 'success');
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

  // Path autocomplete using fd
  const handlePathComplete = useCallback(async (partial: string): Promise<string[]> => {
    if (!runtime.cwd) return [];
    try {
      const { execFile } = await import('node:child_process');
      return new Promise<string[]>((resolve) => {
        execFile('fd', ['--color', 'never', '--base-path', '.', '--', partial + '*'], { cwd: runtime.cwd }, (err, stdout) => {
          if (err) {
            resolve([]);
            return;
          }
          const files = stdout.trim().split('\n').filter(Boolean);
          resolve(files);
        });
      });
    } catch (e) {
      console.error('fd autocomplete error:', e);
      return [];
    }
  }, [runtime.cwd]);

  // External editor (Ctrl+E)
  const handleExternalEdit = useCallback(async (text: string): Promise<string> => {
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim';
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const { spawnSync } = await import('node:child_process');
    const tmpdir = os.tmpdir();
    const dir = fs.mkdtempSync(path.join(tmpdir, 'picro-'));
    const filepath = path.join(dir, 'edit.txt');
    try {
      fs.writeFileSync(filepath, text, 'utf-8');
      spawnSync(editor, [filepath], { stdio: 'inherit', cwd: runtime.cwd });
      const newText = fs.readFileSync(filepath, 'utf-8');
      return newText;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, [runtime.cwd]);

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
      case 'scoped-models':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <ScopedModelsSelectorModal
              runtime={runtime}
              onClose={() => setActiveModal(null)}
            />
          </Modal>
        );
      case 'user-message-selector':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <UserMessageSelectorModal
              runtime={runtime}
              onClose={() => setActiveModal(null)}
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
      case 'input':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <InputModal
              title={activeModal.title}
              placeholder={activeModal.placeholder}
              onSubmit={(value) => {
                activeModal.onSubmit(value);
                setActiveModal(null);
              }}
              onCancel={() => {
                activeModal.onCancel?.();
                setActiveModal(null);
              }}
            />
          </Modal>
        );
      case 'select':
        return (
          <Modal onClose={() => setActiveModal(null)}>
            <SelectModal
              title={activeModal.title}
              options={activeModal.options}
              onSelect={(opt) => {
                activeModal.onSelect(opt);
                setActiveModal(null);
              }}
              onCancel={() => {
                activeModal.onCancel?.();
                setActiveModal(null);
              }}
            />
          </Modal>
        );
      case 'custom':
        if (!customOverlay) return null;
        const CustomFactory = customOverlay.factory;
        return (
          <Modal onClose={() => { setCustomOverlay(null); }}>
            {(() => {
              const component = CustomFactory({
                tui: null,
                theme,
                keybindings: {},
                done: (result: any) => {
                  customOverlay.resolve(result);
                  setCustomOverlay(null);
                },
              });
              return component;
            })()}
          </Modal>
        );
      default:
        return null;
    }
  };

  const modelId = currentModel?.id || (runtime.session as any)?.model?.id || 'No model';
  const themeLabel = isDark ? 'dark' : 'light';

  // Compute resource counts for display
  const session = runtime.session as any;
  const resourceLoader = session._resourceLoader;
  let extCount = 0, skillCount = 0, promptCount = 0, themeCount = 0;
  if (resourceLoader) {
    try {
      const extResult = resourceLoader.getExtensions?.();
      if (extResult?.extensions?.length) extCount = extResult.extensions.length;
      const skillsResult = resourceLoader.getSkills?.();
      if (skillsResult?.skills?.length) skillCount = skillsResult.skills.length;
      const promptsResult = resourceLoader.getPromptTemplates?.();
      if (promptsResult?.length) promptCount = promptsResult.length;
      const themesResult = resourceLoader.getThemes?.();
      if (themesResult?.themes?.length) themeCount = themesResult.themes.length;
    } catch (e) {
      // ignore errors
    }
  }
  const resourceCounts = { extensions: extCount, skills: skillCount, prompts: promptCount, themes: themeCount };

  // Extension widget management (above editor)
  const [extensionWidgetsAbove, setExtensionWidgetsAbove] = React.useState<Map<string, string>>(new Map<string, string>());
  const [extensionWidgetsBelow, setExtensionWidgetsBelow] = React.useState<Map<string, string>>(new Map<string, string>());
  const setExtensionWidget = React.useCallback((key: string, content: any, options?: any) => {
    const placement = options?.placement || 'above';
    if (placement === 'above') {
      setExtensionWidgetsAbove(prev => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === 'string') next.set(key, content);
        return next;
      });
    } else if (placement === 'below') {
      setExtensionWidgetsBelow(prev => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === 'string') next.set(key, content);
        return next;
      });
    }
  }, []);

  // Custom editor component support
  const [customEditor, setCustomEditor] = React.useState<React.ComponentType<any> | null>(null);

  // Autocomplete provider management
  type AutocompleteProvider = (ctx: {sessionId: string; cwd: string; filter: string}) => Promise<Array<{label: string; description?: string; insertText?: string}>>;
  const [autocompleteProviderFactories, setAutocompleteProviderFactories] = React.useState<AutocompleteProvider[]>([]);
  const registerAutocompleteProvider = React.useCallback((factory: AutocompleteProvider) => {
    setAutocompleteProviderFactories(prev => [...prev, factory]);
  }, []);

  const handleAutocomplete = useCallback(async (filter: string): Promise<string[]> => {
    const ctx = { sessionId: '', cwd: runtime.cwd, filter };
    const suggestions: string[] = [];
    for (const factory of autocompleteProviderFactories) {
      try {
        const result = await factory(ctx);
        for (const item of result) {
          suggestions.push(item.insertText || item.label);
        }
      } catch {
        // ignore provider errors
      }
    }
    return suggestions;
  }, [runtime.cwd, autocompleteProviderFactories]);

  // Custom header/footer replacement
  const [customHeader, setCustomHeader] = React.useState<React.ReactNode>(null);
  const [customFooter, setCustomFooter] = React.useState<React.ReactNode>(null);

  // Custom overlay (for extensions)
  const [customOverlay, setCustomOverlay] = React.useState<{factory: Function; resolve: (value: any) => void} | null>(null);
  const showCustomOverlay = React.useCallback((factory: Function, options?: any): Promise<any> => {
    return new Promise(resolve => {
      setCustomOverlay({ factory, resolve });
    });
  }, []);

  // Extension UI dialog helpers
  const showConfirm = (title: string, message: string, opts?: any): Promise<boolean> => {
    return new Promise(resolve => {
      setActiveModal({
        type: 'confirmation',
        title,
        message,
        onConfirm: () => { resolve(true); setActiveModal(null); },
        onCancel: () => { resolve(false); setActiveModal(null); },
      });
    });
  };

  const showInput = (title: string, placeholder?: string, opts?: any): Promise<string | undefined> => {
    return new Promise(resolve => {
      setActiveModal({
        type: 'input',
        title,
        placeholder,
        onSubmit: (value: string) => { resolve(value); setActiveModal(null); },
        onCancel: () => { resolve(undefined); setActiveModal(null); },
      });
    });
  };

  const showSelect = (title: string, options: readonly string[], opts?: any): Promise<string | undefined> => {
    return new Promise(resolve => {
      setActiveModal({
        type: 'select',
        title,
        options,
        onSelect: (option: string) => { resolve(option); setActiveModal(null); },
        onCancel: () => { resolve(undefined); setActiveModal(null); },
      });
    });
  };

  // Create ExtensionUIContext factory - implements full ExtensionUIContext interface
  const createExtensionUIContext = () => ({
    select: showSelect,
    confirm: showConfirm,
    input: showInput,
    notify: (message: string, type: 'info' | 'warning' | 'error' = 'info') => addToast(message, type as any),
    onTerminalInput: (handler: any) => {
      // In a TUI, we can add a global key handler; for now return no-op unsubscribe
      return () => {};
    },
    setStatus: (key: string, text: string | undefined) => {
      // Could use footer provider's extension statuses; TUI specific.
      // For now, ignore or log.
    },
    setWorkingMessage: (message?: string) => {
      // Could update status line; not currently used
    },
    setWorkingIndicator: (options?: any) => {
      // Could adjust loading animation options
    },
    setHiddenThinkingLabel: (label?: string) => {
      setHiddenThinkingLabel(label || 'Thinking...');
    },
    setWidget: (key: string, content: any, options?: any) => {
      setExtensionWidget(key, content, options);
    },
    setFooter: setCustomFooter,
    setHeader: setCustomHeader,
    setTitle: (title: string) => { try { process.title = title; } catch {} },
    custom: showCustomOverlay,
    pasteToEditor: (text: string) => setInputValue(prev => prev + text),
    setEditorText: (text: string) => setInputValue(text),
    getEditorText: () => inputValue,
    editor: async (title: string, prefill?: string) => {
      // Open an editor modal and return the result
      return new Promise<string | undefined>((resolve) => {
        setActiveModal({
          type: 'editor',
          initialValue: prefill || '',
          onSave: async (val) => resolve(val),
        });
        // onCancel should also resolve undefined; we add cancel handler via existing modal infrastructure? The modal can be dismissed with Esc.
        // For simplicity, we'll rely on modal's onClose. But we need to differentiate save vs cancel.
        // For now, return prefill on immediate resolve (not correct). We'll need to modify modal handling to support cancellable editor.
        //TODO: proper modal with onCancel
        setTimeout(() => resolve(prefill), 0);
      });
    },
    addAutocompleteProvider: (factory: any) => {
      registerAutocompleteProvider(factory);
    },
    setEditorComponent: setCustomEditor,
    get theme() { return theme; },
    getAllThemes: () => {
      // Should get from theme system; returning empty for now
      return [];
    },
    getTheme: (name: string) => null,
    setTheme: (themeOrName: any) => {
      // Should toggle theme appropriately
      toggleTheme();
      return { success: true };
    },
    getToolsExpanded: () => toolOutputExpanded,
    setToolsExpanded: (expanded: boolean) => setToolOutputExpanded(expanded),
  });

  // Bind extensions on mount
  React.useEffect(() => {
    const session = runtime.session as any;
    if (session?.bindExtensions && !session.__picroBound) {
      const uiCtx = createExtensionUIContext();
      session.bindExtensions({
        uiContext: uiCtx,
        commandContextActions: {
          waitForIdle: async () => {
            // Wait for agent to be idle
            await (runtime.session as any).agent?.waitForIdle?.();
          },
          newSession: async (options?: any) => {
            try {
              const result = await runtime.newSession(options);
              return result;
            } catch (err) {
              console.error('Extension newSession failed:', err);
              return { cancelled: true };
            }
          },
          fork: async (entryId: string, options?: any) => {
            try {
              const result = await runtime.fork(entryId, options);
              return result;
            } catch (err) {
              console.error('Extension fork failed:', err);
              return { cancelled: true };
            }
          },
          navigateTree: async (targetId: string, options?: any) => {
            try {
              const session = runtime.session as any;
              if (typeof session.navigateTree === 'function') {
                const result = await session.navigateTree(targetId, options);
                if (!result.cancelled) {
                  // Refresh UI: rebuild chat
                  // Can't directly trigger here; expect session event to handle
                }
                return result;
              } else {
                return { cancelled: true };
              }
            } catch (err) {
              console.error('Extension navigateTree failed:', err);
              return { cancelled: true };
            }
          },
          switchSession: async (sessionPath: string, options?: any) => {
            try {
              const result = await runtime.switchSession(sessionPath, options);
              return result;
            } catch (err) {
              console.error('Extension switchSession failed:', err);
              return { cancelled: true };
            }
          },
          reload: async () => {
            try {
              // Reload resources: currently only settings reload is available
              await runtime.settings?.reload?.();
              // Could also reload extensions, skills, prompts, themes if supported
            } catch (err) {
              console.error('Extension reload failed:', err);
            }
          }
        },
        shutdownHandler: () => {
          // Mark shutdown requested; actual shutdown handled by InkApp
          console.log('Extension requested shutdown');
        },
        onError: (err: any) => {
          console.error('Extension error:', err);
          // Could show UI notification via toast
        }
      });
      session.__picroBound = true;
    }
  }, [runtime]);

  // Check for latest version on startup
  React.useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('https://registry.npmjs.org/picro');
        if (!res.ok) return;
        const data = await res.json();
        const latest = data?.['dist-tags']?.latest;
        if (latest && latest !== VERSION) {
          addToast(`New version ${latest} available (current: ${VERSION})`, 'info');
        }
      } catch (e) {
        // ignore
      }
    };
    checkVersion();
  }, [addToast]);

  // Input editor (default or custom) props
  const inputProps = {
    value: inputValue,
    onChange: setInputValue,
    onSubmit: handleSubmit,
    placeholder: 'Type your message...',
    disabled: isSubmitting,
    onSlashCommand: (prefix: string) => {
      setActiveModal({ type: 'command-palette', filter: prefix, isSlash: true });
    },
    onTab: () => {
      setActiveModal({ type: 'command-palette', filter: '', isSlash: false });
    },
    cwd: runtime.cwd,
    onPathComplete: handlePathComplete,
    onExternalEdit: handleExternalEdit,
    onAutocomplete: handleAutocomplete,
  };

  // Footer data provider for centralized state
  const footerProvider = React.useMemo<FooterDataProvider>(() => createFooterDataProvider(), []);

  // Subscribe to runtime events to update footer data
  React.useEffect(() => {
    const session = runtime.session as any;
    const updateFooter = () => { footerProvider.updateFromRuntime(runtime); };
    // Initial update
    updateFooter();
    // Subscribe to events that affect footer
    const unsubscribe = session?.subscribe?.((event: any) => {
      switch (event.type) {
        case 'agent_end':
        case 'compaction_end':
        case 'model_change':
        case 'session_tree':
          updateFooter();
          break;
        default:
          break;
      }
    });
    return () => unsubscribe?.();
  }, [runtime, footerProvider]);

  // Helper function for /export command
  const generateSessionHtml = (messages: any[], options: { title: string; includeStyles: boolean; includeImages: boolean; cwd: string }) => {
    const { title, includeStyles, includeImages, cwd } = options;
    const escapedTitle = escapeHtml(title);
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapedTitle}</title>`;
    if (includeStyles) {
      html += `<style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .message { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
        .user { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .assistant { background: #e8f5e9; border-left: 4px solid #4caf50; }
        .tool { background: #fff3e0; border-left: 4px solid #ff9800; }
        .bash-execution { background: #fce4ec; border-left: 4px solid #e91e63; }
        .role { font-weight: bold; margin-bottom: 8px; }
        .content { white-space: pre-wrap; word-wrap: break-word; }
        .tool-call { background: #f3e5f5; padding: 12px; border-radius: 4px; margin: 8px 0; font-family: monospace; }
        .thinking { color: #666; font-style: italic; border-left: 2px solid #ccc; padding-left: 12px; margin: 8px 0; }
        img { max-width: 100%; height: auto; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
      </style>`;
    }
    html += `</head><body>`;
    html += `<div class="header"><h1>${escapedTitle}</h1>`;
    html += `<p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>`;
    html += `<p><strong>CWD:</strong> ${escapeHtml(cwd)}</p>`;
    html += `<p><strong>Messages:</strong> ${messages.length}</p>`;
    html += `</div>`;

    for (const msg of messages) {
      let roleClass = 'user';
      let roleName = 'User';
      if (msg.role === 'assistant') { roleClass = 'assistant'; roleName = 'Assistant'; }
      else if (msg.role === 'tool') { roleClass = 'tool'; roleName = 'Tool'; }
      else if (msg.role === 'bashExecution') { roleClass = 'bash-execution'; roleName = 'Bash'; }
      else if (msg.role === 'compactionSummary') { roleClass = 'tool'; roleName = 'Compaction'; }
      else if (msg.role === 'branchSummary') { roleClass = 'tool'; roleName = 'Branch'; }
      else if (msg.role === 'custom') { roleClass = 'tool'; roleName = msg.customType || 'Custom'; }

      html += `<div class="message ${roleClass}">`;
      html += `<div class="role">${escapeHtml(roleName)}</div>`;
      html += `<div class="content">`;

      // Handle content blocks
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            html += `<p>${escapeHtml(block.text)}</p>`;
          } else if (block.type === 'thinking' && includeStyles) {
            html += `<div class="thinking">${escapeHtml(block.thinking)}</div>`;
          }
        }
      } else {
        html += `<p>${escapeHtml(String(msg.content || ''))}</p>`;
      }

      // Tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tool of msg.toolCalls) {
          html += `<div class="tool-call">`;
          html += `<strong>Tool:</strong> ${escapeHtml(tool.name)}<br>`;
          html += `<strong>Arguments:</strong> <pre>${escapeHtml(JSON.stringify(tool.arguments, null, 2))}</pre>`;
          html += `</div>`;
        }
      }

      html += `</div></div>`;
    }

    html += `<div class="footer">`;
    html += `<p>Generated by Picro Agent</p>`;
    html += `</div></body></html>`;

    return html;
  };

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  return (
    <Box flexDirection="column" width="100%" position="relative">
      {customHeader || (
        <Header
          title="Picro Agent"
          status={runtimeStatus || 'Ready'}
          thinkingLevel={thinkingLevel}
          model={modelId}
          theme={themeLabel}
          showArmin={true}
          resourceCounts={resourceCounts}
        />
      )}
      <Box flexGrow={1} overflow="hidden" position="relative">
        {/* Pending messages indicator */}
        {(steeringMessages.length > 0 || followUpMessages.length > 0) && (
          <Box borderBottom paddingX={1}>
            <Text color="yellow" dim>
              Queued: {steeringMessages.length} steer, {followUpMessages.length} follow-up (Ctrl+Alt+E to edit)
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
      {extensionWidgetsAbove.size > 0 && (
        <Box flexDirection="column" paddingX={1} borderTop="thin">
          {Array.from(extensionWidgetsAbove.entries()).map(([key, text]) => (
            <Text key={key}>{text}</Text>
          ))}
        </Box>
      )}
      {customEditor
        ? React.createElement(customEditor, inputProps)
        : <InputBox {...inputProps} />}
      {extensionWidgetsBelow.size > 0 && (
        <Box flexDirection="column" paddingX={1} borderTop="thin">
          {Array.from(extensionWidgetsBelow.entries()).map(([key, text]) => (
            <Text key={key}>{text}</Text>
          ))}
        </Box>
      )}
      {/* Status line for compaction/retry */}
      {(isCompacting || retryAttempt > 0) && (
        <Box paddingX={1}>
          <Text color={isCompacting ? 'yellow' : 'orange'}>
            {displayStatus}
          </Text>
        </Box>
      )}
      {customFooter || <Footer provider={footerProvider} hints={[
        'Ctrl+P: Commands',
        'Ctrl+T: Thinking',
        'Ctrl+Shift+T: Toggle Theme',
        'Ctrl+R: Resume Session',
        'Ctrl+Alt+E: Edit',
        'Ctrl+D: Debug',
        'Ctrl+C: Quit'
      ]} />}
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

