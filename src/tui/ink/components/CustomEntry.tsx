// CustomEntry - render entry tùy biến trong transcript
// Bắt chước nguyên tắc pi-mono components/custom-entry.ts:
//   - Hiển thị entry custom từ extension với nhãn [loại]
//   - Ưu tiên renderer riêng của extension; lỗi thì quay về render mặc định
//   - Màu nền customMessageBg cho đồng nhất với CustomMessage/SkillInvocation
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

export interface CustomEntryInput<T = unknown> {
  customType: string;
  content: string | Array<{ type: string; text?: string }>;
}

export interface CustomEntryProps<T = unknown> {
  entry: CustomEntryInput<T>;
  /** Renderer riêng, nhận entry + ngữ cảnh, trả về chuỗi hiển thị. */
  customRenderer?: (entry: CustomEntryInput<T>, context: { expanded: boolean; outputPad: number }) => string | undefined;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  expanded?: boolean;
  messageId?: string;
  timestamp?: string;
  width?: number;
}

/** Lấy phần text thuần từ nội dung entry. */
function textOf(content: CustomEntryInput["content"]): string {
  if (typeof content === "string") return content;
  return (content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
}

export const CustomEntry: React.FC<CustomEntryProps> = ({
  entry,
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
      return customRenderer(entry, { expanded, outputPad });
    } catch {
      return undefined;
    }
  })();

  return (
    <Box flexDirection="column">
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", t.bold(t.fg("customMessageLabel", `[${entry.customType}]`)))}`}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      {custom ? (
        <Text>{`${pad}${t.bg("customMessageBg", custom)}`}</Text>
      ) : (
        <MarkdownRenderer
          content={textOf(entry.content)}
          width={Math.max(20, width - outputPad * 2)}
          transform={createMarkdownTransform("custom", () => false, markdownTransformers, messageId, timestamp)}
          paddingX={outputPad}
          color="customMessageText"
        />
      )}
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
    </Box>
  );
}

export default CustomEntry;