// MessageList - port ý tưởng từ pi-mono assistant-message.ts, user-message.ts
import React from "react";
import { Box, Text } from "ink";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
  maxHeight?: number;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, maxHeight }) => {
  const displayMessages = maxHeight ? messages.slice(-maxHeight) : messages;

  return (
    <Box flexDirection="column" padding={1}>
      {displayMessages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Text key={`role-${msg.id}`}>{isUser ? "You" : "Assistant"}:</Text>
            <Box key={`content-box-${msg.id}`} marginLeft={2} paddingRight={1}>
              <Text key={`content-${msg.id}`}>{msg.content}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
