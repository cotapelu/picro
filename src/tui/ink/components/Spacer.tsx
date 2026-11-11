// Spacer - dòng trống
// Bắt chước nguyên tắc pi-tui components/spacer.ts: render N dòng rỗng.
// Port sang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Text } from "ink";

export interface SpacerProps {
  /** Số dòng trống cần thêm. */
  lines?: number;
}

export const Spacer: React.FC<SpacerProps> = ({ lines = 1 }) => {
  const count = Math.max(0, lines);
  if (count === 0) return null;
  return (
    <Text>
      {Array.from({ length: count }).map((_, i) => (
        <span key={`spacer-${i}`}>{"\n"}</span>
      ))}
    </Text>
  );
};
