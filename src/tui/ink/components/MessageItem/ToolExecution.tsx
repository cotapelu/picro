/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import type { ToolCall } from '../../types';
import { sanitizeAndTruncate } from '../../utils/output-guards';

interface ToolExecutionProps {
  toolCall: ToolCall;
  expanded: boolean;
  onToggle: () => void;
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({ toolCall, expanded, onToggle }) => {
  const { theme } = useTheme();

  const renderArgs = () => {
    try {
      const json = JSON.stringify(toolCall.arguments, null, 2);
      return json;
    } catch {
      return String(toolCall.arguments);
    }
  };

  const renderResult = () => {
    if (!toolCall.result) return null;
    try {
      const json = JSON.stringify(toolCall.result, null, 2);
      return json;
    } catch {
      return String(toolCall.result);
    }
  };

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text
          bold
          color={expanded ? theme.accent : theme.warning}
          onPress={onToggle}
        >
          {expanded ? '▼' : '▶'} {toolCall.name}
        </Text>
        <Text color={theme.dim}> - {toolCall.status}</Text>
      </Box>
      {expanded && (
        <Box flexDirection="column" marginLeft={2}>
          <Text color={theme.dim}>Input: {renderArgs()}</Text>
          {toolCall.result && (
            <Text color={toolCall.status === 'error' ? theme.error : theme.dim}>
              Output: {sanitizeAndTruncate(renderResult() ?? '')}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
