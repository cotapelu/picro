// HStack - xếp các khối theo chiều ngang
// Bắt chước nguyên tắc pi-tui components/h-stack.ts:
//   - Mỗi con chiếm bề rộng vừa đủ, phần dư chia theo grow
//   - align: start | center | end theo chiều dọc
// Port sang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box as InkBox, Text } from "ink";

export interface HStackEntry {
  key: string;
  /** Bề rộng cố định (ký tự); mặc định theo nội dung. */
  basis?: number;
  /** Hệ số giãn khi còn dư không gian. */
  grow?: number;
  /** Hệ số co lại khi thiếu chỗ. */
  shrink?: number;
  /** Dòng nội dung. */
  lines: string[];
}

export interface HStackProps {
  entries: HStackEntry[];
  /** Chiều rộng khung nhìn. */
  width?: number;
  /** Khoảng cách giữa các con. */
  gap?: number;
  align?: "start" | "center" | "end";
}

/**
 * Bề rộng hiển thị của dòng.
 *
 * Regex cũ chỉ bỏ SGR (\x1b[...m) nên hyperlink OSC 8, cursor marker APC và
 * escape ảnh vẫn bị đo là "ký tự nhìn thấy", làm mọi phép tính bề rộng của
 * HStack lệch — đúng thứ mà visibleWidth() của tầng core loại bỏ.
 */
import { visibleWidth, stripTerminalSequences } from "../core/index.js";

/** Cắt một đoạn theo CỘT HIỂN THỊ, rồi đệm cho đủ bề rộng. */
function sliceByColumns(line: string, startCol: number, length: number): string {
  if (length <= 0) return "";
  let out = "";
  let used = 0;
  let col = 0;
  let i = 0;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code === 0x1b) {
      // Nuốt escape (SGR/OSC/APC) — không tốn cột.
      let j = i + 1;
      const next = line[j];
      if (next === "[") {
        while (j < line.length && !"mGKHJ".includes(line[j]!)) j++;
        j = Math.min(line.length, j + 1);
      } else if (next === "]" || next === "_") {
        while (j < line.length && line[j] !== "\x07" && !(line[j] === "\x1b" && line[j + 1] === "\\")) j++;
        if (line[j] === "\x07") j += 1;
        else j = Math.min(line.length, j + 2);
      } else {
        j = i + 1;
      }
      if (col >= startCol) out += line.slice(i, j);
      i = j;
      continue;
    }
    // Một grapheme.
    const seg = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(line.slice(i))][0]?.segment ?? line[i]!;
    const w = visibleWidth(seg);
    if (col >= startCol && col < startCol + length) {
      out += seg;
      used += w;
    }
    col += w;
    i += seg.length;
    if (col >= startCol + length) break;
  }
  return out;
}

export const HStack: React.FC<HStackProps> = ({
  entries,
  width = 80,
  gap = 0,
  align = "center",
}) => {
  const intrinsic = entries.map((entry) =>
    entry.basis ?? Math.max(0, ...entry.lines.map((l) => visibleWidth(l))),
  );
  const available = Math.max(0, width - Math.max(0, entries.length - 1) * gap);
  const intrinsicTotal = intrinsic.reduce((sum, w) => sum + w, 0);

  // Chia không gian: dư thì grow, thiếu thì shrink.
  const widths = [...intrinsic];
  if (intrinsicTotal < available) {
    let remaining = available - intrinsicTotal;
    const growTotal = entries.reduce((sum, e) => sum + (e.grow ?? 1), 0) || 1;
    entries.forEach((entry, i) => {
      if (remaining <= 0) return;
      const share = Math.floor((remaining * (entry.grow ?? 1)) / growTotal);
      widths[i] = (widths[i] ?? 0) + share;
      remaining -= share;
    });
  } else if (intrinsicTotal > available) {
    let deficit = intrinsicTotal - available;
    entries.forEach((entry, i) => {
      if (deficit <= 0) return;
      if ((entry.shrink ?? 1) <= 0) return;
      const reduce = Math.min(deficit, (widths[i] ?? 0) - Math.min(1, widths[i] ?? 0));
      widths[i] = (widths[i] ?? 0) - reduce;
      deficit -= reduce;
    });
  }

  const height = Math.max(1, ...entries.map((e) => e.lines.length));
  const out: string[] = Array.from({ length: height }, () => "");

  let x = 0;
  entries.forEach((entry, i) => {
    const childWidth = widths[i] ?? 0;
    const offset =
      align === "start" ? 0 : align === "end" ? height - entry.lines.length : Math.floor((height - entry.lines.length) / 2);
    entry.lines.forEach((line, row) => {
      const target = row + offset;
      if (target < 0 || target >= height) return;
      // Ghép theo CỘT HIỂN THỊ thay vì slice theo UTF-16 unit: chuỗi chứa emoji
      // hay CJK bị lệch cột nếu cắt theo code unit.
      const before = sliceByColumns(out[target] ?? "", 0, x).padEnd(x, " ");
      const cell = sliceByColumns(line, 0, childWidth).padEnd(childWidth, " ");
      const after = sliceByColumns(out[target] ?? "", x + childWidth, Math.max(0, width - x - childWidth));
      out[target] = `${before}${cell}${after}`;
    });
    x += childWidth + gap;
  });

  return (
    <InkBox flexDirection="column">
      {out.map((line, i) => (
        <Text key={`h-${i}`}>{line.length > 0 ? line : " ".repeat(width)}</Text>
      ))}
    </InkBox>
  );
};
