// Box - hộp đệm + nền bao quanh nội dung
// Bắt chước nguyên tắc pi-tui components/box.ts:
//   - Đệm ngang/đứng cấu hình được
//   - Nền áp cho cả phần đệm để khối đồng nhất
//   - Không in gì khi không có con
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo } from "react";
import { Box as InkBox, Text } from "ink";
import { theme } from "../theme.js";

export interface BoxProps {
  children?: React.ReactNode;
  /** Đệm trái/phải. */
  paddingX?: number;
  /** Đệm trên/dưới. */
  paddingY?: number;
  /** Chiều rộng khung nhìn. */
  width?: number;
  /** Hàm tô nền. */
  background?: (text: string) => string;
}

/** Lấy chuỗi thuần từ children để đo chiều rộng. */
function flatten(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  if (React.isValidElement(node) && typeof node.props === "object" && node.props !== null) {
    const children = (node.props as { children?: React.ReactNode }).children;
    return children === undefined ? "" : flatten(children);
  }
  return "";
}

export const Box: React.FC<BoxProps> = ({
  children,
  paddingX = 1,
  paddingY = 1,
  width,
  background = theme.bgBlack,
}) => {
  const total = width ?? 80;
  const contentWidth = Math.max(1, total - paddingX * 2);
  const left = " ".repeat(paddingX);
  const blank = " ".repeat(total);

  const rows = useMemo(() => {
    if (!children) return [];
    const text = flatten(children);
    return text.split("\n");
  }, [children]);

  return (
    <InkBox flexDirection="column">
      {Array.from({ length: paddingY }).map((_, i) => (
        <Text key={`top-${i}`}>{background(blank)}</Text>
      ))}
      {rows.map((row, i) => (
        <Text key={`row-${i}`}>{background(`${left}${row}`.padEnd(total, " "))}</Text>
      ))}
      {Array.from({ length: paddingY }).map((_, i) => (
        <Text key={`bottom-${i}`}>{background(blank)}</Text>
      ))}
    </InkBox>
  );
};
