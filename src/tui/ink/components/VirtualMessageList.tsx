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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

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

  // Tìm kiếm trong messages
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setIsSearching(false);
      return;
    }

    const results: number[] = [];
    messages.forEach((msg, index) => {
      if (msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push(index);
      }
    });
    setSearchResults(results);
    setCurrentSearchIndex(0);
    setIsSearching(true);
  }, [searchQuery, messages]);

  const visibleMessages = messages.slice(
    Math.max(0, totalMessages - visibleCount - scrollOffset),
    totalMessages - scrollOffset
  );

  // Xử lý phím cuộn và tìm kiếm
  useInput((inputString, key) => {
    // Cuộn lên/xuống
    if (key.pageUp) {
      setScrollOffset((prev) => Math.min(prev + visibleCount, maxScroll));
    }
    if (key.pageDown) {
      setScrollOffset((prev) => Math.max(0, prev - visibleCount));
    }
    if (key.home) {
      setScrollOffset(maxScroll);
    }
    if (key.end) {
      setScrollOffset(0);
    }
    if (key.upArrow) {
      setScrollOffset((prev) => Math.min(prev + 1, maxScroll));
    }
    if (key.downArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }

    // Vim keys: j/k cho cuộn lên/xuống
    if (inputString === "j") {
      setScrollOffset((prev) => Math.min(prev + 1, maxScroll));
    }
    if (inputString === "k") {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
    if (inputString === "J") {
      setScrollOffset((prev) => Math.min(prev + visibleCount, maxScroll));
    }
    if (inputString === "K") {
      setScrollOffset((prev) => Math.max(0, prev - visibleCount));
    }

    // Ctrl+F - Tìm kiếm
    if (key.ctrl && inputString === "f") {
      setIsSearching(true);
    }

    // Esc - Thoát tìm kiếm
    if (inputString === "\u001b") {
      setIsSearching(false);
      setSearchQuery("");
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }

    // Xử lý nhập liệu tìm kiếm
    if (isSearching && inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      setSearchQuery((prev) => prev + inputString);
    }
    if (isSearching && key.backspace) {
      setSearchQuery((prev) => prev.slice(0, -1));
    }

    // N / n - Chuyển đến kết quả tìm kiếm tiếp theo/trước đó
    if (inputString === "n" && searchResults.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
      const newIndex = (currentSearchIndex + 1) % searchResults.length;
      const targetIndex = searchResults[newIndex];
      // Cuộn đến vị trí của kết quả tìm kiếm
      const indexFromBottom = totalMessages - 1 - targetIndex;
      setScrollOffset(Math.max(0, indexFromBottom - visibleCount + 1));
      setCurrentSearchIndex(newIndex);
    }
    if (inputString === "N" && searchResults.length > 0) {
      const newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(newIndex);
      const targetIndex = searchResults[newIndex];
      const indexFromBottom = totalMessages - 1 - targetIndex;
      setScrollOffset(Math.max(0, indexFromBottom - visibleCount + 1));
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {isSearching && (
        <Box marginBottom={1}>
          <Text>{`Search: ${searchQuery}`}</Text>
          {searchResults.length > 0 && (
            <Text dimColor>
              {currentSearchIndex + 1}/{searchResults.length}
            </Text>
          )}
        </Box>
      )}
      {visibleMessages.map((msg) => {
        const isUser = msg.role === "user";
        const isMatch = isSearching && searchResults.includes(messages.indexOf(msg));
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
