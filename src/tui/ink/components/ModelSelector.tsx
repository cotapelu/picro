// ModelSelector - chọn mô hình
// Bắt chước nguyên tắc pi-mono components/model-selector.ts:
//   - Ô tìm kiếm phía trên danh sách
//   - Danh sách mô hình kèm nhà cung cấp, mục hiện tại đánh dấu "✓"
//   - Lọc mờ theo id/tên/nhà cung cấp
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";

export interface ModelItem {
  id: string;
  provider: string;
  name?: string;
}

export interface ModelSelectorProps {
  models: ModelItem[];
  currentModel?: string;
  onSelect: (model: ModelItem) => void;
  onCancel: () => void;
  /** Đặt làm mô hình mặc định (thay vì chỉ phiên hiện tại). */
  onSelectAsDefault?: (model: ModelItem) => void;
  width?: number;
}

const MAX_VISIBLE = 10;

/** Lọc mờ: mọi ký tự của truy vấn xuất hiện theo thứ tự. */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q.length === 0) return true;
  let pos = 0;
  for (const ch of q) {
    pos = t.indexOf(ch, pos);
    if (pos === -1) return false;
    pos += 1;
  }
  return true;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  currentModel,
  onSelect,
  onCancel,
  onSelectAsDefault,
  width = 80,
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const filtered = useMemo(
    () =>
      models.filter((m) =>
        fuzzyMatch(query, `${m.id} ${m.name ?? ""} ${m.provider}`),
      ),
    [models, query],
  );

  const list = filtered.length > 0 ? filtered : models;
  const clamped = Math.min(selected, list.length - 1);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((i) => (i <= 0 ? list.length - 1 : i - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((i) => (i >= list.length - 1 ? 0 : i + 1));
      return;
    }
    if (key.return) {
      const model = list[clamped];
      if (model) onSelect(model);
      return;
    }
    if (key.ctrl && input === "\u0003") return;
    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onCancel();
      return;
    }
    if (key.backspace) {
      setQuery((q) => q.slice(0, -1));
      return;
    }
    if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
      setQuery((q) => q + input);
    }
  });

  const start = Math.max(0, Math.min(clamped - Math.floor(MAX_VISIBLE / 2), list.length - MAX_VISIBLE));
  const end = Math.min(start + MAX_VISIBLE, list.length);
  const visible = list.slice(start, end);
  const active = list[clamped];

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", "Chọn mô hình")}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm mô hình…" onChange={setQuery} />
      <Text> </Text>
      {visible.map((model, offset) => {
        const index = start + offset;
        const isSelected = index === clamped;
        const isCurrent = model.id === currentModel;
        const mark = isCurrent ? fg("success", "✓ ") : "  ";
        const cursor = isSelected ? fg("accent", "→ ") : "  ";
        const label = `${model.id}${model.name ? ` (${model.name})` : ""}`;
        const badge = fg("dim", ` [${model.provider}]`);
        return (
          <Text key={`${model.provider}/${model.id}`}>
            {isSelected ? fg("accent", `${cursor}${mark}${label}${badge}`) : `${cursor}${mark}${label}${badge}`}
          </Text>
        );
      })}
      {list.length === 0 ? <Text>{fg("muted", "  Không có mô hình")}</Text> : null}
      {start > 0 || end < list.length ? (
        <Text>{fg("dim", `  (${clamped + 1}/${list.length})`)}</Text>
      ) : null}
      {active ? (
        <>
          <Text> </Text>
          <Text>{fg("muted", `  ${active.name ?? active.id}`)}</Text>
        </>
      ) : null}
      <Text> </Text>
      <Text>
        {fg("dim", "  Enter để chọn")}
        {onSelectAsDefault ? fg("dim", " · Ctrl+S đặt mặc định") : ""}
        {fg("dim", " · Esc để hủy")}
      </Text>
      <DynamicBorder />
    </Box>
  );
};
