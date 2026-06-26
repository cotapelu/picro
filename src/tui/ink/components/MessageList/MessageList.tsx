/** @jsxImportSource react */
import React, { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { MessageItem } from '../MessageItem/MessageItem.js';
import type { Message } from '../../types.js';

export interface MessageListRef {
  scrollToBottom: () => void;
}

interface MessageListProps {
  messages: Message[];
  theme?: any;
  hideThinkingBlock?: boolean;
  hiddenThinkingLabel?: string;
  showImages?: boolean;
  imageWidthCells?: number;
}

// Maximum number of messages to render at once (performance optimization)
const MAX_VISIBLE_MESSAGES = 50;

/**
 * Estimate terminal line count for a message (quick heuristic)
 */
function estimateMessageLines(msg: Message): number {
  // Rough estimate: content length / terminal width (80 cols) + metadata lines
  const content = msg.content || '';
  const lines = content.split('\n').length;
  const toolLines = (msg.toolCalls || []).length * 2; // tool calls take ~2 lines each
  const metaLines = msg.role === 'system' ? 1 : 0;
  return lines + toolLines + metaLines + 1; // +1 for separator
}

export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ messages, theme, hideThinkingBlock = false, hiddenThinkingLabel, showImages = true, imageWidthCells = 60 }, ref) => {
    const [autoScroll, setAutoScroll] = useState(true);

    // Virtualization: only render last N messages to keep UI responsive
    const visibleMessages = useMemo(() => {
      if (messages.length <= MAX_VISIBLE_MESSAGES) return messages;
      return messages.slice(-MAX_VISIBLE_MESSAGES);
    }, [messages]);

    // Expose scrollToBottom to parent
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        setAutoScroll(true);
        // Scroll to bottom logic would go here if we had scrollable container
      },
    }));

    // Simple separator between messages
    const renderSeparator = (index: number) => {
      if (index === 0) return null;
      return (
        <Box marginBottom={1}>
          <Text color="gray">─</Text>
        </Box>
      );
    };

    // Track expanded tool calls
    const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

    const toggleTool = (toolId: string) => {
      setExpandedTools((prev) => {
        const next = new Set(prev);
        if (next.has(toolId)) {
          next.delete(toolId);
        } else {
          next.add(toolId);
        }
        return next;
      });
    };

    return (
      <Box
        flexDirection="column"
        overflow="hidden"
        width="100%"
        height="100%"
        borderStyle="round"
        borderBottom
        borderTop={false}
      >
        {messages.length === 0 ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray">No messages yet. Start typing...</Text>
          </Box>
        ) : (
          <Box flexDirection="column" width="100%">
            {visibleMessages.map((msg, index) => (
              <React.Fragment key={`${msg.id || index}-${msg.timestamp || Date.now()}`}>
                {renderSeparator(index)}
                <MessageItem
                  message={msg}
                  onToolToggle={toggleTool}
                  expandedTools={expandedTools}
                  hideThinkingBlock={hideThinkingBlock}
                  hiddenThinkingLabel={hiddenThinkingLabel}
                  showImages={showImages}
                  imageWidthCells={imageWidthCells}
                />
              </React.Fragment>
            ))}
            {messages.length > MAX_VISIBLE_MESSAGES && (
              <Box marginTop={1}>
                <Text dimColor>
                  {`...and ${messages.length - MAX_VISIBLE_MESSAGES} older messages hidden`}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  }
);

MessageList.displayName = 'MessageList';

