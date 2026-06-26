/** @jsxImportSource react */
import { useCallback } from 'react';
import {
  pasteImageFromClipboard,
  readTextFromClipboard,
  editWithExternalEditor,
  generateDebugLog,
  getPathSuggestions,
  executeBashCommand,
} from '../../interactive/actions.js';

interface UseAppActionsDeps {
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  setInputValue: (value: string) => void;
  runtime: any;
  cwd: string;
}

/**
 * Hook for app-wide actions (paste, debug, editor, etc.)
 * Thin wrappers around backend actions
 */
export function useAppActions(deps: UseAppActionsDeps) {
  const { addToast, setInputValue, runtime, cwd } = deps;

  const onPasteTrigger = useCallback(async () => {
    const result = await pasteImageFromClipboard(cwd);
    if (result.type === 'paste' && result.filepath) {
      setInputValue(prev => prev + result.filepath);
      addToast(`Pasted image as ${result.filepath}`, 'success');
    } else if (result.type === 'error') {
      addToast(result.error, 'error');
    }
  }, [cwd, setInputValue, addToast]);

  const onPasteTextTrigger = useCallback(async () => {
    const result = await readTextFromClipboard();
    if (result.type === 'text' && result.text) {
      setInputValue(prev => prev + result.text);
      addToast('Pasted from clipboard', 'info');
    } else if (result.type === 'error') {
      addToast(result.error, 'error');
    }
  }, [setInputValue, addToast]);

  const onExternalEdit = useCallback(async (initialText?: string) => {
    const result = await editWithExternalEditor(initialText || '', cwd);
    if (result.type === 'text') {
      return result.text;
    } else {
      addToast(result.error || 'External edit failed', 'error');
      return initialText;
    }
  }, [cwd, addToast]);

  const onDebugTrigger = useCallback(async () => {
    const result = await generateDebugLog(runtime);
    if (result.type === 'text') {
      addToast(`Debug log written to ${result.text}`, 'success');
    } else {
      addToast(result.error || 'Debug failed', 'error');
    }
  }, [runtime, addToast]);

  const onPathAutocomplete = useCallback(async (partial: string): Promise<string[]> => {
    return getPathSuggestions(cwd, partial);
  }, [cwd]);

  const onBashExecute = useCallback(async (cmd: string) => {
    const result = await executeBashCommand(cmd, cwd);
    return result;
  }, [cwd]);

  return {
    onPaste: onPasteTrigger,
    onPasteText: onPasteTextTrigger,
    onExternalEdit,
    onDebug: onDebugTrigger,
    onPathAutocomplete,
    onBashExecute,
  };
}
