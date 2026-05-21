/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">
        Slash Commands
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>/quit - Exit the application</Text>
        <Text>/thinking [level] - Set thinking level (off, minimal, low, medium, high, xhigh)</Text>
        <Text>/help - Show this help message</Text>
        <Text>/new - Create a new session</Text>
      </Box>
      <Box marginTop={1}>
        <Text dim>Press Esc to close</Text>
      </Box>
    </Box>
  );
};
