// VisualTruncate - cắt văn bản theo số dòng hiển thị
// Bắt chước nguyên tắc pi-mono components/visual-truncate.ts:
//   - truncateToVisualLines: cắt theo dòng hiển thị (đã wrap), giữ đầu hoặc cuối
//   - VisualLinePreview: bản xem trước cache theo chiều rộng, kèm dòng gợi ý
//   - paddingX = 0 khi nằm trong Box, 1 khi nằm trong Container trần
// Port sang TSX riêng, khon copy code truc iep.

import { wrapTextWithAnsi, truncateToWidth } from "../core/index.js";

export interface VisualTruncateResult {
  /** Các dòng hiển thị giữ lại. */
  visualLines: string[];
  /** Số dòng hiển thị đã bị ẩn. */
  skippedCount: number;
}

/**
 * Cắt văn bản theo số dòng hiển thị tối đa, tính tới việc ngắt dòng.
 * @param keep "start" giữ các dòng đầu, "end" (mặc định) giữ các dòng cuối
 */
export function truncateToVisualLines(
  text: string,
  maxVisualLines: number,
  width: number,
  paddingX = 0,
  keep: "start" | "end" = "end",
): VisualTruncateResult {
  if (!text) return { visualLines: [], skippedCount: 0 };
  const contentWidth = Math.max(1, width - paddingX * 2);
  const all = wrapTextWithAnsi(text.replace(/\t/g, "   "), contentWidth).map((line) => `${" ".repeat(paddingX)}${line}`);
  if (all.length <= maxVisualLines) return { visualLines: all, skippedCount: 0 };
  const kept = keep === "start" ? all.slice(0, maxVisualLines) : all.slice(-maxVisualLines);
  return { visualLines: kept, skippedCount: all.length - maxVisualLines };
}

export interface VisualLinePreviewOptions {
  /** Văn bản đã tô màu, có thể chứa xuống dòng. */
  text: string;
  maxVisualLines: number;
  /** Giữ đầu hay cuối; gợi ý đặt trước dòng cuối hoặc sau dòng đầu. */
  keep: "start" | "end";
  /** Dòng gợi ý với số dòng bị ẩn. */
  formatHint: (hidden: number) => string;
}

/** Bản xem trước đầu ra công cụ/bash đã cắt theo dòng hiển thị. */
export class VisualLinePreview {
  private options: VisualLinePreviewOptions;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(options: VisualLinePreviewOptions) {
    this.options = options;
  }

  render(width: number): string[] {
    if (this.cachedLines === undefined || this.cachedWidth !== width) {
      const { text, maxVisualLines, keep, formatHint } = this.options;
      const preview = truncateToVisualLines(text, maxVisualLines, width, 0, keep);
      const lines = preview.visualLines;
      if (preview.skippedCount > 0) {
        const hint = truncateToWidth(formatHint(preview.skippedCount), width, "...");
        this.cachedLines = keep === "start" ? [...lines, hint] : [hint, ...lines];
      } else {
        this.cachedLines = lines;
      }
      this.cachedWidth = width;
    }
    return this.cachedLines ?? [];
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }
}
