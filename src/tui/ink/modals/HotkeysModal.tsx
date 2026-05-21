/** @jsxImportSource react */
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface HotkeysModalProps {
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => {
  const { theme } = useTheme();

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
    }
  };

  useInput(handleKey);

  const keybindings = [
    { key: 'Ctrl+P', desc: 'Open command palette' },
    { key: 'Ctrl+T', desc: 'Set thinking level' },
    { key: 'Ctrl+Shift+T', desc: 'Toggle theme' },
    { key: 'Ctrl+L', desc: 'Login' },
    { key: 'Ctrl+R', desc: 'Resume session' },
    { key: 'Ctrl+E', desc: 'Edit input in external editor' },
    { key: 'Ctrl+D', desc: 'Toggle debug mode' },
    { key: 'Ctrl+C', desc: 'Exit application' },
    { key: 'Tab', desc: 'Autocomplete / command palette' },
    { key: '/', desc: 'Slash commands' },
    { key: '!', desc: 'Bash command' },
    { key: '!!', desc: 'Bash command without context' },
  ];

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Keybindings</Text>
        <Box flexDirection="column" marginTop={1}>
          {keybindings.map((kb) => (
            <Box key={kb.key}>
              <Text color="yellow">{kb.key.padEnd(15)}</Text>
              <Text>{kb.desc}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>Press Esc to close</Text>
        </Box>
      </Box>
    </Modal>
  );
};
