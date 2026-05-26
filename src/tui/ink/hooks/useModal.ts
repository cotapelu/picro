/** @jsxImportSource react */
import { useCallback, useState } from 'react';
import type { ModalState } from '../InkApp.js';

export function useModal() {
  const [activeModal, setActiveModal] = useState<ModalState>(null);

  const openModal = useCallback((modal: ModalState) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return {
    activeModal,
    openModal,
    closeModal,
    setActiveModal,
  };
}
