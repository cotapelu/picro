// Footer - port từ pi-mono footer.ts
// Hiển thị pwd, token stats, context usage, model, git branch
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { formatTokens } from './FormatTokens.js';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

interface FooterProps {
  runtime?: AgentSessionRuntimeInterface;
}

export const Footer: React.FC<FooterProps> = ({ runtime }) => {
  const [status, setStatus] = useState({
    cwd: '.',
    model: 'unknown',
    tokens: '0/0',
    contextPercent: '0%',
    contextWindow: 0,
    isProcessing: false,
  });

  useEffect(() => {
    if (!runtime) return;
    const update = () => {
      try {
        const cwd = runtime.cwd || '.';
        const settings = runtime.settings || {};
        const defaultProvider = settings.getDefaultProvider?.() || 'unknown';
        const defaultModel = settings.getDefaultModel?.() || 'none';
        setStatus({
          cwd,
          model: `${defaultProvider}/${defaultModel}`,
          tokens: '0/0',
          contextPercent: '0%',
          contextWindow: 0,
          isProcessing: false,
        });
      } catch {
        setStatus({
          cwd: '.',
          model: 'unknown',
          tokens: '0/0',
          contextPercent: '0%',
          contextWindow: 0,
          isProcessing: false,
        });
      }
    };
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, [runtime]);

  return (
    <Box borderStyle="round" borderColor="green" padding={1} flexDirection="row" justifyContent="space-between">
      <Text>
        {status.isProcessing ? '⏳ Processing...' : '● Ready'} | Model: {status.model} | Tokens: {status.tokens} | Context: {status.contextPercent} | CWD: {status.cwd}
      </Text>
    </Box>
  );
};
