// SkillInvocation - hiển thị lệnh gọi skill (thu gọn/mở rộng)
// Bắt chước nguyên tắc pi-mono components/skill-invocation-message.ts:
//   - Thu gọn: một dòng "[skill] tên (phím để mở rộng)"
//   - Mở rộng: nhãn + markdown nội dung skill
//   - Bấm chuột để chuyển trạng thái
//   - Nền customMessageBg cho đồng nhất
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/theme.js";
import { MarkdownRenderer } from "../../../tui/ink/components/MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

const EXPAND_HINT = "Ctrl+T để mở rộng";

export interface ParsedSkillBlock {
  name: string;
  content: string;
  userMessage?: string;
}

export interface SkillInvocationProps {
  skillBlock: ParsedSkillBlock;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  expanded?: boolean;
  messageId?: string;
  timestamp?: string;
  width?: number;
}

export const SkillInvocation: React.FC<SkillInvocationProps> = ({
  skillBlock,
  outputPad = 1,
  markdownTransformers = [],
  expanded = false,
  messageId,
  timestamp,
  width = 80,
}) => {
  const t = getTheme();
  const [open, setOpen] = useState(expanded);
  const transform = useMemo(
    () => createMarkdownTransform("custom", () => false, markdownTransformers, messageId, timestamp),
    [markdownTransformers, messageId, timestamp],
  );
  const pad = " ".repeat(outputPad);

  return (
    <Box flexDirection="column">
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      {open ? (
        <>
          <Text>{`${pad}${t.bg("customMessageBg", t.bold(t.fg("customMessageLabel", "[skill]")))}`}</Text>
          <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
          <MarkdownRenderer
            content={`**${skillBlock.name}**\n\n${skillBlock.content}`}
            width={Math.max(20, width - outputPad * 2)}
            transform={transform}
            paddingX={outputPad}
            color="customMessageText"
          />
        </>
      ) : (
        <Text>{`${pad}${t.bg("customMessageBg", `${t.fg("customMessageLabel", t.bold("[skill]"))} ${t.fg("customMessageText", skillBlock.name)} ${t.fg("dim", `(${EXPAND_HINT})`)}`)}`}</Text>
      )}
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
    </Box>
  );
};
