/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';

interface ChangelogModalProps {
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    // Placeholder - would load actual changelog
    setContent('=== CHANGELOG ===\n\n- Added new slash commands\n- Improved UI\n\n(Press Esc to close)');
  }, []);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
    }
  };

  useInput(handleKey);

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={80}>
        <Text bold color="cyan">Changelog</Text>
        <Box flexDirection="column" marginTop={1}>
          {content.split('\n').map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>Press Esc to close</Text>
        </Box>
      </Box>
    </Modal>
  );
};

