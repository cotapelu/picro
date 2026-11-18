// SettingsSelector - bảng cài đặt
// Bắt chước nguyên tắc pi-mono components/settings-selector.ts:
//   - Nhãn canh lề trái, giá trị canh phải theo chiều rộng nhãn dài nhất
//   - Mô tả hiện ở dòng dưới mục được chọn
//   - Enter/Space đổi giá trị hoặc mở submenu; Esc thoát
//   - ~40 cài đặt như pi-mono
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo, useState, useCallback } from "react";
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

/**
 * Danh sách cài đặt đầy đủ (~40 mục) như pi-mono SettingsList.
 * Hàm này tạo ra danh sách SettingRow từ SettingsManager.
 */
export function buildFullSettingsList(settingsManager: any): SettingRow[] {
  const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  const boolValues = ['tắt', 'bật'];

  const pick = (fn: (() => unknown) | undefined, fallback: string | boolean | number): string => {
    try {
      const value = fn?.();
      if (value === undefined || value === null || value === '') return String(fallback);
      return String(value);
    } catch {
      return String(fallback);
    }
  };

  const on = (value: string | boolean): boolean =>
    value === 'bật' || value === 'true' || value === 'on' || value === true;

  const rows: SettingRow[] = [
    { id: 'theme', label: 'Chủ đề', value: pick(settingsManager.getTheme, 'dark'), description: 'Màu của transcript và viền', values: ['dark', 'light'] },
    { id: 'defaultThinkingLevel', label: 'Cấp độ suy nghĩ mặc định', value: pick(settingsManager.getDefaultThinkingLevel, 'off'), description: 'Mức suy luận cho mô hình mới', values: levels },
    { id: 'hideThinkingBlock', label: 'Ẩn khối thinking', value: on(pick(settingsManager.getHideThinkingBlock, false)) ? 'bật' : 'tắt', description: 'Thu gọn toàn bộ reasoning khi hiện', values: boolValues },
    { id: 'defaultProvider', label: 'Provider mặc định', value: pick(settingsManager.getDefaultProvider, '(theo cấu hình)'), description: 'Nhà cung cấp mô hình mặc định' },
    { id: 'defaultModel', label: 'Model mặc định', value: pick(settingsManager.getDefaultModel, '(theo cấu hình)'), description: 'Mô hình mặc định' },
    { id: 'steeringMode', label: 'Chế độ steer', value: pick(settingsManager.getSteeringMode, 'all'), description: 'Đưa tin nhắn vào giữa lượt', values: ['all', 'one-at-a-time'] },
    { id: 'followUpMode', label: 'Chế độ follow-up', value: pick(settingsManager.getFollowUpMode, 'all'), description: 'Tin nhắn xếp hàng sau lượt', values: ['all', 'one-at-a-time'] },
    { id: 'compactionEnabled', label: 'Tự động nén ngữ cảnh', value: on(pick(settingsManager.getCompactionEnabled, true)) ? 'bật' : 'tắt', description: 'Nén ngữ cảnh khi vượt ngưỡng', values: boolValues },
    { id: 'retryEnabled', label: 'Tự động thử lại', value: on(pick(settingsManager.getRetryEnabled, true)) ? 'bật' : 'tắt', description: 'Thử lại khi lỗi tạm thời', values: boolValues },
    { id: 'showImages', label: 'Hiện ảnh trong kết quả tool', value: on(pick(settingsManager.getShowImages, true)) ? 'bật' : 'tắt', description: 'Hiển thị ảnh từ tool output', values: boolValues },
    { id: 'showTerminalProgress', label: 'Thanh tiến độ terminal', value: on(pick(settingsManager.getShowTerminalProgress, true)) ? 'bật' : 'tắt', description: 'Hiện thanh tiến độ khi chạy lệnh', values: boolValues },
    { id: 'quietStartup', label: 'Khởi động im lặng', value: on(pick(settingsManager.getQuietStartup, false)) ? 'bật' : 'tắt', description: 'Không hiển thị thông báo khởi động', values: boolValues },
    { id: 'doubleEscapeAction', label: 'Nhấn Esc 2 lần', value: pick(settingsManager.getDoubleEscapeAction, 'tree'), description: 'Ô nhập rỗng: mở cây phiên hoặc fork', values: ['tree', 'fork', 'none'] },
    { id: 'editorPaddingX', label: 'Đệm ngang ô nhập', value: String(pick(settingsManager.getEditorPaddingX, 1)), description: 'Số cột đệm hai bên ô nhập' },
    { id: 'autocompleteMaxVisible', label: 'Số dòng gợi ý tối đa', value: String(pick(settingsManager.getAutocompleteMaxVisible, 8)), description: 'Giới hạn dòng trong menu gợi ý' },
    { id: 'autocompleteProvider', label: 'Nguồn gợi ý đường dẫn', value: pick(settingsManager.getAutocompleteProvider, 'fd'), description: 'Công cụ tìm đường dẫn (fd/find)' },
    { id: 'shellPath', label: 'Đường dẫn shell', value: pick(settingsManager.getShellPath, '(mặc định)'), description: 'Shell dùng cho lệnh !' },
    { id: 'shellCommandPrefix', label: 'Tiền tố lệnh shell', value: pick(settingsManager.getShellCommandPrefix, '(không)'), description: 'Tiền tố thêm vào lệnh bash' },
    { id: 'enableSkillCommands', label: 'Bật lệnh skill', value: on(pick(settingsManager.getEnableSkillCommands, true)) ? 'bật' : 'tắt', description: 'Cho phép lệnh /skill:*', values: boolValues },
    { id: 'transport', label: 'Transport', value: pick(settingsManager.getTransport, 'sse'), description: 'Giao thức truyền dữ liệu', values: ['sse', 'websocket', 'polling'] },
    { id: 'imageWidthCells', label: 'Chiều rộng ảnh (cells)', value: String(pick(settingsManager.getImageWidthCells, 60)), description: 'Chiều rộng tối đa ảnh hiển thị' },
    { id: 'clearOnShrink', label: 'Xóa màn hình khi thu nhỏ', value: on(pick(settingsManager.getClearOnShrink, true)) ? 'bật' : 'tắt', description: 'Xóa nội dung khi terminal thu nhỏ', values: boolValues },
    { id: 'showHardwareCursor', label: 'Con trỏ phần cứng', value: on(pick(settingsManager.getShowHardwareCursor, false)) ? 'bật' : 'tắt', description: 'Hiện con trỏ terminal thật', values: boolValues },
    { id: 'outputPad', label: 'Đệm ngang output', value: String(pick(settingsManager.getOutputPad, 1)), description: 'Số cột đệm cho tool/bash output' },
    { id: 'fullscreenCopyOnSelect', label: 'Copy khi chọn (fullscreen)', value: on(pick(settingsManager.getFullscreenCopyOnSelect, true)) ? 'bật' : 'tắt', description: 'Tự copy text khi chọn chuột', values: boolValues },
    { id: 'fullscreenWheelScrollLines', label: 'Cuộn chuột (fullscreen)', value: String(pick(settingsManager.getFullscreenWheelScrollLines, 1)), description: 'Số dòng cuộn mỗi nháy chuột' },
    { id: 'fullscreenScrollbar', label: 'Thanh cuộn (fullscreen)', value: on(pick(settingsManager.getFullscreenScrollbar, true)) ? 'bật' : 'tắt', description: 'Hiện thanh cuộn dọc', values: boolValues },
    { id: 'collapseChangelog', label: 'Thu gọn changelog', value: on(pick(settingsManager.getCollapseChangelog, true)) ? 'bật' : 'tắt', description: 'Chỉ hiện bản tóm tắt changelog', values: boolValues },
    { id: 'terminalCapabilityOverrides', label: 'Ghi đè khả năng terminal', value: pick(settingsManager.getTerminalCapabilityOverrides, '{}'), description: 'JSON ghi đè colors/images/links' },
  ];
  return rows;
}

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

  const handleKey = useCallback((input: string, key: any) => {
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
  }, [selected, settings, onChange, onCancel]);

  useInput(handleKey);

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
      <Text>{fg("dim", "  Enter/Space để đổi · Esc để đóng")}</Text>
      <DynamicBorder />
    </Box>
  );
};

export interface SettingsSelectorProps {
  settings: SettingRow[];
  onChange: (id: string, value: string) => void;
  onCancel: () => void;
  width?: number;
}

export default SettingsSelector;