/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { ToolCall } from '../../types.js';
import { sanitizeAndTruncate } from '../../utils/output-guards.js';

interface ToolExecutionProps {
  toolCall: ToolCall;
  expanded: boolean;
  onToggle: () => void;
  showImages?: boolean;
  imageWidthCells?: number;
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({ toolCall, expanded, onToggle, showImages = true, imageWidthCells = 60 }) => {
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
      const result = toolCall.result as any;
      // Handle Anthropic-style content array with possible images
      if (result && typeof result === 'object' && Array.isArray(result.content)) {
        const textParts = result.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        let output = textParts;
        if (showImages) {
          const imageBlocks = result.content.filter((c: any) => c.type === 'image');
          if (imageBlocks.length > 0) {
            const imageLines = imageBlocks.map((img: any) => {
              const mime = img.mimeType || 'unknown';
              const dataLen = img.data ? img.data.length : 0;
              return `[Image: ${mime} size=${dataLen} bytes]`;
            });
            output = output ? output + '\n' + imageLines.join('\n') : imageLines.join('\n');
          }
        }
        return output || '(empty)'; // don't call sanitize on raw? Apply sanitize
      }
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

