/** @jsxImportSource react */
import React from 'react';
import { Box, Text, Markdown } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

interface CompactionSummaryMessageProps {
  content: string;
  tokensBefore?: number;
}

export const CompactionSummaryMessage: React.FC<CompactionSummaryMessageProps> = ({
  content,
  tokensBefore,
}) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column">
      <Text color={theme.accent}>[compaction]</Text>
      {tokensBefore !== undefined && (
        <Text dim>Compacted from {tokensBefore.toLocaleString()} tokens</Text>
      )}
      <Text>{content}</Text>
    </Box>
  );
};
