// Footer - hiển thị trạng thái: model, token, cwd, mode
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

interface FooterProps {
  runtime?: AgentSessionRuntimeInterface;
}

export const Footer: React.FC<FooterProps> = ({ runtime }) => {
  const [status, setStatus] = useState({ model: 'unknown', tokens: '0/0', cwd: '.' });

  useEffect(() => {
    if (!runtime) return;
    const update = () => {
      try {
        const cwd = runtime.cwd || '.';
        const settings = runtime.settings || {};
        const defaultProvider = settings.getDefaultProvider?.() || 'unknown';
        const defaultModel = settings.getDefaultModel?.() || 'none';
        setStatus({ model: `${defaultProvider}/${defaultModel}`, tokens: '0/0', cwd });
      } catch {
        setStatus({ model: 'unknown', tokens: '0/0', cwd: '.' });
      }
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [runtime]);

  return (
    <Box borderStyle="round" borderColor="green" padding={1} flexDirection="row" justifyContent="space-between">
      <Text>Model: {status.model}</Text>
      <Text>Tokens: {status.tokens}</Text>
      <Text>CWD: {status.cwd}</Text>
    </Box>
  );
};
