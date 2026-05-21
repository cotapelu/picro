/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';

interface FooterProps {
  hints?: string[];
}

export const Footer: React.FC<FooterProps> = ({ hints = [] }) => {
  const { theme } = useTheme();
  return (
    <Box borderStyle="single" borderTop borderColor={theme.border} paddingX={1} justifyContent="space-between">
      <Text color={theme.dim}>
        {hints.length > 0 ? hints.join(' | ') : ''}
      </Text>
      <Text color={theme.accent}>
        Picro Agent v0.0.1
      </Text>
    </Box>
  );
};
