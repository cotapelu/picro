// ChatViewport - bố cục transcript + dock nhập liệu cố định
// Bắt chước nguyên tắc pi-mono modes/interactive/chat-viewport.ts:
//   - root = VStack: transcript (basis 0, grow 1, shrink 1, minSize 1)
//     + dock (basis auto, grow 0, shrink 1, minSize 1)
//   - dock = VStack các lớp: tin nhắn chờ, trạng thái, widget trên, editor,
//     widget dưới, footer — tất cả shrink 1, editor minSize 3
//   - Trong Ink: transcript chiếm flexGrow=1, dock là Box flexShrink=0
//   - follow end + scrollbar cho transcript
// Port sang Ink TSX, khon copy code truc iep.

import React from "react";
import { Box, Box as InkBox } from "ink";

export interface ChatViewportProps {
  /** Vùng nội dung hội thoại (đã cuộn). */
  transcript: React.ReactNode;
  /** Các lớp trong dock nhập liệu, từ trên xuống. */
  pendingMessages?: React.ReactNode;
  status?: React.ReactNode;
  widgetsAbove?: React.ReactNode;
  /** Ô nhập liệu; không bao giờ bị co xuống dưới 3 dòng. */
  editor: React.ReactNode;
  widgetsBelow?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Bố cục chính của chế độ tương tác:
 *   - Transcript giãn chiếm toàn bộ không gian còn lại
 *   - Dock nhập liệu cố định ở đáy, co lại trước khi bị đẩy khỏi màn hình
 *   - Ô nhập liệu luôn giữ tối thiểu 3 dòng
 */
export const ChatViewport: React.FC<ChatViewportProps> = ({
  transcript,
  pendingMessages,
  status,
  widgetsAbove,
  editor,
  widgetsBelow,
  footer,
}) => {
  return (
    <Box flexDirection="column">
      {/* Transcript: basis 0, grow 1, shrink 1, minSize 1 */}
      <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={1}>
        {transcript}
      </Box>

      {/* Dock: basis auto, grow 0, shrink 1, minSize 1 */}
      <InkBox flexDirection="column" flexShrink={0} minHeight={1}>
        {pendingMessages ? <Box flexShrink={1} minHeight={0}>{pendingMessages}</Box> : null}
        {status ? <Box flexShrink={1} minHeight={0}>{status}</Box> : null}
        {widgetsAbove ? <Box flexShrink={1} minHeight={0}>{widgetsAbove}</Box> : null}
        {/* Editor: shrink 1, minSize 3 */}
        <Box flexShrink={1} minHeight={3}>
          {editor}
        </Box>
        {widgetsBelow ? <Box flexShrink={1} minHeight={0}>{widgetsBelow}</Box> : null}
        {footer ? <Box flexShrink={1} minHeight={0}>{footer}</Box> : null}
      </InkBox>
    </Box>
  );
};
