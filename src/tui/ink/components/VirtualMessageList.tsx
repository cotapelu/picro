// VirtualMessageList - port ý tưởng từ pi-mono
// Chỉ render tin nhắn trong viewport, hỗ trợ cuộn lên/xuống
import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";

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

  // Giới hạn scrollOffset trong khoảng hợp lệ
  useEffect(() => {
    if (scrollOffset > maxScroll) {
      setScrollOffset(maxScroll);
    }
  }, [scrollOffset, maxScroll]);

  // Cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length, maxScroll]);

  const visibleMessages = messages.slice(
    Math.max(0, totalMessages - visibleCount - scrollOffset),
    totalMessages - scrollOffset
  );

  // Xử lý phím cuộn
  useInput((inputString, key) => {
    // PageUp - Cuộn lên
    if (key.pageUp) {
      setScrollOffset((prev) => Math.min(prev + visibleCount, maxScroll));
    }
    // PageDown - Cuộn xuống
    if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - visibleCount));
    }
    // Home - Cuộn lên đầu
    if (key.home) {
      setScrollOffset(maxScroll);
    }
    // End - Cuộn xuống cuối
    if (key.end) {
      setScrollOffset(0);
    }
    // Mũi tên lên - Cuộn lên 1 tin nhắn
    if (key.upArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, maxScroll));
    }
    // Mũi tên xuống - Cuộn xuống 1 tin nhắn
    if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
  });

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
