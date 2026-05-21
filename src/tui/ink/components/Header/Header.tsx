/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  status: string;
  thinkingLevel: string;
  model: string;
  theme?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, status, thinkingLevel, model, theme }) => {
  return (
    <Box borderStyle="single" borderBottom paddingX={1} justifyContent="space-between">
      <Text bold color="cyan">
        {title}
      </Text>
      <Box gap={1}>
        <Text color="gray">Model: {model}</Text>
        <Text color="green">Thinking: {thinkingLevel}</Text>
        {theme && <Text color="cyan">Theme: {theme}</Text>}
        <Text color={status.startsWith('Error') ? 'red' : 'green'}>[{status}]</Text>
      </Box>
    </Box>
  );
};
