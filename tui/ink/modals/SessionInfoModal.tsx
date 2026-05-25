/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface SessionInfoModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

export const SessionInfoModal: React.FC<SessionInfoModalProps> = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  const [info, setInfo] = useState<{
    id?: string;
    name?: string;
    messageCount: number;
    cwd: string;
    model?: string;
  } | null>(null);

  useEffect(() => {
    const sessionManager = runtime.session as any;
    const session = sessionManager?.getSession?.() || runtime.session;
    
    const infoData = {
      id: session.id,
      name: session.name,
      messageCount: session.messages?.length || 0,
      cwd: runtime.cwd,
      model: (session as any)?.model?.id || 'unknown',
    };
    setInfo(infoData);
  }, [runtime]);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
    }
  };

  useInput(handleKey);

  if (!info) {
    return (
      <Modal onClose={onClose}>
        <Box>
          <Text color="yellow">Loading session info...</Text>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Session Info</Text>
        <Box flexDirection="column" marginTop={1}>
          <Text>ID: {info.id}</Text>
          <Text>Name: {info.name || '(unnamed)'}</Text>
          <Text>Messages: {info.messageCount}</Text>
          <Text>CWD: {info.cwd}</Text>
          <Text>Model: {info.model}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dim>Press Esc to close</Text>
        </Box>
      </Box>
    </Modal>
  );
};
