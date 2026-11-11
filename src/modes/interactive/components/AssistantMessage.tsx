// AssistantMessage - render tin nhắn trợ lý
// Bắt chước nguyên tắc pi-mono components/assistant-message.ts:
//   - Duyệt content theo thứ tự: text, thinking, toolCall
//   - Khối text: markdown không nền; khối thinking: mờ/nghiêng, bấm để ẩn/hiện
//   - Slot markdown tái sửng cho cùng loại nội dung nên stream không nháy
//   - Spacer chỉ xuất hiện ngay trước khối hiển thị tiếp theo
//   - stopReason: length -> thông báo cắt; aborted/error -> dòng lỗi
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { theme, fg } from "../../../tui/ink/theme.js";
import { MarkdownRenderer } from "../../../tui/ink/components/MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

export interface AssistantContent {
  type: string;
  text?: string;
  thinking?: string;
}

export interface AssistantMessageInput {
  content: AssistantContent[];
  stopReason?: string;
  errorMessage?: string;
}

export interface AssistantMessageProps {
  message?: AssistantMessageInput;
  /** Ẩn toàn bộ khối thinking. */
  hideThinkingBlock?: boolean;
  /** Nhãn thay thế khi thinking bị ẩn. */
  hiddenThinkingLabel?: string;
  /** Đệm ngang cho nội dung markdown. */
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  isStreaming?: boolean;
  messageId?: string;
  timestamp?: string;
  width?: number;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  hideThinkingBlock = false,
  hiddenThinkingLabel = "Thinking...",
  outputPad = 1,
  markdownTransformers = [],
  isStreaming = false,
  messageId,
  timestamp,
  width = 80,
}) => {
  const transform = useMemo(
    () =>
      createMarkdownTransform("assistant", () => isStreaming, markdownTransformers, messageId, timestamp),
    [isStreaming, markdownTransformers, messageId, timestamp],
  );

  if (!message) return null;

  const hasToolCalls = message.content.some((c) => c.type === "toolCall");
  const blocks: React.ReactNode[] = [];
  let needsSpacer = true;

  const pushVisible = (node: React.ReactNode, key: string) => {
    if (needsSpacer) blocks.push(<Text key={`sp-${key}`}> </Text>);
    needsSpacer = false;
    blocks.push(node);
  };

  for (let i = 0; i < message.content.length; i++) {
    const content = message.content[i]!;
    if (content.type === "text" && content.text?.trim()) {
      const text = content.text.trim();
      pushVisible(
        <MarkdownRenderer
          key={`text-${i}`}
          content={text}
          width={Math.max(20, width - outputPad * 2)}
          transform={transform}
          paddingX={outputPad}
        />,
        `text-${i}`,
      );
      continue;
    }
    if (content.type === "thinking") {
      const thinkingParts: string[] = [];
      for (; i < message.content.length; i++) {
        const item = message.content[i]!;
        if (item.type !== "thinking") break;
        const thinking = item.thinking?.trim();
        if (thinking) thinkingParts.push(thinking);
      }
      i--;
      if (thinkingParts.length === 0) continue;
      // Khối thinking bị ẩn với nhãn rỗng thì không render gì, kể cả khoảng cách.
      if (hideThinkingBlock && !hiddenThinkingLabel.trim()) continue;

      const thinking = thinkingParts.join("\n\n");
      pushVisible(
        hideThinkingBlock ? (
          <Text key={`th-${i}`}>{theme.italic(fg("thinkingText", hiddenThinkingLabel))}</Text>
        ) : (
          <MarkdownRenderer
            key={`th-${i}`}
            content={thinking}
            width={Math.max(20, width - outputPad * 2)}
            transform={transform}
            paddingX={outputPad}
            italic
            color="thinkingText"
          />
        ),
        `th-${i}`,
      );
      needsSpacer = true;
    }
  }

  // Trạng thái kết thúc bất thường: hiện sau nội dung partial.
  const stopNote = (): React.ReactNode | null => {
    if (message.stopReason === "length") {
      return <Text key="len">{fg("error", "Phản hồi bị cắt trước khi hoàn thành.")}</Text>;
    }
    if (hasToolCalls) return null;
    if (message.stopReason === "aborted") {
      const msg =
        message.errorMessage && message.errorMessage !== "Request was aborted"
          ? message.errorMessage
          : "Thao tác đã bị hủy";
      return <Text key="abort">{fg("error", msg)}</Text>;
    }
    if (message.stopReason === "error") {
      return <Text key="err">{fg("error", `Lỗi: ${message.errorMessage || "Không rõ"}`)}</Text>;
    }
    return null;
  };

  const stop = stopNote();

  return (
    <Box flexDirection="column">
      {blocks}
      {stop ? (
        <>
          <Text> </Text>
          {stop}
        </>
      ) : null}
    </Box>
  );
};
