// VirtualMessageList - vùng xem tin nhắn có cuộn
// Bắt chước nguyên tắc pi-tui ScrollView (follow: "end"):
//   - followEnd = true: nội dung cao hơn khung nhìn thì luôn neo ở cuối
//   - Khi người dùng cuộn lên (offset > 0), không ép cuộn lại
//   - Về đáy thì bật lại chế độ theo dõi
// Phím cuộn do Input (component duy nhất nhận useInput) chuyển tiếp qua
// callback onScroll, để tránh hai component cùng bắt một phím.
// Viet lai bang Ink TSX, khong copy code truc iep.

import React, { useEffect } from "react";
import { Box } from "ink";
import { MessageList } from "./MessageList.js";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
}

interface VirtualMessageListProps {
  messages: Message[];
  /** Số tin nhắn mỗi lần nhảy trang. */
  viewportHeight?: number;
  viewportWidth?: number;
  /** Số tin nhắn đã nhích lên so với đáy (0 = đang xem cuối). */
  scrollOffset?: number;
  /** Hiện gợi ý khi đang xem lịch sử. */
  isFollowingEnd?: boolean;
}

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  viewportHeight = 20,
  viewportWidth = 80,
  scrollOffset = 0,
}) => {
  const total = messages.length;
  const visibleCount = Math.max(1, Math.min(viewportHeight, total));

  // followEnd + kẹp biên: offset không vượt quãng khả dụng.
  useEffect(() => {
    // Không tự đổi offset ở đây; App giữ state để xử lý thống nhất.
  }, [total, scrollOffset, visibleCount]);

  const maxScroll = Math.max(0, total - visibleCount);
  const safeOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
  const start = Math.max(0, total - visibleCount - safeOffset);
  const visible = messages.slice(start, total - safeOffset);

  return (
    <Box flexDirection="column">
      <MessageList messages={visible} viewportWidth={viewportWidth} />
    </Box>
  );
};
