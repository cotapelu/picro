// MessageList - port ý tưởng từ pi-mono assistant-message.ts, user-message.ts
// Viết lại bằng Ink TSX, không copy code
// Hỗ trợ virtual scrolling: chỉ render tin nhắn trong viewport
// Hỗ trợ markdown rendering cho assistant messages
import React from "react";
import { Box, Text } from "ink";
import { MarkdownRenderer } from "./MarkdownRenderer.js";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  viewportHeight?: number;
  viewportWidth?: number;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, viewportHeight, viewportWidth }) => {
  // Tính số lượng tin nhắn có thể hiển thị trong viewport
  const availableHeight = viewportHeight || 20;
  const displayMessages = messages.slice(-availableHeight);

  return (
    <Box flexDirection="column" padding={1}>
      {displayMessages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Text key={`role-${msg.id}`}>{isUser ? "You" : "Assistant"}:</Text>
            <Box key={`content-box-${msg.id}`} marginLeft={2} paddingRight={1}>
              {isUser ? (
                <Text key={`content-${msg.id}`}>{msg.content}</Text>
              ) : (
                <MarkdownRenderer key={`content-${msg.id}`} content={msg.content} />
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
