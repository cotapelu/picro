/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import type { Message, ToolCall } from '../../types';

interface MessageItemProps {
  message: Message;
  theme?: any;
  onToolToggle?: (toolId: string) => void;
  expandedTools?: Set<string>;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onToolToggle,
  expandedTools = new Set()
}) => {
  const renderContent = (content: string) => {
    // Simple wrapping - in production, use a proper text wrapper
    const maxWidth = 80; // Will be adjusted by parent
    const lines: string[] = [];
    const words = content.split(' ');
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines.map((line, i) => (
      <Text key={i}>{line}</Text>
    ));
  };

  const renderToolCalls = (toolCalls: ToolCall[]) => {
    return toolCalls.map((tool) => {
      const isExpanded = expandedTools.has(tool.id);
      const hasResult = tool.result !== undefined;

      return (
        <Box key={tool.id} flexDirection="column" marginLeft={2}>
          <Box>
            <Text color="yellow" bold>
              {isExpanded ? '▼' : '▶'} {tool.name}
            </Text>
            {hasResult && (
              <Text color="gray"> - {tool.status}</Text>
            )}
          </Box>
          {isExpanded && hasResult && (
            <Box marginLeft={2} flexDirection="column">
              <Text color="gray">Input: {JSON.stringify(tool.arguments)}</Text>
              <Text color="gray">Output: {JSON.stringify(tool.result)}</Text>
            </Box>
          )}
        </Box>
      );
    });
  };

  const shouldShowRole = message.role !== 'user'; // user messages don't need role label in chat

  return (
    <Box flexDirection="column" marginBottom={1}>
      {shouldShowRole && (
        <Text bold color={message.role === 'assistant' ? 'green' : message.role === 'tool' ? 'yellow' : 'blue'}>
          {message.role === 'assistant' ? 'Assistant' : message.role === 'tool' ? 'Tool' : 'User'}:
        </Text>
      )}
      <Box flexDirection="column" marginLeft={shouldShowRole ? 2 : 0}>
        {renderContent(message.content || '')}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <Box flexDirection="column">
            {renderToolCalls(message.toolCalls)}
          </Box>
        )}
        {message.error && (
          <Text color="red">Error: {message.error}</Text>
        )}
        {message.streaming && !message.content && (
          <Text color="gray">...</Text>
        )}
      </Box>
    </Box>
  );
};
