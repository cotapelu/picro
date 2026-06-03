/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';

interface AssistantMessageProps {
  content: string;
  thinkingBlocks?: string[];
  hideThinkingBlock?: boolean;
  hiddenThinkingLabel?: string;
  streaming?: boolean;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  thinkingBlocks,
  hideThinkingBlock = false,
  hiddenThinkingLabel = 'Thinking...',
  streaming = false,
}) => {
  const { theme } = useTheme();

  const renderThinking = () => {
    if (!thinkingBlocks || thinkingBlocks.length === 0) return null;

    if (hideThinkingBlock) {
      return (
        <Text italic color={theme.thinkingText || theme.dim}>
          {hiddenThinkingLabel}
        </Text>
      );
    }

    return (
      <Box flexDirection="column">
        {thinkingBlocks.map((tb, i) => (
          <Text key={i} italic color={theme.thinkingText || theme.dim}>
            [Thinking: {tb}]
          </Text>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {renderThinking()}
      {streaming && content === '' ? (
        <Text dim>...</Text>
      ) : (
        <Text>{content}</Text>
      )}
    </Box>
  );
};

