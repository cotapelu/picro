// BashExecution - hiển thị lệnh bash và đầu ra dạng stream
// Bắt chước nguyên tắc pi-mono components/bash-execution.ts:
//   - Viền động hai đầu, lệnh in đậm, đầu ra tô màu muted
//   - Ghép dòng chưa hoàn chỉnh khi chunk mới đến
//   - Trạng thái: đang chạy (spinner), hoàn thành, hủy, lỗi (exit code)
//   - Thu gọn hiện PREVIEW_LINES dòng cuối; mở rộng hiện tất cả
//   - Cảnh báo khi đầu ra bị cắt do giới hạn ngữ cảnh
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { StatusIndicator } from "./StatusIndicator.js";
import { VisualLinePreview } from "./visual-truncate.js";
import { stripTerminalSequences } from "../core/TerminalText.js";

const PREVIEW_LINES = 20;
const MAX_LINES = 2000;
const MAX_BYTES = 51200;

export interface TruncationResult {
  truncated: boolean;
  content?: string;
}

export interface BashExecutionProps {
  command: string;
  /** Lệnh "!!" — đầu ra loại khỏi ngữ cảnh mô hình. */
  excludeFromContext?: boolean;
  outputPad?: number;
  expanded?: boolean;
  /** Đang chạy: hiện spinner. */
  running?: boolean;
  exitCode?: number;
  cancelled?: boolean;
  truncated?: TruncationResult;
  /** Đầu ra đã có (phiên được phát lại) để hiển thị ngay, không chỉ qua append(). */
  output?: string;
  fullOutputPath?: string;
  width?: number;
}

/** Cắt đuôi đầu ra theo giới hạn dòng và byte. */
function truncateTail(text: string): { content: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= MAX_LINES && Buffer.byteLength(text) <= MAX_BYTES) return { content: text, truncated: false };
  const kept = lines.slice(-MAX_LINES);
  let content = kept.join("\n");
  while (Buffer.byteLength(content) > MAX_BYTES && kept.length > 1) {
    kept.shift();
    content = kept.join("\n");
  }
  return { content, truncated: true };
}

export const BashExecution: React.FC<BashExecutionProps> = ({
  command,
  excludeFromContext = false,
  outputPad = 1,
  expanded = false,
  running = false,
  exitCode,
  cancelled = false,
  truncated,
  output,
  fullOutputPath,
  width = 80,
}) => {
  const t = getTheme();
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const colorKey = excludeFromContext ? "dim" : "bashMode";
  const pad = " ".repeat(outputPad);

  /**
   * Đồng bộ output từ prop vào state nội bộ.
   *
   * `output` was declared in the props type and then never read: a BashExecution
   * rendered from the transcript (a replayed session) showed an empty block, and
   * a live one only ever displayed chunks pushed through the internal append().
   */
  useEffect(() => {
    if (output === undefined) return;
    setOutputLines((prev) => (prev.join("\n") === output ? prev : output.split("\n")));
  }, [output]);

  // Thêm chunk vào đầu ra, ghép vào dòng cuối nếu chưa có newline.
  const append = (chunk: string): void => {
    setOutputLines((prev) => {
      const clean = chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const newLines = clean.split("\n");
      if (prev.length > 0 && newLines.length > 0) {
        const next = [...prev];
        next[next.length - 1] += newLines[0]!;
        next.push(...newLines.slice(1));
        return next;
      }
      return [...prev, ...newLines];
    });
  };

  const view = useMemo(() => {
    const full = outputLines.join("\n");
    const { content, truncated: ctxTruncated } = truncateTail(full);
    const available = content ? content.split("\n") : [];
    const preview = available.slice(-PREVIEW_LINES);
    const hidden = available.length - preview.length;
    return { available, preview, hidden, ctxTruncated };
  }, [outputLines]);

  const status = cancelled ? "cancelled" : running ? "running" : exitCode !== undefined && exitCode !== 0 ? "error" : "complete";

  const preview = useMemo(
    () =>
      new VisualLinePreview({
        text: "",
        maxVisualLines: PREVIEW_LINES,
        keep: "end",
        formatHint: (hidden) => t.fg("muted", `... ${hidden} dòng nữa (Ctrl+T để mở rộng)`),
      }),
    [t],
  );
  preview.setText(
    `\n${view.preview.map((line) => t.fg("muted", line.replace(/[\x00-\x1f]/g, ""))).join("\n")}`,
  );

  return (
    <Box flexDirection="column">
      <Text> </Text>
      <DynamicBorder color={(text) => t.fg(colorKey, text)} />
      <Box flexDirection="column">
        <Text>{`${pad}${t.fg(colorKey, t.bold(`$ ${command}`))}`}</Text>
        {view.available.length > 0 ? (
          expanded ? (
            <Text>{`\n${view.available.map((line) => t.fg("muted", line)).join("\n")}`}</Text>
          ) : (
            <Text>{preview.render(width).join("\n")}</Text>
          )
        ) : null}
        {running ? <StatusIndicator kind="working" message="Đang chạy..." embedded /> : null}
        {status !== "running" ? (
          <>
            <Text> </Text>
            {view.hidden > 0 ? (
              <Text>{pad + t.fg("muted", expanded ? "(Ctrl+T để thu gọn)" : `... ${view.hidden} dòng nữa (Ctrl+T để mở rộng)`)}</Text>
            ) : null}
            {status === "cancelled" ? <Text>{`${pad}${t.fg("warning", "(đã hủy)")}`}</Text> : null}
            {status === "error" ? <Text>{`${pad}${t.fg("error", `(exit ${exitCode})`)}`}</Text> : null}
            {(truncated?.truncated || view.ctxTruncated) && fullOutputPath ? (
              <Text>{`${pad}${t.fg("warning", `Đầu ra bị cắt. Toàn bộ: ${fullOutputPath}`)}`}</Text>
            ) : null}
          </>
        ) : null}
      </Box>
      <DynamicBorder color={(text) => t.fg(colorKey, text)} />
    </Box>
  );
};

/** Cho phép cha đẩy chunk đầu ra vào component. */
export interface BashExecutionHandle {
  append(chunk: string): void;
}

export function createBashExecutionHandle(
  setter: React.Dispatch<React.SetStateAction<string[]>>,
): BashExecutionHandle {
  return {
    append(chunk: string) {
      setter((prev) => [...prev, ...chunk.split("\n")]);
    },
  };
}
