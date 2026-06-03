/** @jsxImportSource react */
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
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
  showImages?: boolean;
  imageWidthCells?: number;
}

export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ messages, theme, hideThinkingBlock = false, showImages = true, imageWidthCells = 60 }, ref) => {
    const [autoScroll, setAutoScroll] = useState(true);

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
            {messages.map((msg, index) => (
              <React.Fragment key={`${msg.id || index}-${msg.timestamp || Date.now()}`}>
                {renderSeparator(index)}
                <MessageItem
                  message={msg}
                  onToolToggle={toggleTool}
                  expandedTools={expandedTools}
                  hideThinkingBlock={hideThinkingBlock}
                  showImages={showImages}
                  imageWidthCells={imageWidthCells}
                />
              </React.Fragment>
            ))}
          </Box>
        )}
      </Box>
    );
  }
);

MessageList.displayName = 'MessageList';

