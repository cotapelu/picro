// KeyHintText - định dạng gợi ý phím tắt
// Bắt chước nguyên tắc pi-mono components/keybinding-hints.ts:
//   - Phím tô "dim", mô tả tô "muted", ghép bằng một dấu cách
//   - Hỗ trợ nhiều phím cách nhau bằng "/" và viết hoa chữ cái đầu
// Port sang Ink TSX, khong copy code truc iep.

import React from "react";
import { Text } from "ink";
import { theme, fg, bg } from "../theme.js";

export interface KeyHintTextProps {
  /** Nhãn phím, ví dụ "ctrl+c" hoặc "up/down". */
  keys: string;
  /** Mô tả hành động. */
  description: string;
  /** Viết hoa chữ cái đầu mỗi phần. */
  capitalize?: boolean;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

export const KeyHintText: React.FC<KeyHintTextProps> = ({ keys, description, capitalize: cap = false }) => {
  const displayKey = cap ? capitalize(keys) : keys;
  return (
    <Text>
      {fg("dim", displayKey)}
      {fg("muted", ` ${description}`)}
    </Text>
  );
};
