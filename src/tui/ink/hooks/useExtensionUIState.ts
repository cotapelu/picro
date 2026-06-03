/** @jsxImportSource react */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Component, ComponentType } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

interface UseExtensionUIStateReturn {
  extensionWidgetsAbove: Map<string, string>;
  extensionWidgetsBelow: Map<string, string>;
  setExtensionWidget: (key: string, content: any, options?: { placement?: 'above' | 'below' }) => void;
  customEditor: ComponentType<any> | null;
  setCustomEditor: React.Dispatch<React.SetStateAction<ComponentType<any> | null>>;
  autocompleteProviderFactories: AutocompleteProviderFactories;
  registerAutocompleteProvider: (factory: AutocompleteProviderFactory) => void;
  handlePathComplete: (partial: string) => Promise<string[]>;
  handleAutocomplete: (filter: string) => Promise<string[]>;
  handleExternalEdit: (text: string) => Promise<string>;
  setupExtensionShortcuts: (runner: any) => void;
}

type AutocompleteProviderFactory = (ctx: any) => Promise<Array<{label: string; description?: string; insertText?: string}>>;
type AutocompleteProviderFactories = Array<AutocompleteProviderFactory>;

export function useExtensionUIState(runtime: AgentSessionRuntimeInterface): UseExtensionUIStateReturn {
  const [extensionWidgetsAbove, setExtensionWidgetsAbove] = useState<Map<string, string>>(new Map());
  const [extensionWidgetsBelow, setExtensionWidgetsBelow] = useState<Map<string, string>>(new Map());
  const [customEditor, setCustomEditor] = useState<React.ComponentType<any> | null>(null);
  const [autocompleteProviderFactories, setAutocompleteProviderFactories] = useState<Array<(ctx: any) => Promise<Array<{label: string; description?: string; insertText?: string}>>>([]);

  const extensionShortcutsRef = useRef<Map<string, (input: string, key: any) => boolean | void>>(new Map());

  const setExtensionWidget = useCallback((key: string, content: any, options?: { placement?: 'above' | 'below' }) => {
    const placement = options?.placement || 'above';
    if (placement === 'above') {
      setExtensionWidgetsAbove(prev => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === 'string') next.set(key, content);
        return next;
      });
    } else {
      setExtensionWidgetsBelow(prev => {
        const next = new Map(prev);
        if (content == null) next.delete(key);
        else if (typeof content === 'string') next.set(key, content);
        return next;
      });
    }
  }, []);

  const registerAutocompleteProvider = useCallback((factory: any) => {
    setAutocompleteProviderFactories(prev => [...prev, factory]);
  }, []);

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
      fs.writeFileSync(filepath, text || '', 'utf-8');
      spawnSync(editor, [filepath], { stdio: 'inherit', cwd: runtime.cwd });
      const newText = fs.readFileSync(filepath, 'utf-8');
      return newText;
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, [runtime.cwd]);

  const setupExtensionShortcuts = useCallback((runner: any) => {
    const shortcuts = runner.getShortcuts?.() ?? new Map<string, any>();
    const newMap = new Map<string, (input: string, key: any) => boolean | void>();
    for (const [keyId, shortcut] of shortcuts.entries()) {
      newMap.set(keyId, shortcut.handler as any);
    }
    extensionShortcutsRef.current = newMap;
  }, []);

  // Expose extensionShortcuts via a stable ref? Not directly; caller needs to pass it.
  // We'll return the ref as a property? Actually we return setup function; the ref is internal.
  // The caller (InkApp) should maintain a ref and we can provide a way to get it.
  // But to keep simple, we return the ref as part of return so parent can attach to input.
  // However, we can't return mutable ref safely across renders? Could return a getter.
  // Simpler: let parent create its own extensionShortcutsRef and call setup to populate it.
  // We'll just return setupExtensionShortcuts function.

  return {
    extensionWidgetsAbove,
    extensionWidgetsBelow,
    setExtensionWidget,
    customEditor,
    setCustomEditor,
    autocompleteProviderFactories,
    registerAutocompleteProvider,
    handlePathComplete,
    handleAutocomplete,
    handleExternalEdit,
    setupExtensionShortcuts,
  };
}
