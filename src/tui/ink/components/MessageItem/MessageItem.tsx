/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import type { Message, ToolCall } from '../../types';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';
import { ToolExecution } from './ToolExecution';
import { BashExecution } from './BashExecution';

interface MessageItemProps {
  message: Message;
  theme?: any;
  onToolToggle?: (toolId: string) => void;
  expandedTools?: Set<string>;
  hideThinkingBlock?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onToolToggle,
  expandedTools = new Set(),
  hideThinkingBlock = false,
}) => {
  const { theme } = useTheme();
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
      return (
        <ToolExecution
          key={tool.id}
          toolCall={tool}
          expanded={isExpanded}
          onToggle={() => onToolToggle?.(tool.id)}
        />
      );
    });
  };

  const shouldShowRole = message.role !== 'user'; // user messages don't need role label in chat
  const roleColor = message.role === 'assistant' ? theme.success : message.role === 'tool' ? theme.accent : theme.primary;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {shouldShowRole && (
        <Text bold color={roleColor}>
          {message.role === 'assistant' ? 'Assistant' : message.role === 'tool' ? 'Tool' : 'User'}:
        </Text>
      )}
      <Box flexDirection="column" marginLeft={shouldShowRole ? 2 : 0}>
        {message.role === 'user' && (
          <UserMessage text={message.content} />
        )}
        {message.role === 'assistant' && (
          <AssistantMessage
            content={message.content}
            thinkingBlocks={message.thinkingBlocks}
            hideThinkingBlock={hideThinkingBlock}
          />
        )}
        {message.role === 'bashExecution' && (
          <BashExecution
            command={message.bashCommand || ''}
            output={message.bashOutput || ''}
            exitCode={message.bashExitCode}
            cancelled={message.bashCancelled}
            truncated={message.bashTruncated}
          />
        )}
        {(message.role === 'tool' || message.role === 'compactionSummary' || message.role === 'branchSummary' || message.role === 'custom') && (
          <Text>{message.content}</Text>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <Box flexDirection="column">
            {renderToolCalls(message.toolCalls)}
          </Box>
        )}
        {message.error && (
          <Text color={theme.error}>Error: {message.error}</Text>
        )}
        {message.streaming && !message.content && (
          <Text color={theme.dim}>...</Text>
        )}
      </Box>
    </Box>
  );
};
