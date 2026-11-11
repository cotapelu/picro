// SettingsSelector - bảng cài đặt
// Bắt chước nguyên tắc pi-mono components/settings-selector.ts:
//   - Nhãn canh lề trái, giá trị canh phải theo chiều rộng nhãn dài nhất
//   - Mô tả hiện ở dòng dưới mục được chọn
//   - Enter/Space đổi giá trị hoặc mở submenu; Esc thoát
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";

export interface SettingRow {
  id: string;
  label: string;
  value: string;
  description?: string;
  /** Danh sách giá trị để xoay vòng; bỏ trống = chỉ hiển thị. */
  values?: string[];
}

export interface SettingsSelectorProps {
  settings: SettingRow[];
  onChange: (id: string, value: string) => void;
  onCancel: () => void;
  width?: number;
}

const MAX_VISIBLE = 12;

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({
  settings,
  onChange,
  onCancel,
  width = 80,
}) => {
  const [selected, setSelected] = useState(0);
  const maxLabelWidth = useMemo(
    () => Math.min(36, Math.max(...settings.map((s) => s.label.length), 1)),
    [settings],
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((i) => (i === 0 ? settings.length - 1 : i - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((i) => (i === settings.length - 1 ? 0 : i + 1));
      return;
    }
    if (key.return || input === " ") {
      const row = settings[selected];
      if (!row) return;
      if (row.values && row.values.length > 0) {
        const idx = row.values.indexOf(row.value);
        const next = row.values[(idx + 1) % row.values.length]!;
        onChange(row.id, next);
      }
      return;
    }
    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onCancel();
      return;
    }
  });

  const start = Math.max(
    0,
    Math.min(selected - Math.floor(MAX_VISIBLE / 2), settings.length - MAX_VISIBLE),
  );
  const end = Math.min(start + MAX_VISIBLE, settings.length);
  const visible = settings.slice(start, end);
  const selectedRow = settings[selected];

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", "Cài đặt")}</Text>
      <Text> </Text>
      {visible.map((row, offset) => {
        const index = start + offset;
        const isSelected = index === selected;
        const cursor = isSelected ? fg("accent", "› ") : "  ";
        const label = row.label.padEnd(maxLabelWidth, " ");
        const valueWidth = Math.max(4, width - maxLabelWidth - 6);
        const value = row.value.slice(0, valueWidth);
        return (
          <Text key={row.id}>
            {isSelected
              ? fg("accent", `${cursor}${label}  ${value}`)
              : `${cursor}${fg("text", label)}  ${fg("muted", value)}`}
          </Text>
        );
      })}
      {start > 0 || end < settings.length ? (
        <Text>{fg("dim", `  (${selected + 1}/${settings.length})`)}</Text>
      ) : null}
      {selectedRow?.description ? (
        <>
          <Text> </Text>
          <Text>{fg("muted", `  ${selectedRow.description}`)}</Text>
        </>
      ) : null}
      <Text> </Text>
      <Text>{fg("dim", "  Enter để đổi · Esc để đóng")}</Text>
      <DynamicBorder />
    </Box>
  );
};
