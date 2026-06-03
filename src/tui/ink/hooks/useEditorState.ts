/** @jsxImportSource react */
import { useState, useCallback, useRef } from 'react';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

interface UseEditorStateDeps {
  sendMessage: (text: string) => Promise<void>;
  handleCommandSelect: (commandId: string, slashArgs?: string) => Promise<'insert' | 'paste' | void>;
  openModal: (modal: any) => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export function useEditorState(
  runtime: AgentSessionRuntimeInterface,
  deps: UseEditorStateDeps
) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastCtrlCTimeRef = useRef(0);

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
          deps.openModal({ type: 'bash-output', command: cmd, output });
        } catch (err: any) {
          deps.openModal({ type: 'bash-output', command: cmd, output: err.message || 'Error', error: true });
        }
      }
      setIsSubmitting(false);
      return;
    }

    // Slash command handling
    if (userInput.startsWith('/')) {
      const commandId = userInput.slice(1).split(' ')[0];
      try {
        await deps.handleCommandSelect(commandId, userInput);
      } catch (err: any) {
        console.error('Slash command error:', err.message || err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await deps.sendMessage(userInput);
    } catch (err: any) {
      console.error('Send error:', err.message || err);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputValue, isSubmitting, deps]);

  const handleInterrupt = useCallback(() => {
    const now = Date.now();
    if (now - lastCtrlCTimeRef.current < 500) {
      // Double Ctrl+C: shutdown
      void runtime.dispose?.().then(() => {
        process.exit(0);
      }).catch(() => {
        process.exit(0);
      });
    } else {
      // Single Ctrl+C: clear editor
      setInputValue('');
      lastCtrlCTimeRef.current = now;
    }
  }, [runtime]);

  return {
    inputValue,
    setInputValue,
    isSubmitting,
    handleSubmit,
    onInterrupt: handleInterrupt,
  };
}
