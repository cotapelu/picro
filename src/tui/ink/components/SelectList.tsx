// SelectList - danh sách mục chọn một
// Bắt chước nguyên tắc pi-tui components/select-list.ts:
//   - Mục được chọn có tiền tố "→ ", mục khác "  "
//   - Cửa sổ cuộn cân trên mục chọn, giới hạn maxVisible
//   - Phân cột nhãn bên trái, mô tả bên phải khi đủ rộng
//   - Chỉ báo (i/n) khi vượt khung nhìn
//   - Keyboard navigation (Up/Down wrap, PageUp/PageDown, Enter, Escape)
//   - Mouse click handling
//   - Focusable interface với capturesViewportInput
// Port sang Ink TSX, không copy code trực tiếp.

import React, { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg } from "../theme/index.js";
import { truncateToWidth, visibleWidth } from "../core/TerminalText.js";
import { matchesKey, decodePrintableKey } from "../core/Keys.js";
import { getKeybindings } from "../core/Keybindings.js";
import { Focusable, Component, TuiMouseEvent, TuiMouseEventResult } from "../core/TuiTypes.js";

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
  return truncateToWidth(text, Math.max(0, width), "", false);
}

/** Bề rộng cột nhãn: vừa với nhãn dài nhất, kẹp trong [min,max]. */
function primaryColumnWidth(items: SelectItem[], totalWidth: number): number {
  const widest = items.reduce((max, item) => Math.max(max, visibleWidth(item.label)), 0) + COLUMN_GAP;
  const min = PRIMARY_MIN;
  const max = PRIMARY_MAX;
  return Math.max(min, Math.min(max, widest));
}

interface SelectListHandle extends Focusable {
  selectItem(value: string): void;
  cancel(): void;
  getSelectedItem(): SelectItem | undefined;
}

/**
 * SelectList - single-select list with keyboard, mouse, and focus support.
 */
const SelectList = forwardRef<SelectListHandle, SelectListProps>(
  (
    {
      items,
      maxVisible = 8,
      initialValue,
      showDescription = true,
      onSelect,
      onCancel,
      onHighlight,
      width = 80,
    },
    ref,
  ) => {
    const initialIndex = useMemo(() => {
      if (initialValue === undefined) return 0;
      const found = items.findIndex((item) => item.value === initialValue);
      return found >= 0 ? found : 0;
    }, [items, initialValue]);

    const [selected, setSelected] = useState(initialIndex);
    const kb = getKeybindings();
    const focusedRef = useRef(false);

    useEffect(() => {
      if (selected >= items.length) setSelected(Math.max(0, items.length - 1));
    }, [selected, items.length]);

    useEffect(() => {
      const highlighted = items[selected];
      if (highlighted) onHighlight?.(highlighted);
    }, [selected, items]);

    // Keyboard navigation
    const handleKey = (data: string, key: any) => {
      if (items.length === 0) return false;

      if (matchesKey(data, "tui.select.up") || (key.upArrow && !key.ctrl)) {
        setSelected((i) => (i <= 0 ? items.length - 1 : i - 1));
        return true;
      }
      if (matchesKey(data, "tui.select.down") || (key.downArrow && !key.ctrl)) {
        setSelected((i) => (i >= items.length - 1 ? 0 : i + 1));
        return true;
      }
      if (matchesKey(data, "tui.select.pageUp")) {
        setSelected((i) => Math.max(0, i - maxVisible));
        return true;
      }
      if (matchesKey(data, "tui.select.pageDown")) {
        setSelected((i) => Math.min(items.length - 1, i + maxVisible));
        return true;
      }
      if (matchesKey(data, "tui.select.confirm") || matchesKey(data, "tui.input.submit")) {
        const item = items[selected];
        if (item) onSelect?.(item);
        return true;
      }
      if (matchesKey(data, "tui.select.cancel") || matchesKey(data, "escape")) {
        onCancel?.();
        return true;
      }
      if (matchesKey(data, "tui.select.first")) {
        setSelected(0);
        return true;
      }
      if (matchesKey(data, "tui.select.last")) {
        setSelected(items.length - 1);
        return true;
      }
      return false;
    };

    useInput(handleKey);

    // Focusable interface
    useImperativeHandle(
      ref,
      () => ({
        get focused() {
          return focusedRef.current;
        },
        set focused(value: boolean) {
          focusedRef.current = value;
        },
        get capturesViewportInput() {
          return focusedRef.current;
        },
        selectItem(value: string) {
          const idx = items.findIndex((i) => i.value === value);
          if (idx >= 0) setSelected(idx);
        },
        cancel() {
          onCancel?.();
        },
        getSelectedItem() {
          return items[selected];
        },
      }),
      [items, selected],
    );

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
  }
);

export { SelectList };