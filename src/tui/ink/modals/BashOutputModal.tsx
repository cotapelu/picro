/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface BashOutputModalProps {
  command: string;
  output: string;
  error?: boolean;
  onClose: () => void;
}

export const BashOutputModal: React.FC<BashOutputModalProps> = ({ command, output, error = false, onClose }) => {
  const { theme } = useTheme();

  useEffect(() => {
    // Auto-close after some time? For now, require manual close
  }, []);

  const handleKey = (input: string, key: any) => {
    if (key.escape || key.return || key.ctrl) {
      onClose();
    }
  };

  useInput(handleKey);

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor={error ? 'red' : 'green'} padding={1} width={100}>
        <Text bold color={error ? 'red' : 'green'}>Bash: {command}</Text>
        <Box flexDirection="column" marginTop={1}>
          {output.split('\n').map((line, i) => (
            <Text key={i} color={error ? 'red' : 'gray'}>
              {line || '\u00A0'}
            </Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>Press any key to close</Text>
        </Box>
      </Box>
    </Modal>
  );
};
