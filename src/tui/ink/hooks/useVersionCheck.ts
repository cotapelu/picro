/** @jsxImportSource react */
import { useEffect } from 'react';
import { VERSION } from '../../../config.js';

interface UseVersionCheckOpts {
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  openModal?: (modal: any) => void;
}

export function useVersionCheck(opts: UseVersionCheckOpts) {
  const { addToast, openModal } = opts;

  useEffect(() => {
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
            openModal?.({ type: 'changelog' });
          }
        }
      } catch {
        // ignore network errors
      }
    };
    checkVersion();
  }, [addToast, openModal]);
}
