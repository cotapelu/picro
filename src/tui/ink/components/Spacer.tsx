// Spacer - dòng trống
// Bắt chước nguyên tắc pi-tui components/spacer.ts: render N dòng rỗng.
// Port sang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Text } from "ink";

export interface SpacerProps {
  /** Số dòng trống cần thêm. */
  lines?: number;
}

/**
 * Mỗi dòng trống là MỘT <Text> riêng.
 *
 * Bản cũ gom mọi "\n" vào một <Text>; Ink không bảo đảm số dòng output cho
 * chuỗi chỉ chứa newline (nó có thể trim/collapse), nên khoảng cách giữa các
 * khối bị sai so với pi-mono (trả mảng string[] mỗi phần tử một dòng).
 */
export const Spacer: React.FC<SpacerProps> = ({ lines = 1 }) => {
  const count = Math.max(0, Math.floor(lines));
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Text key={`spacer-${i}`}> </Text>
      ))}
    </>
  );
};
