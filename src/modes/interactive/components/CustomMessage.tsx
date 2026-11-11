// CustomMessage - render tin nhắn tùy biến từ extension
// Bắt chước nguyên tắc pi-mono components/custom-message.ts:
//   - Nhãn [loại] + nội dung markdown trong hộp nền customMessageBg
//   - Ưu tiên renderer riêng của extension; lỗi thì quay về render mặc định
//   - setExpanded đổi trạng thái; invalidate dựng lại
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/theme.js";
import { MarkdownRenderer } from "../../../tui/ink/components/MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

export interface CustomMessageInput<T = unknown> {
  customType: string;
  content: string | Array<{ type: string; text?: string }>;
}

export interface CustomMessageProps<T = unknown> {
  message: CustomMessageInput<T>;
  /** Renderer riêng, nhận message + ngữ cảnh, trả về chuỗi hiển thị. */
  customRenderer?: (message: CustomMessageInput<T>, context: { expanded: boolean; outputPad: number }) => string | undefined;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  expanded?: boolean;
  messageId?: string;
  timestamp?: string;
  width?: number;
}

/** Lấy phần text thuần từ nội dung tin nhắn. */
function textOf(content: CustomMessageInput["content"]): string {
  if (typeof content === "string") return content;
  return (content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

export const CustomMessage: React.FC<CustomMessageProps> = ({
  message,
  customRenderer,
  outputPad = 1,
  markdownTransformers = [],
  expanded = false,
  messageId,
  timestamp,
  width = 80,
}) => {
  const t = getTheme();
  const transform = useMemo(
    () => createMarkdownTransform("custom", () => false, markdownTransformers, messageId, timestamp),
    [markdownTransformers, messageId, timestamp],
  );
  const pad = " ".repeat(outputPad);

  // Thử renderer riêng; lỗi thì rơi về mặc định.
  const custom = (() => {
    if (!customRenderer) return undefined;
    try {
      return customRenderer(message, { expanded, outputPad });
    } catch {
      return undefined;
    }
  })();

  return (
    <Box flexDirection="column">
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", t.bold(t.fg("customMessageLabel", `[${message.customType}]`)))}`}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      {custom ? (
        <Text>{`${pad}${t.bg("customMessageBg", custom)}`}</Text>
      ) : (
        <MarkdownRenderer
          content={textOf(message.content)}
          width={Math.max(20, width - outputPad * 2)}
          transform={transform}
          paddingX={outputPad}
          color="customMessageText"
        />
      )}
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
    </Box>
  );
};

export function CustomEntryFallback(props: { label: string; error?: string }): React.ReactElement {
  const t = getTheme();
  return (
    <Text>
      {t.fg("error", `[${props.label}]`)}{props.error ? t.fg("error", ` lỗi render: ${props.error}`) : ""}
    </Text>
  );
}
