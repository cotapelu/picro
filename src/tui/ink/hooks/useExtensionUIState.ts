import { useCallback } from 'react';
import type { Component, ComponentType } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import { editWithExternalEditor, getPathSuggestions } from '../../interactive/actions.js';

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
  const [autocompleteProviderFactories, setAutocompleteProviderFactories] = useState<AutocompleteProviderFactories>([]);

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
    return getPathSuggestions(runtime.cwd, partial);
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
    const result = await editWithExternalEditor(text, runtime.cwd);
    if (result.type === 'text') return result.text;
    return text; // fallback to original on error
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
