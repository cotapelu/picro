// FirstTimeSetup - hộp thoại chào mừng lần đầu chạy
// Bắt chước nguyên tắc pi-mono components/first-time-setup.ts:
//   - Bước 1: chọn chủ đề (System/Dark/Light) kèm xem trước
//   - Bước 2: opt-in chia sẻ dữ liệu ẩn danh
//   - Dựng lại toàn bộ hộp thoại mỗi lần đổi để xem trước màu
//   - Esc để bỏ qua cả thiết lập
// Port sang Ink TSX, khon copy code truc iep.

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/theme.js";
import { DynamicBorder } from "../../../tui/ink/components/DynamicBorder.js";

const THEME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "system", label: "System (theo màu terminal)" },
  { value: "dark", label: "Tối" },
  { value: "light", label: "Sáng" },
];

const ANALYTICS_OPTIONS: Array<{ value: boolean; label: string }> = [
  { value: true, label: "Chia sẻ dữ liệu ẩn danh" },
  { value: false, label: "Không chia sẻ" },
];

export interface FirstTimeSetupResult {
  theme: string;
  shareAnalytics: boolean;
}

export interface FirstTimeSetupProps {
  onThemePreview: (themeName: string) => void;
  onSubmit: (result: FirstTimeSetupResult) => void;
  onCancel: () => void;
  width?: number;
}

export const FirstTimeSetup: React.FC<FirstTimeSetupProps> = ({
  onThemePreview,
  onSubmit,
  onCancel,
  width = 80,
}) => {
  const t = getTheme();
  const [step, setStep] = useState<"theme" | "analytics">("theme");
  const [themeIndex, setThemeIndex] = useState(0);
  const [analyticsIndex, setAnalyticsIndex] = useState(0);

  const move = (delta: number) => {
    if (step === "theme") {
      const next = Math.max(0, Math.min(THEME_OPTIONS.length - 1, themeIndex + delta));
      if (next !== themeIndex) {
        setThemeIndex(next);
        onThemePreview(THEME_OPTIONS[next]!.value);
      }
    } else {
      setAnalyticsIndex((i) => Math.max(0, Math.min(ANALYTICS_OPTIONS.length - 1, i + delta)));
    }
  };

  const optionList = (labels: string[], index: number) =>
    labels.map((label, i) => {
      const isSelected = i === index;
      return (
        <Text key={`${i}-${label}`}>
          {isSelected ? `${t.fg("accent", "→ ")}${t.fg("accent", label)}` : `  ${t.fg("text", label)}`}
        </Text>
      );
    });

  useInput((data, key) => {
    if (matchesEscape(data, key)) {
      onCancel();
      return;
    }
    if (key.return || data === "\n") {
      if (step === "theme") {
        setStep("analytics");
      } else {
        onSubmit({
          theme: THEME_OPTIONS[themeIndex]!.value,
          shareAnalytics: ANALYTICS_OPTIONS[analyticsIndex]!.value,
        });
      }
      return;
    }
    if (key.upArrow || data === "k") move(-1);
    if (key.downArrow || data === "j") move(1);
  });

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "Chào mừng dùng picro, trợ lý lập trình tối giản.")}</Text>
      <Text> </Text>
      {step === "theme" ? (
        <>
          <Text>{t.fg("text", "Chọn chủ đề.")}</Text>
          <Text> </Text>
          {optionList(THEME_OPTIONS.map((o) => o.label), themeIndex)}
        </>
      ) : (
        <>
          <Text>{t.fg("text", "Có muốn chia sẻ dữ liệu ẩn danh không?")}</Text>
          <Text>{t.fg("muted", "Bật chia sẻ sẽ lưu một mã định danh trong settings.json và gửi thống kê ẩn danh. Bạn có thể tắt lại bất cứ lúc trong settings.json.")}</Text>
          <Text> </Text>
          {optionList(ANALYTICS_OPTIONS.map((o) => o.label), analyticsIndex)}
        </>
      )}
      <Text> </Text>
      <Text>{t.fg("dim", step === "theme" ? "  ↑↓ chọn · Enter tiếp tục · Esc bỏ qua" : "  ↑↓ chọn · Enter hoàn tất · Esc bỏ qua")}</Text>
      <DynamicBorder />
    </Box>
  );
};

function matchesEscape(data: string, key: { ctrl?: boolean; meta?: boolean }): boolean {
  return data === "\u001b" && !key.ctrl && !key.meta;
}
