// Keybindings - dòng gợi ý phím tắt dưới cùng
// Bắt chước nguyên tắc pi-mono keybinding-hints.ts:
//   - Nhãn phím tô màu "dim", mô tả tô màu "muted"
//   - Hiển thị trên một dòng, cắt theo chiều rộng khung nhìn
// Viet lai bang Ink TSX, khong copy code truc iep.

import React from "react";
import { Box, Text, useWindowSize } from "ink";
import { theme, fg, bg } from "../theme/index.js";

interface KeybindingsProps {
  show?: boolean;
}

interface KeyHint {
  keys: string;
  text: string;
}

/** Cắt theo cột hiển thị, bỏ qua chuỗi escape ANSI. */
function clipToWidth(text: string, width: number): string {
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (width <= 0) return "";
  if (plain.length <= width) return text;
  return text.slice(0, Math.max(0, width - 1)) + fg("dim", "…");
}

const HINTS: KeyHint[] = [
  { keys: "Ctrl+C", text: "thoát" },
  { keys: "Enter", text: "gửi" },
  { keys: "↑/↓", text: "cuộn tin nhắn" },
  { keys: "/help", text: "trợ giúp" },
];

export const Keybindings: React.FC<KeybindingsProps> = ({ show = true }) => {
  const { columns } = useWindowSize();
  if (!show) return null;

  const line = HINTS.map((h) => `${fg("dim", h.keys)}${fg("muted", ` ${h.text}`)}`).join(
    fg("dim", " · "),
  );

  return (
    <Box flexShrink={0}>
      <Text>{clipToWidth(line, columns || 80)}</Text>
    </Box>
  );
};
