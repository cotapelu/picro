/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';

interface AssistantMessageProps {
  content: string; // plain text representation (our useRuntime currently builds this)
  thinkingBlocks?: string[];
  // In future, accept full message with content blocks
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ content, thinkingBlocks }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column">
      {/* Thinking blocks if any */}
      {thinkingBlocks && thinkingBlocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          {thinkingBlocks.map((tb, i) => (
            <Text key={i} italic color={theme.thinkingText || theme.dim}>
              [Thinking: {tb}]
            </Text>
          ))}
        </Box>
      )}
      {/* Main text */}
      <Text>{content}</Text>
    </Box>
  );
};
