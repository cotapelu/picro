/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';

interface UserMessageProps {
  text: string;
}

export const UserMessage: React.FC<UserMessageProps> = ({ text }) => {
  // Simple rendering: split by lines, indent
  const lines = text.split('\n');
  return (
    <Box flexDirection="column" paddingX={1}>
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
};
