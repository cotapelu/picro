// Transcript - renderer hội thoại đầy đủ (tầng view)
// Bắt chước nguyên tắc pi-mono ChatViewport + renderSessionEntries:
//   - user message: khối nền userMessageBg + OSC133 zone
//   - assistant message: khối thinking (nghiêng/mờ) rồi khối text (markdown)
//   - tool execution: hộp nền theo trạng thái + preview thu gọn
//   - bash execution: viền động + lệnh in đậm + đầu ra muted
//   - summary/custom: khối customMessageBg
// Đơn vị cuộn là DÒNG HIỂN THỊ: mỗi tin nhắn được "đo" trước rồi mới cắt theo
// khung nhìn, đúng như ScrollView của pi-mono (không cuộn theo số tin nhắn).
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { UserMessage } from "./UserMessage.js";
import { AssistantMessage } from "./AssistantMessage.js";
import { ToolExecution } from "./ToolExecution.js";
import { BashExecution } from "./BashExecution.js";
import { CustomMessage } from "./CustomMessage.js";
import { SkillInvocation } from "./SkillInvocation.js";
import { SummaryMessages } from "./SummaryMessages.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { wrapTextWithAnsi } from "../core/TerminalText.js";

/** Một mục trong transcript. */
export interface TranscriptItem {
  id: string;
  kind:
    | "user"
    | "assistant"
    | "tool"
    | "bash"
    | "custom"
    | "skill"
    | "compaction"
    | "branch"
    | "system";
  /** Nội dung text (đã trích) cho user/assistant/system. */
  text?: string;
  /** Khối thinking của assistant. */
  thinking?: string;
  /** Trạng thái kết thúc của assistant. */
  stopReason?: string;
  errorMessage?: string;
  /** Tool call. */
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: {
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    isError: boolean;
    durationMs?: number;
  };
  toolPartial?: boolean;
  toolExpanded?: boolean;
  /** Bash execution. */
  command?: string;
  output?: string;
  exitCode?: number;
  running?: boolean;
  cancelled?: boolean;
  excludeFromContext?: boolean;
  /** Custom/summary. */
  customType?: string;
  label?: string;
  summary?: string;
  tokensBefore?: number;
  expanded?: boolean;
  /** Thứ tự trong mảng (giữ ổn định key). */
  index: number;
}

export interface TranscriptProps {
  items: TranscriptItem[];
  /** Chiều rộng khung nhìn để wrap. */
  width?: number;
  /** Số dòng tối đa hiển thị (khung nhìn). */
  maxLines?: number;
  /** Bỏ qua `maxLines` dòng đầu (cuộn). */
  skipLines?: number;
  /** Tool output đang mở rộng (Ctrl+T). */
  toolsExpanded?: boolean;
}

/** Một tin nhắn thành mảng dòng (ước lượng cho việc cuộn theo dòng). */
function itemToLines(item: TranscriptItem, width: number): string[] {
  const w = Math.max(20, width);
  switch (item.kind) {
    case "user":
      return wrapTextWithAnsi(item.text ?? "", w);
    case "assistant": {
      const lines: string[] = [];
      if (item.thinking) lines.push(...wrapTextWithAnsi(item.thinking, w));
      if (item.text) lines.push(...wrapTextWithAnsi(item.text, w));
      if (item.stopReason === "length") lines.push("Response was truncated before completion.");
      return lines.length > 0 ? lines : [""];
    }
    case "tool":
      return wrapTextWithAnsi(
        [
          `${item.toolName ?? "tool"}`,
          item.toolResult
            ? item.toolResult.content
                .filter((c) => c.type === "text" && c.text)
                .map((c) => c.text)
                .join("\n")
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        w,
      );
    case "bash":
      return wrapTextWithAnsi(
        [`$ ${item.command ?? ""}`, item.output ?? ""].filter(Boolean).join("\n"),
        w,
      );
    case "system":
      return wrapTextWithAnsi(item.text ?? "", w);
    default:
      return wrapTextWithAnsi(item.label ?? item.customType ?? item.summary ?? "", w);
  }
}

/** Render một mục transcript. */
const TranscriptRow: React.FC<{ item: TranscriptItem; width: number; toolsExpanded: boolean }> = ({
  item,
  width,
  toolsExpanded,
}) => {
  const t = getTheme();
  const pad = 1;

  switch (item.kind) {
    case "user":
      return <UserMessage text={item.text ?? ""} outputPad={pad} width={width} />;

    case "assistant":
      return (
        <AssistantMessage
          message={{
            content: [
              ...(item.thinking ? [{ type: "thinking", thinking: item.thinking }] : []),
              ...(item.text ? [{ type: "text", text: item.text }] : []),
            ] as Array<{ type: string; text?: string; thinking?: string }>,
            stopReason: item.stopReason,
            errorMessage: item.errorMessage,
          }}
          outputPad={pad}
          width={width}
        />
      );

    case "tool":
      return (
        <ToolExecution
          toolName={item.toolName ?? "tool"}
          toolCallId={item.id}
          args={item.toolArgs ?? {}}
          result={item.toolResult}
          expanded={item.toolExpanded ?? toolsExpanded}
          outputPad={pad}
          width={width}
        />
      );

    case "bash":
      return (
        <BashExecution
          command={item.command ?? ""}
          excludeFromContext={item.excludeFromContext}
          outputPad={pad}
          expanded={item.expanded ?? toolsExpanded}
          running={item.running}
          exitCode={item.exitCode}
          cancelled={item.cancelled}
          width={width}
        />
      );

    case "custom":
      return (
        <CustomMessage
          message={{ customType: item.customType ?? "custom", content: item.text ?? "" }}
          outputPad={pad}
          width={width}
        />
      );

    case "skill":
      return item.summary ? (
        <SkillInvocation
          skillBlock={{ name: item.label ?? "skill", content: item.summary, userMessage: item.text }}
          outputPad={pad}
          width={width}
        />
      ) : null;

    case "compaction":
      return <SummaryMessages kind="compaction" summary={item.summary ?? ""} tokensBefore={item.tokensBefore ?? 0} outputPad={pad} width={width} />;

    case "branch":
      return <SummaryMessages kind="branch" summary={item.summary ?? ""} outputPad={pad} width={width} />;

    default:
      return (
        <Box paddingX={pad}>
          <Text>{t.fg("muted", item.text ?? "")}</Text>
        </Box>
      );
  }
};

/**
 * Transcript: vùng hội thoại có cuộn theo dòng.
 *
 * App tính tổng số dòng bằng itemToLines (cùng công thức wrap với renderer), rồi
 * truyền skipLines; component này chỉ render các mục còn lại. Cách này giữ được
 * "cuộn theo dòng" mà không cần một bộ layout engine như pi-mono.
 */
export const Transcript: React.FC<TranscriptProps> = ({
  items,
  width = 80,
  toolsExpanded = false,
}) => {
  return (
    <Box flexDirection="column">
      {items.map((item) => (
        <TranscriptRow key={item.id} item={item} width={width} toolsExpanded={toolsExpanded} />
      ))}
    </Box>
  );
};

/** Tổng số dòng hiển thị của transcript (dùng cho maxScroll). */
export function transcriptLineCount(items: TranscriptItem[], width: number): number {
  return items.reduce((sum, item) => sum + itemToLines(item, width).length, 0);
}

/** Cắt các mục theo `skipLines`/`maxLines` dòng hiển thị. */
export function sliceTranscript(
  items: TranscriptItem[],
  width: number,
  maxLines: number,
  skipLines: number,
): { items: TranscriptItem[]; dropped: number } {
  if (maxLines <= 0) return { items: [], dropped: items.length };
  const kept: TranscriptItem[] = [];
  let used = 0;
  let skipped = 0;
  let dropped = 0;

  for (const item of items) {
    const lines = itemToLines(item, width).length;
    if (skipped < skipLines) {
      const take = Math.min(skipLines - skipped, lines);
      skipped += take;
      if (take >= lines) {
        dropped++;
        continue;
      }
      // Mục bị cắt một phần: giữ lại phần còn lại như một mục hệ thống.
      kept.push({
        ...item,
        kind: "system",
        text: `… (${lines - take} dòng đã cuộn qua)`,
      });
      used += 1;
      continue;
    }
    if (used + lines > maxLines) {
      const room = maxLines - used;
      if (room <= 0) {
        dropped++;
        continue;
      }
      kept.push({
        ...item,
        kind: "system",
        text: `… (${lines - room} dòng nữa)`,
      });
      used += room;
      continue;
    }
    kept.push(item);
    used += lines;
  }

  void dropped;
  return { items: kept, dropped };
}

/** Gộp text thô từ một message content (mảng block hoặc chuỗi). */
export function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: string }).type === "text") {
      parts.push((block as { text?: string }).text ?? "");
    }
  }
  return parts.join("\n");
}

/** Gộp thinking từ một message content. */
export function extractThinkingText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === "object" && (block as { type?: string }).type === "thinking") {
      const thinking = (block as { thinking?: string }).thinking;
      if (thinking && thinking.trim()) parts.push(thinking.trim());
    }
  }
  return parts.join("\n\n");
}

export default Transcript;
