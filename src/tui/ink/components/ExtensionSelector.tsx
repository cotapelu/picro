// ExtensionSelector - hộp thoại chọn một phương án cho extension
// Bắt chước nguyên tắc pi-mono components/extension-selector.ts:
//   - Viền động hai đầu, tiêu đề, mô tả, danh sách phương án
//   - Mục được chọn có "→ ", cuộn theo cửa sổ maxVisible
//   - Hỗ trợ j/k, Enter chọn, Esc hủy, đếm ngược tự hủy
// Port sang Ink TSX, khong copy code truc iep.

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { CountdownTimer } from "./CountdownTimer.js";
import { KeyHintText } from "./KeyHintText.jsx";

export interface ExtensionSelectorProps {
  title: string;
  options: string[];
  description?: string;
  timeout?: number;
  initialIndex?: number;
  onSelect: (option: string) => void;
  onCancel: () => void;
  width?: number;
}

const MAX_VISIBLE = 10;

export const ExtensionSelector: React.FC<ExtensionSelectorProps> = ({
  title,
  options,
  description,
  timeout,
  initialIndex = 0,
  onSelect,
  onCancel,
  width = 80,
}) => {
  const [selected, setSelected] = useState(initialIndex);

  useEffect(() => {
    if (selected >= options.length) setSelected(Math.max(0, options.length - 1));
  }, [selected, options.length]);

  useInput((input, key) => {
    if (key.return) {
      const option = options[selected];
      if (option) onSelect(option);
      return;
    }
    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onCancel();
      return;
    }
    if (key.upArrow || input === "k") {
      setSelected((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setSelected((i) => Math.min(options.length - 1, i + 1));
      return;
    }
  });

  const start = Math.max(
    0,
    Math.min(selected - Math.floor(MAX_VISIBLE / 2), options.length - MAX_VISIBLE),
  );
  const end = Math.min(start + MAX_VISIBLE, options.length);
  const visible = options.slice(start, end);

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", title)}</Text>
      {description ? (
        <>
          <Text> </Text>
          <Text>{fg("text", description)}</Text>
        </>
      ) : null}
      <Text> </Text>
      {visible.map((option, offset) => {
        const index = start + offset;
        const isSelected = index === selected;
        return (
          <Text key={`${index}-${option}`}>
            {isSelected
              ? `${fg("accent", "→ ")}${fg("accent", option)}`
              : `  ${fg("text", option)}`}
          </Text>
        );
      })}
      {start > 0 || end < options.length ? (
        <Text>{fg("muted", `  (${selected + 1}/${options.length})`)}</Text>
      ) : null}
      {timeout && timeout > 0 ? (
        <CountdownTimer durationMs={timeout} onTimeout={onCancel} label="tự đóng sau" />
      ) : null}
      <Box flexDirection="row">
        <KeyHintText keys="↑↓" description="chọn" />
        <Text>  </Text>
        <KeyHintText keys="Enter" description="xác nhận" />
        <Text>  </Text>
        <KeyHintText keys="Esc" description="hủy" />
      </Box>
      <DynamicBorder />
    </Box>
  );
};
