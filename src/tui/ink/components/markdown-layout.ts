// SPDX-License-Identifier: Apache-2.0
/**
 * Markdown block/inline styling for the terminal renderer.
 *
 * Extracted from MarkdownRenderer so the line-level rules are testable without
 * Ink's renderer. Two defects the inline version had:
 *
 * 1. `styleInline` applied inline-code/bold/italic with chained String.replace
 *    whose patterns matched ACROSS a line that already contained escapes, and the
 *    link pattern dropped the URL entirely - so [text](url) lost the target.
 * 2. `clipLine` measured the ANSI-stripped line but sliced the RAW string, so
 *    escape bytes consumed the budget (the same defect as TreeSelector and
 *    StatusBar) and the cut could land inside an escape sequence.
 */

import { visibleWidth } from "../core/index.js";

const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** Loại dòng markdown. */
export type MarkdownLineKind = "heading" | "bullet" | "ordered" | "quote" | "hr" | "paragraph";

const HEADING_RE = /^#{1,6}\s/;
const BULLET_RE = /^[-*+]\s/;
const ORDERED_RE = /^(\d+)\.\s(.*)$/;
const QUOTE_RE = /^>\s?/;
const HR_RE = /^(-{3,}|\*{3,})$/;

/** Phân loại một dòng markdown (đã bỏ khoảng trắng đầu). */
export function classifyMarkdownLine(line: string): MarkdownLineKind {
  const trimmed = line.trimStart();
  if (HEADING_RE.test(trimmed)) return "heading";
  if (BULLET_RE.test(trimmed)) return "bullet";
  if (ORDERED_RE.test(trimmed)) return "ordered";
  if (QUOTE_RE.test(trimmed)) return "quote";
  if (HR_RE.test(trimmed)) return "hr";
  return "paragraph";
}

/**
 * Cắt một dòng đã tô màu theo số cột HIỂN THỊ.
 *
 * Walks whole graphemes and swallows escape sequences without spending budget,
 * so the result never exceeds maxWidth columns and never ends inside an escape.
 * When the line overflows, one column is reserved for the ellipsis.
 */
export function clipMarkdownLine(line: string, maxWidth: number, ellipsis = "…"): string {
  const width = Math.max(0, Math.floor(maxWidth));
  if (width === 0) return "";

  const needsEllipsis = visibleWidth(line) > width;
  if (!needsEllipsis) return line;

  const budget = Math.max(0, width - Math.max(1, visibleWidth(ellipsis)));
  const graphemes = (value: string): string[] =>
    [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((s) => s.segment);

  let used = 0;
  let taken = "";
  let i = 0;
  while (i < line.length) {
    if (line[i] === "\x1b") {
      // Swallow the whole escape sequence: it costs no columns.
      let j = i;
      while (j < line.length && line[j] !== "m") j++;
      j = Math.min(line.length, j + 1);
      taken += line.slice(i, j);
      i = j;
      continue;
    }
    const grapheme = graphemes(line.slice(i))[0] ?? line[i]!;
    const graphemeWidth = visibleWidth(grapheme);
    if (used + graphemeWidth > budget) break;
    taken += grapheme;
    used += graphemeWidth;
    i += grapheme.length;
  }
  return `${taken}${ellipsis}`;
}

/** Đệm dây đủ chiều rộng để viền khối đều nhau (không tính ANSI). */
export function padMarkdownLine(line: string, width: number): string {
  const missing = Math.max(0, Math.floor(width) - visibleWidth(line));
  return line + " ".repeat(missing);
}

/** Cắt bỏ escape khỏi chuỗi, để đo hoặc so sánh văn bản thuần. */
export function stripAnsiSequences(text: string): string {
  return text.replace(ANSI_RE, "");
}
