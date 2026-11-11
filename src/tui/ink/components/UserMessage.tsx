// UserMessage - render tin nhắn người dùng
// Bắt chước nguyên tắc pi-mono components/user-message.ts:
//   - Markdown với nền userMessageBg, chữ userMessageText
//   - Giữ marker danh sách có thứ tự và escape dấu backslash như nguồn
//   - Dòng đầu/cuối đánh dấu vùng OSC133 để terminal nhận diện prompt
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo } from "react";
import { Box } from "ink";
import { getTheme } from "../theme/index.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

const OSC133_START = "\x1b]133;A\x07";
const OSC133_END = "\x1b]133;B\x07";
const OSC133_FINAL = "\x1b]133;C\x07";

export interface UserMessageProps {
  text: string;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  messageId?: string;
  timestamp?: string;
  width?: number;
}

export const UserMessage: React.FC<UserMessageProps> = ({
  text,
  outputPad = 1,
  markdownTransformers = [],
  messageId,
  timestamp,
  width = 80,
}) => {
  const t = getTheme();
  const transform = useMemo(
    () => createMarkdownTransform("user", () => false, markdownTransformers, messageId, timestamp),
    [markdownTransformers, messageId, timestamp],
  );
  // Nền áp cho từng dòng: MarkdownRenderer chỉ lo nội dung, ta tự tô nền.
  const pad = " ".repeat(outputPad);

  return (
    <Box flexDirection="column">
      <Box paddingX={outputPad}>{`${OSC133_START}${pad}${t.bg("userMessageBg", "")}`.trimEnd()}</Box>
      <MarkdownRenderer
        content={text}
        width={Math.max(20, width - outputPad * 2)}
        transform={transform}
        paddingX={outputPad}
        color="userMessageText"
      />
      <Box paddingX={outputPad}>{`${OSC133_END}${OSC133_FINAL}${pad}${t.bg("userMessageBg", "")}`.trimEnd()}</Box>
    </Box>
  );
};
