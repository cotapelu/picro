/** @jsxImportSource react */
import { useCallback } from 'react';
import { handleCommand, type CommandResult } from '../../interactive/command-handlers.js';

interface CommandContext {
  runtime: any;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  setActiveModal: (modal: any) => void;
  messages: any[];
  setInputValue: (value: string) => void;
}

/**
 * Hook for handling slash commands
 * Thin wrapper around backend command handlers
 */
export function useCommandRegistry(ctx: CommandContext) {
  const { runtime, addToast, setActiveModal, messages, setInputValue } = ctx;

  const handleCommandWrapper = useCallback(async (commandId: string, slashArgs?: string): Promise<void> => {
    try {
      const result = await handleCommand(
        {
          runtime,
          messages,
          cwd: runtime.cwd,
        },
        commandId,
        slashArgs
      );

      // Handle result types from backend
      if (result === 'insert') {
        const textToInsert = slashArgs ?? '/' + commandId;
        setInputValue(prev => prev + textToInsert + ' ');
      } else if (result === 'paste') {
        // Paste result handled separately (filepath inserted in FE)
        // result type 'paste' means successful paste, filepath should be returned
        if (result.filepath) {
          setInputValue(prev => prev + result.filepath);
        }
      } else if (result && typeof result === 'object') {
        switch (result.type) {
          case 'toast':
            addToast(result.message, result.toastType);
            if (result.type !== 'modal') {
              // Clear input for non-modal commands (except when command doesn't clear)
              const shouldClear = ['new', 'thinking', 'login', 'settings', 'model', 'export', 'import', 'share', 'clone', 'compact', 'reload', 'logout', 'fork', 'stats', 'debug'].includes(commandId);
              if (shouldClear) {
                setInputValue('');
              }
            }
            break;
          case 'modal':
            setActiveModal(result.modal);
            break;
          case 'none':
            // No UI action needed
            break;
        }
      }
    } catch (err: any) {
      console.error('Command error:', err.message || err);
      addToast(`Command error: ${err.message || err}`, 'error');
    }
  }, [runtime, messages, addToast, setActiveModal, setInputValue]);

  return {
    handleCommand: handleCommandWrapper,
  };
}
