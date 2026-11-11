// MessageList - hiển thị danh sách tin nhắn hội thoại
// Bắt chước nguyên tắc pi-mono user-message.ts / assistant-message.ts:
//   - Tin nhắn người dùng: khối riêng, đệm hai bên, nền nhạt
//   - Tin nhắn trợ lý: render markdown, không nền
//   - Khoảng cách giữa các tin nhắn (Spacer) để đọc rõ
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box, Text } from "ink";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { theme, fg, bg } from "../theme.js";

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

/** Tin nhắn người dùng: khối có nền nhạt, đệm ngang. */
const UserMessageBlock: React.FC<{ text: string }> = ({ text }) => (
  <Box borderStyle="round" borderColor="gray" paddingX={1}>
    <Text>{fg("userMessageText", text)}</Text>
  </Box>
);

/** Tin nhắn trợ lý: markdown không nền. */
const AssistantMessageBlock: React.FC<{ text: string; width?: number }> = ({ text, width }) => (
  <Box paddingLeft={2}>
    <MarkdownRenderer content={text} width={width} />
  </Box>
);

/** Tin nhắn hệ thống/công cụ: dòng mờ. */
const SystemMessageBlock: React.FC<{ text: string }> = ({ text }) => (
  <Text>{fg("dim", text)}</Text>
);

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  viewportHeight,
  viewportWidth,
}) => {
  if (messages.length === 0) {
    return (
      <Box paddingX={1}>
        <Text>{fg("dim", "Chưa có tin nhắn. Gõ gì đó rồi nhấn Enter.")}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {messages.map((msg, index) => {
        const isFirst = index === 0;
        return (
          <Box key={msg.id} flexDirection="column" marginTop={isFirst ? 0 : 1}>
            {msg.role === "user" ? (
              <UserMessageBlock text={msg.content} />
            ) : msg.role === "assistant" ? (
              <AssistantMessageBlock text={msg.content} width={viewportWidth} />
            ) : (
              <SystemMessageBlock text={msg.content} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};
