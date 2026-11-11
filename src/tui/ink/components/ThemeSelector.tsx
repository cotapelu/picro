// ThemeSelector - chọn chủ đề giao diện
// Bắt chước nguyên tắc pi-mono components/theme-selector.ts:
//   - Danh sách chủ đề với tiền chọn chủ đề đang dùng
//   - Gắn mô tả "(hiện tại)" cho mục đang hoạt động
//   - Đổi mỗi lần nhấn phím để xem trước màu
// Port sang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { SelectList } from "./SelectList.js";

export interface ThemeSelectorProps {
  themes: string[];
  currentTheme: string;
  onSelect: (themeName: string) => void;
  onCancel: () => void;
  /** Gọi mỗi lần nhấn phím để xem trước. */
  onPreview?: (themeName: string) => void;
  width?: number;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  currentTheme,
  onSelect,
  onCancel,
  onPreview,
  width = 80,
}) => {
  const items = themes.map((name) => ({
    value: name,
    label: name,
    description: name === currentTheme ? "(hiện tại)" : undefined,
  }));

  useInput((input, key) => {
    if (key.return) {
      const selected = items.find((i) => i.value === currentTheme);
      if (selected) onSelect(selected.value);
      return;
    }
    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", "Chọn chủ đề")}</Text>
      <Text> </Text>
      <SelectList
        items={items}
        initialValue={currentTheme}
        onSelect={(item) => onSelect(item.value)}
        onCancel={onCancel}
        onHighlight={(item) => onPreview?.(item.value)}
        width={width}
      />
      <Text> </Text>
      <Text>{fg("dim", "  Enter để dùng · Esc để hủy")}</Text>
      <DynamicBorder />
    </Box>
  );
};
