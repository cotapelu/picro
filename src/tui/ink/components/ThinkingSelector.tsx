// ThinkingSelector - chọn cấp độ suy nghĩ
// Bắt chước nguyên tắc pi-mono components/thinking-selector.ts:
//   - Danh sách cấp độ kèm mô tả, đánh dấu cấp hiện tại bằng "✓"
//   - Ô tìm kiếm lọc mờ
//   - Enter chọn; phím riêng đặt làm mặc định; Esc hủy
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { SelectList } from "./SelectList.js";
import { TextInput } from "./TextInput.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
import { matchesKey } from "../core/Keys.js";

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  off: "Không suy luận",
  minimal: "Suy luận rất ngắn (~1k token)",
  low: "Suy luận nhẹ (~2k token)",
  medium: "Suy luận vừa (~8k token)",
  high: "Suy luận sâu (~16k token)",
  xhigh: "Suy luận rất sâu (~32k token)",
  max: "Suy luận tối đa",
};

export interface ThinkingSelectorProps {
  currentLevel: string;
  availableLevels: string[];
  onSelect: (level: string) => void;
  onCancel: () => void;
  onSelectAsDefault?: (level: string) => void;
  defaultLevel?: string;
  width?: number;
}

export const ThinkingSelector: React.FC<ThinkingSelectorProps> = ({
  currentLevel,
  availableLevels,
  onSelect,
  onCancel,
  onSelectAsDefault,
  defaultLevel,
  width = 80,
}) => {
  const t = getTheme();
  const [query, setQuery] = useState("");

  const allItems = useMemo(
    () =>
      availableLevels.map((level) => ({
        value: level,
        label: `${level === currentLevel ? "✓ " : "  "}${level}`,
        description:
          level === defaultLevel ? `${LEVEL_DESCRIPTIONS[level] ?? ""} · mặc định` : (LEVEL_DESCRIPTIONS[level] ?? ""),
      })),
    [availableLevels, currentLevel, defaultLevel],
  );

  const filtered = useMemo(
    () => (query.trim() ? fuzzyFilter(allItems, query, (item) => `${item.value} ${item.description ?? ""}`) : allItems),
    [allItems, query],
  );

  useInput((data, key) => {
    // Ctrl+S đặt làm mặc định.
    if (key.ctrl && data === "s" && onSelectAsDefault) {
      const selected = filtered.find((item) => item.value === currentLevel) ?? filtered[0];
      if (selected) onSelectAsDefault(selected.value);
      return;
    }
    if (matchesKey(data, "escape")) {
      onCancel();
      return;
    }
    if (key.return) {
      const selected = filtered[0];
      if (selected) onSelect(selected.value);
      return;
    }
  });

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "Cấp độ suy nghĩ")}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm cấp độ…" onChange={setQuery} />
      <Text> </Text>
      <SelectList
        items={filtered}
        initialValue={currentLevel}
        onSelect={(item) => onSelect(item.value)}
        onCancel={onCancel}
        width={width}
      />
      <Text> </Text>
      <Text>
        {t.fg("dim", "  Enter để chọn")}
        {onSelectAsDefault ? t.fg("dim", " · Ctrl+S đặt mặc định") : ""}
        {t.fg("dim", " · Esc để hủy")}
      </Text>
      <DynamicBorder />
    </Box>
  );
};
