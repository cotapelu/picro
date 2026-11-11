// VirtualMessageList - hiển thị danh sách tin nhắn trong viewport.
// Bắt chước nguyên tắc pi-tui ScrollView (follow: "end"):
//   - Khi có tin nhắn mới và đang ở cuối, tự cuộn xuống xem tin nhắn mới
//   - Nếu người dùng đang cuộn lên xem lịch sử, không ép cuộn lại
// Không đăng ký useInput để tránh xung đột với Input.

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

interface VirtualMessageListProps {
  messages: Message[];
  viewportHeight?: number;
  viewportWidth?: number;
}

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  viewportHeight = 20,
  viewportWidth = 80,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  const totalMessages = messages.length;
  const visibleCount = Math.min(viewportHeight, messages.length);
  const maxScroll = Math.max(0, totalMessages - visibleCount);

  // Giữ scrollOffset trong khoảng hợp lệ
  useEffect(() => {
    if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [scrollOffset, maxScroll]);

  // Follow end: khi có tin nhắn mới và đang ở cuối (offset=0), giữ ở cuối
  // Nếu người dùng đang cuộn lên (offset > 0), không ép cuộn lại
  useEffect(() => {
    if (scrollOffset === 0 || messages.length === 0) {
      setScrollOffset(0);
    }
  }, [messages.length, scrollOffset]);

  // Lấy đoạn tin nhắn hiển thị (tính từ dưới lên trên)
  const start = Math.max(0, totalMessages - visibleCount - scrollOffset);
  const end = totalMessages - scrollOffset;
  const visibleMessages = messages.slice(start, end);

  return (
    <Box flexDirection="column" padding={1}>
      {visibleMessages.map((msg) => {
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
      {visibleMessages.length === 0 && <Text>No messages yet.</Text>}
    </Box>
  );
}
