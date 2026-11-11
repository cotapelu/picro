// VStack - xếp các khối theo chiều dọc
// Bắt chước nguyên tắc pi-tui components/v-stack.ts + stack.ts:
//   - Mỗi con có basis (số dòng cố định hoặc auto), grow, shrink, minSize
//   - Dư chỗ thì chia theo grow, thiếu thì co theo shrink
//   - Cân bằng trên toàn bộ chiều cao khung nhìn
// Port sang Ink TSX, khong copy code truc iep.

import React from "react";
import { Box as InkBox, Text } from "ink";

export interface VStackEntry {
  key: string;
  /** Số dòng cố định; "auto" hoặc bỏ trống = theo nội dung. */
  basis?: number | "auto";
  grow?: number;
  shrink?: number;
  minSize?: number;
  lines: string[];
}

export interface VStackProps {
  entries: VStackEntry[];
  /** Chiều cao khung nhìn; bỏ trống = tổng chiều cao tự nhiên. */
  height?: number;
  gap?: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Chia/gom không gian giữa các dòng. */
function allocate(
  sizes: number[],
  entries: VStackEntry[],
  amount: number,
  mode: "grow" | "shrink",
): void {
  let remaining = amount;
  while (remaining > 0) {
    const candidates = entries
      .map((entry, i) => ({ entry, i }))
      .filter(({ entry, i }) =>
        mode === "grow" ? (entry.grow ?? 0) > 0 : (entry.shrink ?? 1) > 0 && (sizes[i] ?? 0) > (entry.minSize ?? 0),
      );
    if (candidates.length === 0) return;

    const totalWeight = candidates.reduce(
      (sum, { entry, i }) => sum + (mode === "grow" ? (entry.grow ?? 0) : (entry.shrink ?? 1) * Math.max(1, sizes[i] ?? 0)),
      0,
    );
    let moved = 0;
    for (const { entry, i } of candidates) {
      if (remaining <= 0) break;
      const weight = mode === "grow" ? (entry.grow ?? 0) : (entry.shrink ?? 1) * Math.max(1, sizes[i] ?? 0);
      const proposed = Math.max(1, Math.floor((remaining * weight) / totalWeight));
      const capacity = mode === "grow" ? Infinity : Math.max(0, (sizes[i] ?? 0) - (entry.minSize ?? 0));
      const delta = Math.min(remaining, proposed, capacity);
      if (delta <= 0) continue;
      sizes[i] = (sizes[i] ?? 0) + (mode === "grow" ? delta : -delta);
      remaining -= delta;
      moved += delta;
    }
    if (moved === 0) return;
  }
}

export const VStack: React.FC<VStackProps> = ({ entries, height, gap = 0 }) => {
  const intrinsic = entries.map((entry, i) =>
    entry.basis === undefined || entry.basis === "auto" ? entry.lines.length : clamp(entry.basis, 0, Infinity),
  );
  const sizes = entries.map((entry, i) => clamp(intrinsic[i] ?? 0, entry.minSize ?? 0, Infinity));

  if (height !== undefined) {
    const contentSize = Math.max(0, height - Math.max(0, entries.length - 1) * gap);
    const total = sizes.reduce((sum, s) => sum + s, 0);
    if (total < contentSize) allocate(sizes, entries, contentSize - total, "grow");
    else if (total > contentSize) allocate(sizes, entries, total - contentSize, "shrink");
  }

  const rows: string[] = [];
  entries.forEach((entry, i) => {
    if (i > 0) {
      for (let g = 0; g < gap; g++) rows.push("");
    }
    const size = sizes[i] ?? 0;
    const lines = entry.lines.slice(0, size);
    rows.push(...lines);
    for (let p = lines.length; p < size; p++) rows.push("");
  });

  return (
    <InkBox flexDirection="column">
      {rows.map((line, i) => (
        <Text key={`v-${i}`}>{line}</Text>
      ))}
    </InkBox>
  );
};
