/** @jsxImportSource react */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';
import { createFooterDataProvider, type FooterDataProvider } from '../components/Footer/FooterDataProvider.js';
import { handleCommand } from '../../interactive/command-handlers.js';

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
  | { type: 'bash-output'; command: string; output: string; error?: boolean }
  | { type: 'stats'; stats: any }
  | { type: 'armin' }
  | { type: 'earendil' }
  | null;

interface UseInkAppReturn {
  activeModal: ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  handleCommandSelect: (commandId: string, slashArgs?: string) => Promise<void>;
  footerProvider: FooterDataProvider;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  toasts: Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>;
}

export function useInkApp(runtime: AgentSessionRuntimeInterface, _runtimeDeps: any): UseInkAppReturn {
  const [activeModal, setActiveModal] = useState<ModalState>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'info' | 'success' | 'error' }>>([]);
  const toastIdRef = useRef(0);
  const footerProvider = useMemo<FooterDataProvider>(() => createFooterDataProvider(), []);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleCommandSelect = useCallback(async (commandId: string, slashArgs?: string) => {
    const result = await handleCommand({
      runtime,
      messages: (runtime.session as any).messages || [],
      cwd: runtime.cwd,
    }, commandId, slashArgs);

    if (result === 'insert') {
      return 'insert';
    }
    if (result && typeof result === 'object') {
      if (result.type === 'toast') {
        addToast(result.message, result.toastType);
      } else if (result.type === 'modal') {
        setActiveModal(result.modal);
      }
    }
  }, [runtime, addToast]);

  return {
    activeModal,
    openModal: setActiveModal,
    closeModal: () => setActiveModal(null),
    handleCommandSelect,
    footerProvider,
    addToast,
    toasts,
  };
}
