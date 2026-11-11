// DynamicBorder - đường kẻ ngang vừa chiều rộng khung nhìn
// Bắt chước nguyên tắc pi-mono components/dynamic-border.ts:
//   - Ký tự "─" lặp lại đúng bằng chiều rộng hiển thị
//   - Hàm màu nhận từ ngoài để tái sử dụng với nhiều ngữ cảnh
// Port sang Ink TSX, khong copy code truc iep.

import React from "react";
import { Text, useWindowSize } from "ink";
import { theme } from "../theme.js";

export interface DynamicBorderProps {
  /** Hàm tô màu cho đường kẻ. */
  color?: (text: string) => string;
}

export const DynamicBorder: React.FC<DynamicBorderProps> = ({ color = theme.fgBorder }) => {
  const { columns } = useWindowSize();
  return <Text>{color("─".repeat(Math.max(1, columns || 80)))}</Text>;
};
