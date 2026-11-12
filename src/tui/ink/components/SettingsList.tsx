// SettingsList - bảng cài đặt kiểu pi-tui SettingsList
// Bắt chước nguyên tắc pi-tui components/settings-list.ts:
//   - Mỗi dòng: nhãn canh lề theo nhãn dài nhất, giá trị canh phải
//   - Enter/Space đổi giá trị xoay vòng hoặc mở submenu
//   - Mô tả mục được chọn hiện dưới danh sách
//   - Cửa sổ cuộn cân trên mục chọn, chỉ báo (i/n)
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
import { matchesKey } from "../core/Keys.js";
import { getKeybindings } from "../core/Keybindings.js";
import type { SelectItem } from "./SelectList.js";
import { SelectList } from "./SelectList.js";
import { TextInput } from "./TextInput.js";
import { nextCycleValue } from "./settings-cycle.js";
import { selectWindow } from "../core/select-window.js";

export interface SettingItem {
  /** Định danh cài đặt. */
  id: string;
  /** Nhãn hiển thị bên trái. */
  label: string;
  /** Mô tả hiện khi mục được chọn. */
  description?: string;
  /** Giá trị hiện tại hiện bên phải. */
  currentValue: string;
  /** Nếu có, Enter xoay vòng qua các giá trị này. */
  values?: string[];
  /** Nếu có, Enter mở submenu; nhận giá trị hiện tại và callback hoàn tất. */
  submenu?: (
    currentValue: string,
    done: (selectedValue?: string, options?: { navigateTo?: string }) => void,
  ) => React.ReactNode;
}

export interface SettingsListTheme {
  label: (text: string, selected: boolean) => string;
  value: (text: string, selected: boolean) => string;
  description: (text: string) => string;
  cursor: string;
  hint: (text: string) => string;
}

export interface SettingsListProps {
  items: SettingItem[];
  theme?: SettingsListTheme;
  maxVisible?: number;
  onChange: (id: string, newValue: string) => void;
  onCancel: () => void;
  enableSearch?: boolean;
  width?: number;
}

const defaultTheme: SettingsListTheme = {
  label: (text, selected) => (selected ? fg("accent", text) : fg("text", text)),
  value: (text, selected) => (selected ? fg("accent", text) : fg("muted", text)),
  description: (text) => fg("muted", text),
  cursor: "› ",
  hint: (text) => fg("dim", text),
};

export const SettingsList: React.FC<SettingsListProps> = ({
  items,
  theme = defaultTheme,
  maxVisible = 10,
  onChange,
  onCancel,
  enableSearch = false,
  width = 80,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [submenuValue, setSubmenuValue] = useState<string | null>(null);
  const kb = getKeybindings();

  const maxLabelWidth = useMemo(
    () => Math.min(36, Math.max(...items.map((i) => i.label.length), 1)),
    [items],
  );

  // Derived, not stored: the list used to be snapshotted into state once, so a
  // parent that re-rendered with new items (a changed value, a settings reload)
  // was ignored and the UI kept showing stale rows and stale values.
  const display = useMemo(() => {
    const query = search.trim();
    if (!query) return items;
    return fuzzyFilter(items, query, (item) => `${item.label} ${item.description ?? ""}`);
  }, [items, search]);

  const window = selectWindow(selectedIndex, display.length, maxVisible);
  const clamped = window.clamped;
  const selected = display[clamped];

  // Keep the stored index inside the current list (see core/select-window.ts).
  useEffect(() => {
    if (clamped >= 0 && clamped !== selectedIndex) setSelectedIndex(clamped);
  }, [clamped, selectedIndex]);

  useInput((data, key) => {
    if (submenuValue !== null) {
      // Submenu tự lo phím của nó qua SelectList.
      return;
    }
    if (kb.matches(data, "tui.select.up")) {
      setSelectedIndex((i) => (i <= 0 ? Math.max(0, display.length - 1) : i - 1));
      return;
    }
    if (kb.matches(data, "tui.select.down")) {
      setSelectedIndex((i) => (i >= display.length - 1 ? 0 : i + 1));
      return;
    }
    if (matchesKey(data, "escape")) {
      // Clearing the query is enough: the list is derived from it.
      if (search) {
        setSearch("");
        return;
      }
      onCancel();
      return;
    }
    if (data === " " || kb.matches(data, "tui.select.confirm")) {
      const item = display[clamped];
      if (!item) return;
      if (item.values && item.values.length > 0) {
        onChange(item.id, nextCycleValue(item.values, item.currentValue));
        return;
      }
      if (item.submenu) {
        setSubmenuValue(item.currentValue);
        return;
      }
      return;
    }
    if (enableSearch && data.length >= 1 && !key.ctrl && data.charCodeAt(0) >= 32) {
      setSearch(search + data);
    }
    if (enableSearch && key.backspace) {
      setSearch(search.slice(0, -1));
    }
  });

  const { start, end } = window;
  const visible = display.slice(start, end);

  const renderSubmenu = (): React.ReactNode => {
    const item = display[clamped];
    if (!item?.submenu) {
      setSubmenuValue(null);
      return null;
    }
    const options: SelectItem[] = (item.values ?? [item.currentValue]).map((v) => ({ value: v, label: v }));
    return (
      <SelectList
        items={options}
        initialValue={item.currentValue}
        onSelect={(picked) => {
          onChange(item.id, picked.value);
          setSubmenuValue(null);
        }}
        onCancel={() => setSubmenuValue(null)}
        width={width}
      />
    );
  };

  return (
    <Box flexDirection="column" width={width}>
      {enableSearch ? (
        <>
          <TextInput value={search} placeholder="Tìm cài đặt…" onChange={setSearch} />
          <Text> </Text>
        </>
      ) : null}
      {submenuValue !== null ? (
        renderSubmenu()
      ) : (
        <>
          {visible.map((item, offset) => {
            const index = start + offset;
            const isSelected = index === clamped;
            const cursor = isSelected ? theme.cursor : "  ";
            const labelPadded = item.label.padEnd(maxLabelWidth, " ");
            const valueMax = Math.max(4, width - maxLabelWidth - 6);
            const value = item.currentValue.slice(0, valueMax);
            return (
              <Text key={item.id}>
                {`${cursor}${theme.label(labelPadded, isSelected)}  ${theme.value(value, isSelected)}`}
              </Text>
            );
          })}
          {display.length === 0 ? <Text>{theme.hint("  Không có cài đặt")}</Text> : null}
          {start > 0 || end < display.length ? (
            <Text>{theme.hint(`  (${clamped + 1}/${display.length})`)}</Text>
          ) : null}
          {selected?.description ? (
            <>
              <Text> </Text>
              <Text>{theme.description(`  ${selected.description}`)}</Text>
            </>
          ) : null}
          <Text> </Text>
          <Text>{theme.hint("  Enter/Space để đổi · Esc để đóng")}</Text>
        </>
      )}
    </Box>
  );
};
