/** @jsxImportSource react */
import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

interface LoginModalProps {
  onLogin: (apiKey: string) => Promise<void>;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // Auto-focus this modal
  const { focus } = useFocus();
  useEffect(() => { focus(); }, [focus]);

  const handleLogin = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus('error');
      setErrorMsg('API key cannot be empty');
      return;
    }

    setStatus('loading');
    try {
      await onLogin(apiKey.trim());
      onClose();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to login');
    }
  }, [apiKey, onLogin, onClose]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      handleLogin();
      return;
    }

    if (key.backspace || input === '\x7f') {
      setApiKey((prev) => prev.slice(0, -1));
      return;
    }

    if (input.length === 1 && !key.ctrl && !key.meta) {
      setApiKey((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
      <Text color="green" bold>
        Enter API Key
      </Text>
      <Box marginTop={1}>
        <Text color="gray">API Key: </Text>
        <Text color="cyan">
          {apiKey}
          <Text inverse>_</Text>
        </Text>
      </Box>
      {status === 'error' && (
        <Box marginTop={1}>
          <Text color="red">{errorMsg}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>
          Press Enter to submit, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};
