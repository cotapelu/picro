/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

interface BranchSummaryMessageProps {
  content: string;
}

export const BranchSummaryMessage: React.FC<BranchSummaryMessageProps> = ({ content }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column">
      <Text color={theme.accent}>[branch]</Text>
      <Text>{content}</Text>
    </Box>
  );
};
