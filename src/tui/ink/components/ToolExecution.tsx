// ToolExecution - hiển thị lời gọi và kết quả công cụ
// Bắt chước nguyên tắc pi-mono components/tool-execution.ts:
//   - Hộp nền theo trạng thái: pending / success / error
//   - Ưu tiên renderCall/renderResult riêng của tool; lỗi thì dùng bản dự phòng
//   - Trạng thái args: partial -> argsComplete -> executionStarted
//   - Ảnh trong kết quả hiển thị qua component Image
//   - Thu gọn hiện số dòng xem trước, Ctrl+T để mở rộng
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { MarkdownRenderer } from "./MarkdownRenderer.js";
import { VisualLinePreview } from "./visual-truncate.js";
import { truncateToWidth } from "../core/index.js";
import { Image } from "./Image.js";

const FALLBACK_PREVIEW_LINES = 10;

export interface ToolRenderContext {
  args: unknown;
  toolCallId: string;
  executionStarted: boolean;
  argsComplete: boolean;
  isPartial: boolean;
  expanded: boolean;
  showImages: boolean;
  isError: boolean;
  durationMs?: number;
  outputPad: number;
}

export interface ToolRenderers {
  renderCall?: (args: unknown, theme: unknown, context: ToolRenderContext) => string;
  renderResult?: (
    result: { content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>; details?: unknown },
    options: { expanded: boolean; isPartial: boolean },
    theme: unknown,
    context: ToolRenderContext,
  ) => string;
}

export interface ToolExecutionProps {
  toolName: string;
  toolCallId: string;
  args: unknown;
  renderers?: ToolRenderers;
  result?: {
    content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
    details?: unknown;
    isError: boolean;
    durationMs?: number;
  };
  executionStarted?: boolean;
  argsComplete?: boolean;
  expanded?: boolean;
  showImages?: boolean;
  outputPad?: number;
  cwd?: string;
  width?: number;
}

/** Bản dự phòng cho lời gọi: tên tool + args JSON. */
function fallbackCall(name: string, args: unknown): string {
  let text = name;
  try {
    const content = JSON.stringify(args, null, 2);
    if (content) text += `\n\n${content}`;
  } catch {
    // args không tuần tự hóa được: chỉ hiện tên.
  }
  return text;
}

/** Lấy phần text thuần từ kết quả. */
function textOf(result: ToolExecutionProps["result"]): string {
  if (!result) return "";
  return result.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text ?? "")
    .join("\n");
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({
  toolName,
  toolCallId,
  args,
  renderers,
  result,
  executionStarted = false,
  argsComplete = false,
  expanded = false,
  showImages = true,
  outputPad = 1,
  width = 80,
}) => {
  const t = getTheme();
  const isPartial = result === undefined;
  const isError = result?.isError ?? false;
  const [showImagesState] = useState(showImages);
  const pad = " ".repeat(outputPad);

  const bgKey = isPartial ? "toolPendingBg" : isError ? "toolErrorBg" : "toolSuccessBg";
  const context: ToolRenderContext = {
    args,
    toolCallId,
    executionStarted,
    argsComplete,
    isPartial,
    expanded,
    showImages: showImagesState,
    isError,
    durationMs: result?.durationMs,
    outputPad,
  };

  // Preview đầu ra khi thu gọn.
  //
  // The instance is stable and the text is pushed through invalidate(): building
  // a new VisualLinePreview per output change (as useMemo([outputText]) did)
  // meant its width cache could never hit, so the entire output was re-wrapped on
  // every streamed chunk - O(n^2) over a long run.
  const outputText = textOf(result);
  const preview = useMemo(
    () =>
      new VisualLinePreview({
        text: "",
        maxVisualLines: FALLBACK_PREVIEW_LINES,
        keep: "end",
        formatHint: (hidden) => t.fg("muted", `... (${hidden} dòng nữa, Ctrl+T để mở rộng)`),
      }),
    [t],
  );
  const lastPreviewText = useRef<string | null>(null);
  useEffect(() => {
    if (lastPreviewText.current === outputText) return;
    lastPreviewText.current = outputText;
    (preview as unknown as { options: { text: string } }).options.text = outputText;
    preview.invalidate();
  }, [preview, outputText]);

  const callBody = (() => {
    if (renderers?.renderCall) {
      try {
        return renderers.renderCall(args, t, context);
      } catch {
        return fallbackCall(toolName, args);
      }
    }
    return fallbackCall(toolName, args);
  })();

  const resultBody = (() => {
    if (!result) return undefined;
    if (renderers?.renderResult) {
      try {
        return renderers.renderResult({ content: result.content, details: result.details }, { expanded, isPartial }, t, context);
      } catch {
        // Rơi về bản dự phòng.
      }
    }
    if (!outputText) return undefined;
    if (expanded) return outputText;
    return preview.render(width).join("\n");
  })();

  const images = result?.content.filter((c) => c.type === "image" && c.data && c.mimeType) ?? [];

  return (
    <Box flexDirection="column">
      <Text> </Text>
      <DynamicBorder color={(text) => t.fg(isError ? "error" : "border", text)} />
      <Box flexDirection="column">
        <Text>{`${pad}${t.bg(bgKey, t.bold(t.fg("toolTitle", toolName)))}`}</Text>
        <Text>{`${pad}${t.bg(bgKey, "")}`.trimEnd()}</Text>
        {callBody
          .split("\n")
          .map((line, i) => (
            <Text key={`call-${i}`}>{`${pad}${t.bg(bgKey, truncateToWidth(line, Math.max(10, width - outputPad * 2), ""))}`}</Text>
          ))}
        {resultBody ? (
          <Text>{`${pad}${t.bg(bgKey, resultBody)}`}</Text>
        ) : null}
        {showImagesState
          ? images.map((img, i) => (
              <Box key={`img-${i}`} flexDirection="column">
                <Image base64Data={img.data!} mimeType={img.mimeType!} maxWidthCells={60} />
              </Box>
            ))
          : null}
        {!isPartial && executionStarted ? (
          <Text>{`${pad}${t.bg(bgKey, t.fg("muted", result?.durationMs !== undefined ? `(${result.durationMs}ms)` : ""))}`}</Text>
        ) : null}
      </Box>
      <DynamicBorder color={(text) => t.fg(isError ? "error" : "border", text)} />
    </Box>
  );
};
