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

/** Bề rộng hiển thị của dòng (bỏ qua ANSI). */
function visualWidth(line: string): number {
  return line.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** Ghép hai đoạn ở cùng một dòng theo cột. */
function composite(base: string, overlay: string, col: number, total: number): string {
  const plainBase = base.replace(/\x1b\[[0-9;]*m/g, "");
  const before = plainBase.slice(0, col).padEnd(col, " ");
  const after = plainBase.slice(col).padEnd(Math.max(0, total - col), " ");
  return `${before}${overlay}${after}`;
}

export const HStack: React.FC<HStackProps> = ({
  entries,
  width = 80,
  gap = 0,
  align = "center",
}) => {
  const intrinsic = entries.map((entry) =>
    entry.basis ?? Math.max(0, ...entry.lines.map(visualWidth)),
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
      out[target] = composite(out[target] ?? "", line.padEnd(childWidth, " "), x, width);
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
