/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { Message, ToolCall } from '../../types.js';
import { AssistantMessage } from './AssistantMessage.js';
import { UserMessage } from './UserMessage.js';
import { ToolExecution } from './ToolExecution.js';
import { BashExecution } from './BashExecution.js';
import { CompactionSummaryMessage } from './CompactionSummaryMessage.js';
import { BranchSummaryMessage } from './BranchSummaryMessage.js';
import { CustomMessage } from './CustomMessage.js';

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

  // Don't show role label for user and self-labeling message types
  const hideRoleLabel = message.role === 'user' || message.role === 'bashExecution' || message.role === 'compactionSummary' || message.role === 'branchSummary' || message.role === 'custom';
  const showRoleLabel = !hideRoleLabel;
  const roleColor = message.role === 'assistant' ? theme.success : message.role === 'tool' ? theme.accent : theme.primary;
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'assistant': return 'Assistant';
      case 'tool': return 'Tool';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {showRoleLabel && (
        <Text bold color={roleColor}>
          {getRoleDisplay(message.role)}:
        </Text>
      )}
      <Box flexDirection="column" marginLeft={showRoleLabel ? 2 : 0}>
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
        {message.role === 'compactionSummary' && (
          <CompactionSummaryMessage content={message.content} tokensBefore={message.tokensBefore} />
        )}
        {message.role === 'branchSummary' && (
          <BranchSummaryMessage content={message.content} />
        )}
        {message.role === 'custom' && (
          <CustomMessage content={message.content} customType={message.customType} />
        )}
        {message.role === 'tool' && (
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

