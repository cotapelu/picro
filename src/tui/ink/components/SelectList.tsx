// SelectList - danh sách mục chọn một
// Bắt chước nguyên tắc pi-tui components/select-list.ts:
//   - Mục được chọn có tiền tố "→ ", mục khác "  "
//   - Cửa sổ cuộn cân trên mục chọn, giới hạn maxVisible
//   - Phân cột nhãn bên trái, mô tả bên phải khi đủ rộng
//   - Chỉ báo (i/n) khi vượt khung nhìn
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme.js";

export interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

export interface SelectListProps {
  items: SelectItem[];
  /** Số mục hiển thị đồng thời. */
  maxVisible?: number;
  /** Mục được chọn sẵn theo value. */
  initialValue?: string;
  /** Hiện mô tả ở cột phải (bị tắt khi terminal hẹp). */
  showDescription?: boolean;
  onSelect?: (item: SelectItem) => void;
  onCancel?: () => void;
  onHighlight?: (item: SelectItem) => void;
  width?: number;
}

const PRIMARY_MIN = 16;
const PRIMARY_MAX = 32;
const COLUMN_GAP = 2;
const MIN_DESC_WIDTH = 10;

/** Cắt chuỗi theo số cột hiển thị, bỏ qua ANSI. */
function clip(text: string, width: number): string {
  if (width <= 0) return "";
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return text;
  return text.slice(0, Math.max(0, width - 1));
}

/** Bề rộng cột nhãn: vừa với nhãn dài nhất, kẹp trong [min,max]. */
function primaryColumnWidth(items: SelectItem[], totalWidth: number): number {
  const widest = items.reduce((max, item) => Math.max(max, item.label.length), 0) + COLUMN_GAP;
  const min = PRIMARY_MIN;
  const max = PRIMARY_MAX;
  return Math.max(min, Math.min(max, widest));
}

export const SelectList: React.FC<SelectListProps> = ({
  items,
  maxVisible = 8,
  initialValue,
  showDescription = true,
  onSelect,
  onCancel,
  onHighlight,
  width = 80,
}) => {
  const initialIndex = useMemo(() => {
    if (initialValue === undefined) return 0;
    const found = items.findIndex((item) => item.value === initialValue);
    return found >= 0 ? found : 0;
  }, [items, initialValue]);

  const [selected, setSelected] = useState(initialIndex);

  useEffect(() => {
    if (selected >= items.length) setSelected(Math.max(0, items.length - 1));
  }, [selected, items.length]);

  useEffect(() => {
    onHighlight?.(items[selected]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items]);

  // Điều hướng: chỉ một component nhận useInput (Input) nên danh sách này
  // nhận điều khiển qua props từ cha khi đang ở chế độ chọn.
  if (items.length === 0) {
    return <Text>{fg("muted", "  Không có mục nào")}</Text>;
  }

  const start = Math.max(
    0,
    Math.min(selected - Math.floor(maxVisible / 2), items.length - maxVisible),
  );
  const end = Math.min(start + maxVisible, items.length);
  const useColumns = showDescription && width > 40 && items.some((i) => i.description);
  const columnWidth = useColumns ? primaryColumnWidth(items, width) : 0;

  return (
    <Box flexDirection="column">
      {items.slice(start, end).map((item, offset) => {
        const index = start + offset;
        const isSelected = index === selected;
        const prefix = isSelected ? fg("accent", "→ ") : "  ";

        const label = useColumns
          ? clip(item.label, columnWidth - COLUMN_GAP).padEnd(columnWidth - COLUMN_GAP, " ")
          : clip(item.label, width - 2);

        if (useColumns && item.description) {
          const descStart = prefix.length + columnWidth;
          const descWidth = Math.max(MIN_DESC_WIDTH, width - descStart - 2);
          const desc = clip(item.description, descWidth);
          return (
            <Text key={item.value}>
              {isSelected
                ? fg("accent", `${prefix}${label}${desc}`)
                : `${prefix}${label}${fg("muted", desc)}`}
            </Text>
          );
        }

        return (
          <Text key={item.value}>
            {isSelected ? fg("accent", `${prefix}${label}`) : `${prefix}${label}`}
          </Text>
        );
      })}
      {start > 0 || end < items.length ? (
        <Text>{fg("muted", `  (${selected + 1}/${items.length})`)}</Text>
      ) : null}
    </Box>
  );
};
