/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { BUILTIN_SLASH_COMMANDS } from '../../../runtime/slash-commands';

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
        {BUILTIN_SLASH_COMMANDS.slice().sort((a, b) => a.name.localeCompare(b.name)).map(cmd => (
          <Text key={cmd.name}>/{cmd.name} - {cmd.description}</Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dim>Press Esc to close</Text>
      </Box>
    </Box>
  );
};

