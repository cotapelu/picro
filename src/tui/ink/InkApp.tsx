/** @jsxImportSource react */
import React, { useCallback } from 'react';
import { render, Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import type { Message } from './types.js';
import { ThemeProvider, useTheme } from './hooks/useTheme.js';
import { useRuntime } from './hooks/useRuntime.js';
import { useModal } from './hooks/useModal.js';
import { Header } from './components/Header/Header.js';
import { MessageList } from './components/MessageList/MessageList.js';
import { InputBox } from './components/InputBox/InputBox.js';
import { Footer } from './components/Footer/Footer.js';
import { createFooterDataProvider, type FooterDataProvider } from './components/Footer/FooterDataProvider.js';
import { ErrorBoundary, useGlobalErrorHandler } from './ErrorBoundary.js';
import { ModalRenderers } from './modal-renderers.js';
import { handleCommand } from './command-handlers.js';
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
  | { type: 'tree-summarization'; branchId: string }
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: { sampleCount: number; timeSpanMS: number; avgCpuUserMS: number; avgCpuSystemMS: number; avgRSSMB: number; avgHeapUsedMB: number; peakRSSMB: number; peakHeapUsedMB: number } }
  | { type: 'armin' }
  | { type: 'earendil' }
  | { type: 'custom' }
  | { type: 'input'; title: string; placeholder?: string; onSubmit: (value: string) => void; onCancel?: () => void }
  | { type: 'select'; title: string; options: readonly string[]; onSelect: (option: string) => void; onCancel?: () => void }
  | null;

const InkAppInner: React.FC<InkAppInnerProps> = ({ runtime }) => {
  const { messages, status: runtimeStatus, thinkingLevel, sendMessage, isCompacting, retryAttempt, steeringMessages, followUpMessages, toolOutputExpanded, setToolOutputExpanded, hideThinkingBlock, setHideThinkingBlock, hiddenThinkingLabel, setHiddenThinkingLabel, currentModel, setMessages } = useRuntime(runtime as any);
  const [retryCountdown, setRetryCountdown] = React.useState(0);
  const [retryMaxAttempts, setRetryMaxAttempts] = React.useState(3);
  const [retryEscapeHandler, setRetryEscapeHandler] = React.useState<(() => void) | null>(null);
  const [autoCompactionEscapeHandler, setAutoCompactionEscapeHandler] = React.useState<(() => void) | null>(null);

  // Extension shortcuts registry
  const extensionShortcutsRef = React.useRef<Map<string, (input: string, key: any) => boolean | void>>(new Map());

  // Helper to match keyId string like "ctrl+p"
  const matchesKey = (input: string, key: any, keyId: string): boolean => {
    const parts = keyId.toLowerCase().split('+');
    const modifiers = parts.slice(0, -1);
    const expectedChar = parts[parts.length - 1];
    if (input !== expectedChar) return false;
    if (modifiers.includes('ctrl') !== !!key.ctrl) return false;
    if (modifiers.includes('shift') !== !!key.shift) return false;
    if (modifiers.includes('alt') !== !!key.alt) return false;
    return true;
  };

  // Setup extension shortcuts from runner
  const setupExtensionShortcuts = React.useCallback((runner: any) => {
    const shortcuts = runner.getShortcuts?.() ?? new Map<string, any>();
    const newMap = new Map<string, (input: string, key: any) => boolean | void>();
    for (const [keyId, shortcut] of shortcuts.entries()) {
      newMap.set(keyId, shortcut.handler as any);
    }
    extensionShortcutsRef.current = newMap;
  }, []);

  // Retry countdown timer (decrements every second when active)
  React.useEffect(() => {
    if (retryCountdown <= 0) return;
    const interval = setInterval(() => {
      setRetryCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryCountdown]);

  // Compute status display
  let displayStatus = runtimeStatus || 'Ready';
  if (isCompacting) {
    displayStatus = 'Compacting... (Esc to cancel)';
  } else if (retryAttempt > 0) {
    displayStatus = `Retrying (${retryAttempt}/${retryMaxAttempts}) in ${retryCountdown}s... (Esc to cancel)`;
  }
  const { toggleTheme, isDark, theme } = useTheme();
  const [inputValue, setInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { activeModal, setActiveModal } = useModal();
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
        // Footer updates
        case 'agent_end':
        case 'compaction_end':
        case 'model_change':
        case 'session_tree':
          updateFooter();
          break;
        // Retry handling
        case 'auto_retry_start':
          setRetryAttempt(event.attempt ?? 0);
          setRetryMaxAttempts(event.maxAttempts ?? 3);
          setRetryCountdown(((event.delayMs ?? 3000) / 1000));
          const retryHandler = () => {
            (runtime.session as any).abortRetry?.();
            setRetryEscapeHandler(null);
          };
          setRetryEscapeHandler(retryHandler);
          break;
        case 'auto_retry_end':
          setRetryAttempt(0);
          setRetryCountdown(0);
          setRetryEscapeHandler(null);
          break;
        // Compaction handling
        case 'compaction_start':
          setIsCompacting(true);
          const compactionHandler = () => {
            (runtime.session as any).abortCompaction?.();
            setAutoCompactionEscapeHandler(null);
          };
          setAutoCompactionEscapeHandler(compactionHandler);
          break;
        case 'compaction_end':
          setIsCompacting(false);
          setAutoCompactionEscapeHandler(null);
          // Add CompactionSummaryMessage if available
          if (event.summaryEntry) {
            const summaryMsg: Message = {
              id: `compaction-${Date.now()}`,
              role: 'compactionSummary',
              content: event.summaryEntry.toString() || '[Compaction]',
              timestamp: Date.now(),
            };
            setMessages(prev => [...prev, summaryMsg]);
          }
          break;
        default:
          break;
      }
    });
    return () => unsubscribe?.();
  }, [runtime, footerProvider]);

  // Command handler for slash commands (both manual and from palette)
  const handleDequeue = useCallback(() => {
    try {
      const session = runtime.session as any;
      if (typeof session.clearQueue === 'function') {
        const { steering, followUp } = session.clearQueue();
        const combined = [...steering, ...followUp].join('\n');
        setInputValue(prev => prev + (prev && !prev.endsWith('\n') && combined ? '\n' : '') + combined);
        addToast(`Dequeued ${steering.length + followUp.length} messages`, 'info');
      } else {
        addToast('Dequeue not supported', 'error');
      }
    } catch (err: any) {
      console.error('Dequeue error:', err);
      addToast('Dequeue failed', 'error');
    }
  }, [runtime, setInputValue, addToast]);

  const handlePaste = useCallback(async () => {
    try {
      let pngBuffer: Buffer;
      try {
        const { execFileSync } = await import('node:child_process');
        pngBuffer = execFileSync('wl-paste', ['--no-size', '--type', 'image/png']);
      } catch (e1) {
        try {
          pngBuffer = execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
        } catch (e2) {
          addToast('No image in clipboard or missing wl-paste/xclip', 'error');
          return;
        }
      }
      const fs = await import('node:fs');
      const path = await import('node:path');
      const timestamp = Date.now();
      const filename = `pasted-${timestamp}.png`;
      const filepath = path.join(runtime.cwd, filename);
      fs.writeFileSync(filepath, pngBuffer);
      setInputValue(prev => prev + filename);
      addToast(`Pasted image as ${filename}`, 'success');
    } catch (err: any) {
      console.error('Paste error:', err);
      addToast('Paste failed', 'error');
    }
  }, [runtime.cwd, setInputValue, addToast]);

  const handleEditor = useCallback(async (value: string) => {
    try {
      const editor = process.env.EDITOR || process.env.VISUAL || 'vim';
      const fs = await import('node:fs');
      const path = await import('node:path');
      const os = await import('node:os');
      const { spawnSync } = await import('node:child_process');
      const tmpdir = os.tmpdir();
      const dir = fs.mkdtempSync(path.join(tmpdir, 'picro-'));
      const filepath = path.join(dir, 'edit.txt');
      try {
        fs.writeFileSync(filepath, value || '', 'utf-8');
        spawnSync(editor, [filepath], { stdio: 'inherit', cwd: runtime.cwd });
        const newText = fs.readFileSync(filepath, 'utf-8');
        setInputValue(newText);
        addToast('Edited externally', 'success');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error('External edit error:', err);
      addToast('External edit failed', 'error');
    }
  }, [runtime.cwd, setInputValue, addToast]);

  const handleSelectCommand = useCallback(async (commandId: string, slashArgs?: string) => {
    try {
      const result = await handleCommand({
        runtime,
        addToast,
        setActiveModal,
        messages,
        footerProvider,
        inputValue,
        setInputValue,
      }, commandId, slashArgs);

      if (result === 'insert') {
        const textToInsert = slashArgs ?? '/' + commandId;
        setInputValue(prev => prev + textToInsert + ' ');
      }
      // 'paste' result is handled by command handler (toast shown)
    } catch (err: any) {
      console.error('Command error:', err.message || err);
      addToast(`Command error: ${err.message || err}`, 'error');
    }
  }, [runtime, addToast, setActiveModal, messages, footerProvider, inputValue, setInputValue]);

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

    // Slash command handling
    if (userInput.startsWith('/')) {
      const commandId = userInput.slice(1).split(' ')[0];
      try {
        await handleSelectCommand(commandId, userInput);
      } catch (err: any) {
        console.error('Slash command error:', err.message || err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await sendMessage(userInput);
    } catch (err: any) {
      console.error('Send error:', err.message || err);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isSubmitting, sendMessage, handleSelectCommand]);

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

  const navigateTree = useCallback(async (branchId: string, options?: { summarize?: boolean; customInstructions?: string }) => {
    try {
      const session = runtime.session as any;
      if (typeof session.navigateTree === 'function') {
        const result = await session.navigateTree(branchId, options);
        if (result.cancelled) {
          addToast('Branch navigation cancelled', 'info');
        } else {
          addToast(`Switched to branch: ${branchId}` + (options?.summarize ? ' (summarized)' : ''), 'success');
        }
        return result;
      } else {
        addToast('Tree navigation not supported', 'error');
        return { cancelled: true };
      }
    } catch (err: any) {
      addToast(`Tree navigation failed: ${(err as Error).message}`, 'error');
      return { cancelled: true };
    }
  }, [runtime, addToast]);

  const handleTreeSelect = useCallback((branchId: string) => {
    // Open summarization options modal
    setActiveModal({ type: 'tree-summarization', branchId });
  }, []);

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
  const modelId = currentModel?.id || (runtime.session as any)?.model?.id || 'No model';
  const themeLabel = isDark ? 'dark' : 'light';

  // Resource counts state (populated on startup)
  const [resourceCounts, setResourceCounts] = React.useState<{ extensions: number; skills: number; prompts: number; themes: number }>({ extensions: 0, skills: 0, prompts: 0, themes: 0 });

  // showLoadedResources: compute counts and optionally show toast
  const showLoadedResources = React.useCallback((opts?: { force?: boolean; showDiagnosticsWhenQuiet?: boolean }) => {
    try {
      const ses = runtime.session as any;
      const loader = ses._resourceLoader;
      let ext = 0, skill = 0, prompt = 0, theme = 0;
      if (loader) {
        try {
          const extRes = loader.getExtensions?.();
          if (extRes?.extensions?.length) ext = extRes.extensions.length;
          const skillsRes = loader.getSkills?.();
          if (skillsRes?.skills?.length) skill = skillsRes.skills.length;
          const promptsRes = loader.getPromptTemplates?.();
          if (promptsRes?.length) prompt = promptsRes.length;
          const themesRes = loader.getThemes?.();
          if (themesRes?.themes?.length) theme = themesRes.themes.length;
        } catch {}
      }
      setResourceCounts({ extensions: ext, skills: skill, prompts: prompt, themes: theme });

      const settings = runtime.settings as any;
      const quiet = settings?.get?.('quietStartup') ?? false;
      if (opts?.force || !quiet) {
        addToast(`Loaded: ${ext} extensions, ${skill} skills, ${prompt} prompts, ${theme} themes`, 'info');
      }
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  }, [runtime, addToast]);

  // Show loaded resources on startup
  React.useEffect(() => {
    showLoadedResources({ force: false });
  }, [showLoadedResources]);

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

  // Shortcut callbacks for InputBox
  const onCommandPalette = React.useCallback(() => {
    setActiveModal({ type: 'command-palette' });
  }, [setActiveModal]);

  const onThinking = React.useCallback(() => {
    setActiveModal({ type: 'thinking' });
  }, [setActiveModal]);

  const onThemeToggle = React.useCallback(() => {
    toggleTheme();
    try {
      runtime.settings?.set('theme', isDark ? 'light' : 'dark');
      runtime.settings?.save?.();
    } catch {}
  }, [toggleTheme, isDark, runtime.settings]);

  const onToolOutputToggle = React.useCallback(() => {
    setToolOutputExpanded(prev => !prev);
    addToast('Tool output ' + (!toolOutputExpanded ? 'expanded' : 'collapsed'));
  }, [toolOutputExpanded, addToast]);

  const onThinkingBlockToggle = React.useCallback(() => {
    setHideThinkingBlock(prev => !prev);
    addToast('Thinking blocks: ' + (!hideThinkingBlock ? 'hidden' : 'visible'));
  }, [hideThinkingBlock, addToast]);

  const onLogin = React.useCallback(() => {
    setActiveModal({ type: 'login' });
  }, [setActiveModal]);

  const onSessionSelector = React.useCallback(() => {
    setActiveModal({ type: 'session-selector' });
  }, [setActiveModal]);

  const onDebug = React.useCallback(() => {
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

  const onEditor = React.useCallback((value: string) => {
    setActiveModal({ type: 'editor', initialValue: value, onSave: async (val) => setInputValue(val) });
  }, [setActiveModal]);

  const onPaste = React.useCallback(async () => {
    try {
      const clipboardy = await import('clipboardy');
      const text = await clipboardy.default.read();
      setInputValue(prev => prev + text);
      addToast('Pasted from clipboard', 'info');
    } catch (err: any) {
      addToast('Paste failed: ' + (err.message || err), 'error');
    }
  }, [addToast]);

  const onInterrupt = React.useCallback(() => {
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
  }, [runtime, addToast]);

  // Input editor (default or custom) props
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
      // Register extension shortcuts
      if (session._extensionRunner?.getShortcuts) {
        setupExtensionShortcuts(session._extensionRunner);
      }
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

  // Check for Anthropic subscription auth warning
  React.useEffect(() => {
    try {
      const authStorage = (runtime as any).authStorage;
      const apiKey = authStorage?.getApiKey?.('anthropic');
      if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('sk-ant-oat')) {
        addToast('Anthropic subscription auth active - extra usage applies', 'warning');
      }
    } catch {}
  }, [runtime, addToast]);

  // Memoized callbacks for input props to prevent infinite loops
  const onSlashCommand = React.useCallback((prefix: string) => {
    setActiveModal({ type: 'command-palette', filter: prefix, isSlash: true });
  }, [setActiveModal]);

  const onTab = React.useCallback(() => {
    setActiveModal({ type: 'command-palette', filter: '', isSlash: false });
  }, [setActiveModal]);

  const onPathCompleteMemo = React.useCallback(handlePathComplete, [handlePathComplete]);
  const onExternalEditMemo = React.useCallback(handleExternalEdit, [handleExternalEdit]);
  const onAutocompleteMemo = React.useCallback(handleAutocomplete, [handleAutocomplete]);

  // Input editor (default or custom) props
  const inputProps = {
    value: inputValue,
    onChange: setInputValue,
    onSubmit: handleSubmit,
    placeholder: 'Type your message...',
    disabled: isSubmitting,
    onSlashCommand,
    onTab,
    cwd: runtime.cwd,
    onPathComplete: onPathCompleteMemo,
    onExternalEdit: onExternalEditMemo,
    onAutocomplete: onAutocompleteMemo,
    // pass shortcuts
    extensionShortcuts: extensionShortcutsRef,
    onCommandPalette,
    onThinking,
    onThemeToggle,
    onToolOutputToggle,
    onThinkingBlockToggle,
    onLogin,
    onSessionSelector,
    onDebug,
    onEditor: handleEditor,
    onPaste: handlePaste,
    onInterrupt,
    onDequeue: handleDequeue,
    onEscape: () => {
      if (retryEscapeHandler) {
        retryEscapeHandler();
      } else if (autoCompactionEscapeHandler) {
        autoCompactionEscapeHandler();
      } else {
        if (activeModal) {
          setActiveModal(null);
        } else {
          setInputValue('');
        }
      }
    },
  };  // Signal handlers for graceful shutdown
  React.useEffect(() => {
    const handleSignal = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      try {
        await runtime.dispose?.();
      } catch (err) {
        console.error('Error during shutdown:', err);
      }
      process.exit(0);
    };
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
    process.on('SIGHUP', () => handleSignal('SIGHUP'));
    return () => {
      process.off('SIGTERM', handleSignal);
      process.off('SIGHUP', handleSignal);
    };
  }, [runtime]);

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
      {activeModal && (
        <ModalRenderers
          activeModal={activeModal}
          runtime={runtime}
          onSelectCommand={handleSelectCommand}
          onTreeSelect={handleTreeSelect}
          onClose={() => setActiveModal(null)}
        />
      )}
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

