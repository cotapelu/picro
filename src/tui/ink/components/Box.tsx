// Box - hộp đệm + nền bao quanh nội dung
// Bắt chước nguyên tắc pi-tui components/box.ts:
//   - Đệm ngang/đứng cấu hình được
//   - Nền áp cho cả phần đệm để khối đồng nhất
//   - Không in gì khi không có con
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo } from "react";
import { Box as InkBox, Text } from "ink";
import { theme } from "../theme/index.js";

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

/**
 * Lấy chuỗi thuần từ children.
 *
 * Bản cũ chỉ đi vào `props.children` của element, nên mọi element KHÔNG có
 * children (ví dụ <Text dim>x</Text> được Ink render qua prop `children` nội bộ,
 * hoặc component tự sinh chuỗi) biến mất hoàn toàn: Box lồng Box, icon, dấu
 * check đều không hiện. Cần render cả `props` không phải children (Ink dùng
 * prop này cho nội dung text), và bỏ qua các prop không phải nội dung.
 */
function flatten(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (props.children !== undefined) return flatten(props.children as React.ReactNode);
    // Ink <Text> cũng nhận nội dung qua chính element khi children bị bỏ qua;
    // trường hợp này coi như rỗng thay vì nuốt mất node.
    return "";
  }
  return "";
}

export const Box: React.FC<BoxProps> = ({
  children,
  paddingX = 1,
  paddingY = 1,
  width,
  background = theme.bgBlack as unknown as (text: string) => string,
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
