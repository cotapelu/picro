/** @jsxImportSource react */
import { useCallback } from 'react';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

interface UseAppActionsDeps {
  openModal: (modal: any) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  setToolOutputExpanded: (expanded: boolean) => void;
  setHideThinkingBlock: (hidden: boolean) => void;
  toolOutputExpanded: boolean;
  hideThinkingBlock: boolean;
  toggleTheme: () => void;
  isDark: boolean;
  runtime: AgentSessionRuntimeInterface;
}

export function useAppActions(deps: UseAppActionsDeps) {
  const {
    openModal,
    addToast,
    setToolOutputExpanded,
    setHideThinkingBlock,
    toolOutputExpanded,
    hideThinkingBlock,
    toggleTheme,
    isDark,
    runtime,
  } = deps;

  const onCommandPalette = useCallback(() => {
    openModal({ type: 'command-palette' });
  }, [openModal]);

  const onThinking = useCallback(() => {
    openModal({ type: 'thinking' });
  }, [openModal]);

  const onThemeToggle = useCallback(() => {
    toggleTheme();
    try {
      runtime.settings?.set('theme', isDark ? 'light' : 'dark');
      runtime.settings?.save?.();
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
  }, [toggleTheme, isDark, runtime.settings]);

  const onToolOutputToggle = useCallback(() => {
    const next = !toolOutputExpanded;
    setToolOutputExpanded(next);
    addToast('Tool output ' + (next ? 'expanded' : 'collapsed'));
  }, [toolOutputExpanded, addToast, setToolOutputExpanded]);

  const onThinkingBlockToggle = useCallback(() => {
    const next = !hideThinkingBlock;
    setHideThinkingBlock(next);
    addToast('Thinking blocks: ' + (next ? 'hidden' : 'visible'));
  }, [hideThinkingBlock, addToast, setHideThinkingBlock]);

  const onLogin = useCallback(() => {
    openModal({ type: 'login' });
  }, [openModal]);

  const onSessionSelector = useCallback(() => {
    openModal({ type: 'session-selector' });
  }, [openModal]);

  const onDebug = useCallback(async () => {
    try {
      const rt = runtime as any;
      const session = rt.session;
      const { messages } = session;
      const stats = session.getSessionStats?.();
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const debugLogPath = join(tmpdir(), `picro-debug-${Date.now()}.log`);
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
      const { writeFileSync } = await import('node:fs');
      writeFileSync(debugLogPath, lines.join('\n'), 'utf-8');
      addToast(`Debug log written to ${debugLogPath}`, 'success');
    } catch (err: any) {
      addToast(`Debug failed: ${(err as Error).message}`, 'error');
    }
  }, [runtime, addToast]);

  const onEditor = useCallback(async () => {
    // External editor (Ctrl+E)
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim';
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const { spawnSync } = await import('node:child_process');
    const tmpdir = os.tmpdir();
    const dir = fs.mkdtempSync(path.join(tmpdir, 'picro-'));
    const filepath = path.join(dir, 'edit.txt');
    try {
      // For external edit, we need current editor text; will be provided by caller as argument.
      // The caller (InputBox) may pass the current value. We'll return the edited text.
      // The actual editing is done here; but we don't have initial text. We'll read from stdin? Not needed.
      // Placeholder: open editor empty.
      fs.writeFileSync(filepath, '', 'utf-8');
      spawnSync(editor, [filepath], { stdio: 'inherit', cwd: runtime.cwd });
      const newText = fs.readFileSync(filepath, 'utf-8');
      addToast('External editor completed', 'info');
      return newText;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, [runtime.cwd, addToast]);

  const onPaste = useCallback(async () => {
    try {
      const { readClipboardImage } = await import('../../utils/clipboard-image.js');
      const image = await readClipboardImage();
      if (!image) {
        addToast('No image in clipboard', 'info');
        return;
      }
      // Insert file path into editor - will be handled by onPaste in InputBox.
      addToast('Image pasted (not implemented)', 'info');
    } catch (err: any) {
      addToast(`Paste failed: ${err.message}`, 'error');
    }
  }, [addToast]);

  const onSlashCommand = useCallback((prefix: string) => {
    openModal({ type: 'command-palette', filter: prefix, isSlash: true });
  }, [openModal]);

  const onTab = useCallback(() => {
    openModal({ type: 'command-palette', filter: '', isSlash: false });
  }, [openModal]);

  return {
    onCommandPalette,
    onThinking,
    onThemeToggle,
    onToolOutputToggle,
    onThinkingBlockToggle,
    onLogin,
    onSessionSelector,
    onDebug,
    onEditor,
    onPaste,
    onSlashCommand,
    onTab,
  };
}
