/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

interface CustomMessageProps {
  content: string;
  customType?: string;
}

export const CustomMessage: React.FC<CustomMessageProps> = ({ content, customType }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column">
      <Text color={theme.accent}>[{customType || 'custom'}]</Text>
      <Text>{content}</Text>
    </Box>
  );
};
