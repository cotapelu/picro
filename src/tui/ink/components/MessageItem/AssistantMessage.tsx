/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { ToolExecution } from './ToolExecution.js';
import type { ToolCall } from '../../types.js';

interface AssistantMessageProps {
  content: string;
  thinkingBlocks?: string[];
  hideThinkingBlock?: boolean;
  hiddenThinkingLabel?: string;
  streaming?: boolean;
  toolCalls?: ToolCall[];
  expandedTools?: Set<string>;
  onToolToggle?: (toolId: string) => void;
  showImages?: boolean;
  imageWidthCells?: number;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  thinkingBlocks,
  hideThinkingBlock = false,
  hiddenThinkingLabel = 'Thinking...',
  streaming = false,
  toolCalls,
  expandedTools,
  onToolToggle,
  showImages = true,
  imageWidthCells = 60,
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

  const renderToolCalls = () => {
    if (!toolCalls || toolCalls.length === 0) return null;
    return (
      <Box flexDirection="column">
        {toolCalls.map((tool) => {
          const isExpanded = expandedTools?.has(tool.id) || false;
          return (
            <ToolExecution
              key={tool.id}
              toolCall={tool}
              expanded={isExpanded}
              onToggle={() => onToolToggle?.(tool.id)}
              showImages={showImages}
              imageWidthCells={imageWidthCells}
            />
          );
        })}
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
      {renderToolCalls()}
    </Box>
  );
};

