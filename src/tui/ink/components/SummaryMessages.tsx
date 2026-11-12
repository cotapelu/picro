// SummaryMessages - khối tóm tắt (compaction / branch) có thể thu gọn
// Bắt chước nguyên tắc pi-mono components/compaction-summary-message.ts và
// branch-summary-message.ts:
//   - Nhãn [compaction]/[branch] + nền customMessageBg
//   - Thu gọn: một dòng "Ctrl+X để mở rộng"; mở rộng: markdown đầy đủ
//   - Bấm chuột để chuyển trạng thái
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { createMarkdownTransform, type MarkdownTransformer } from "./markdown-transform.js";

const EXPAND_HINT = "Ctrl+T để mở rộng";

export interface CompactionSummaryProps {
  summary: string;
  tokensBefore: number;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  messageId?: string;
  timestamp?: string;
  width?: number;
}

export const CompactionSummary: React.FC<CompactionSummaryProps> = ({
  summary,
  tokensBefore,
  outputPad = 1,
  markdownTransformers = [],
  messageId,
  timestamp,
  width = 80,
}) => {
  const t = getTheme();
  const [expanded, setExpanded] = useState(false);
  const transform = useMemo(
    () => createMarkdownTransform("summary", () => false, markdownTransformers, messageId, timestamp),
    [markdownTransformers, messageId, timestamp],
  );
  const pad = " ".repeat(outputPad);
  const tokens = tokensBefore.toLocaleString();

  return (
    <Box flexDirection="column">
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", t.bold(t.fg("customMessageLabel", "[compaction]")))}`}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      {expanded ? (
        <MarkdownRenderer
          content={`**Nén từ ${tokens} token**\n\n${summary}`}
          width={Math.max(20, width - outputPad * 2)}
          transform={transform}
          paddingX={outputPad}
          color="customMessageText"
        />
      ) : (
        <Text>{`${pad}${t.bg("customMessageBg", `${t.fg("customMessageText", `Nén từ ${tokens} token (`)}${t.fg("dim", EXPAND_HINT)}${t.fg("customMessageText", ")")}`)}`}</Text>
      )}
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
    </Box>
  );
};

export interface BranchSummaryProps {
  summary: string;
  outputPad?: number;
  markdownTransformers?: readonly MarkdownTransformer[];
  messageId?: string;
  timestamp?: string;
  width?: number;
}

export const BranchSummary: React.FC<BranchSummaryProps> = ({
  summary,
  outputPad = 1,
  markdownTransformers = [],
  messageId,
  timestamp,
  width = 80,
}) => {
  const t = getTheme();
  const [expanded, setExpanded] = useState(false);
  const transform = useMemo(
    () => createMarkdownTransform("summary", () => false, markdownTransformers, messageId, timestamp),
    [markdownTransformers, messageId, timestamp],
  );
  const pad = " ".repeat(outputPad);

  return (
    <Box flexDirection="column">
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", t.bold(t.fg("customMessageLabel", "[branch]")))}`}</Text>
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
      {expanded ? (
        <MarkdownRenderer
          content={`**Tóm tắt nhánh**\n\n${summary}`}
          width={Math.max(20, width - outputPad * 2)}
          transform={transform}
          paddingX={outputPad}
          color="customMessageText"
        />
      ) : (
        <Text>{`${pad}${t.bg("customMessageBg", `${t.fg("customMessageText", "Tóm tắt nhánh (")}${t.fg("dim", EXPAND_HINT)}${t.fg("customMessageText", ")")}`)}`}</Text>
      )}
      <Text>{`${pad}${t.bg("customMessageBg", "")}`.trimEnd()}</Text>
    </Box>
  );
};

/**
 * Wrapper thống nhất cho hai loại summary (compaction / branch), để Transcript
 * gọi bằng một prop duy nhất.
 */
export const SummaryMessages: React.FC<
  | ({ kind: "compaction" } & CompactionSummaryProps)
  | ({ kind: "branch" } & BranchSummaryProps)
> = (props) => {
  if (props.kind === "branch") {
    return (
      <BranchSummary
        summary={props.summary}
        outputPad={props.outputPad}
        markdownTransformers={props.markdownTransformers}
        messageId={props.messageId}
        timestamp={props.timestamp}
        width={props.width}
      />
    );
  }
  return (
    <CompactionSummary
      summary={props.summary}
      tokensBefore={props.tokensBefore}
      outputPad={props.outputPad}
      markdownTransformers={props.markdownTransformers}
      messageId={props.messageId}
      timestamp={props.timestamp}
      width={props.width}
    />
  );
};

export default SummaryMessages;
