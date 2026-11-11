// RadiusLoginSelector - menu /login với phương án Radius hoạt hình
// Bắt chước nguyên tắc pi-mono components/radius-login-selector.ts:
//   - Mượn danh sách của ExtensionSelector
//   - Thay dòng Radius đang chọn bằng chữ chảy màu logo
//   - Khi kiểu dòng thay đổi hoặc nhãn wrap, so khớp thất bại thì hiện bình thường
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { radiusShimmer, startBrandAnimation } from "./provider-brand.js";
import { CountdownTimer } from "./CountdownTimer.js";

export interface RadiusOption {
  label: string;
  /** Phần chữ cần chảy màu (đầu của label). */
  text: string;
}

export interface RadiusLoginSelectorProps {
  title: string;
  options: string[];
  radiusOption?: RadiusOption;
  onSelect: (option: string) => void;
  onCancel: () => void;
  timeout?: number;
  width?: number;
}

const MAX_VISIBLE = 10;

export const RadiusLoginSelector: React.FC<RadiusLoginSelectorProps> = ({
  title,
  options,
  radiusOption,
  onSelect,
  onCancel,
  timeout,
  width = 80,
}) => {
  const t = getTheme();
  const [selected, setSelected] = useState(0);
  const [now, setNow] = useState(0);

  // Hoạt hình 50ms/lần chỉ khi mục Radius đang được chọn.
  useMemo(() => {
    if (radiusOption && options[selected] === radiusOption.label) {
      const stop = startBrandAnimation(() => setNow(Date.now()), () => options[selected] === radiusOption.label);
      return () => stop();
    }
    return undefined;
  }, [selected, options, radiusOption]);

  useInput((data, key) => {
    if (matchesEscape(data, key)) {
      onCancel();
      return;
    }
    if (key.return) {
      const option = options[selected];
      if (option) onSelect(option);
      return;
    }
    if (key.upArrow || data === "k") setSelected((i) => Math.max(0, i - 1));
    if (key.downArrow || data === "j") setSelected((i) => Math.min(options.length - 1, i + 1));
  });

  const start = Math.max(
    0,
    Math.min(selected - Math.floor(MAX_VISIBLE / 2), options.length - MAX_VISIBLE),
  );
  const visible = options.slice(start, start + MAX_VISIBLE);

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", title)}</Text>
      <Text> </Text>
      {visible.map((option, offset) => {
        const index = start + offset;
        const isSelected = index === selected;
        const isRadius = radiusOption !== undefined && option === radiusOption.label;
        const text = isSelected && isRadius && radiusOption
          ? `${t.fg("accent", "→ ")}${radiusShimmer(radiusOption.text, now)}${option.slice(radiusOption.text.length)}`
          : isSelected
            ? `${t.fg("accent", "→ ")}${t.fg("accent", option)}`
            : `  ${t.fg("text", option)}`;
        return <Text key={`${index}-${option}`}>{text}</Text>;
      })}
      {start > 0 || visible.length < options.length ? (
        <Text>{t.fg("muted", `  (${selected + 1}/${options.length})`)}</Text>
      ) : null}
      {timeout && timeout > 0 ? (
        <CountdownTimer durationMs={timeout} onTimeout={onCancel} label="tự đóng sau" />
      ) : null}
      <Text> </Text>
      <Text>{t.fg("dim", "  ↑↓ chọn · Enter xác nhận · Esc hủy")}</Text>
      <DynamicBorder />
    </Box>
  );
};

function matchesEscape(data: string, key: { ctrl?: boolean; meta?: boolean }): boolean {
  return data === "\u001b" && !key.ctrl && !key.meta;
}

export function createLoginMenuSelector(props: RadiusLoginSelectorProps): React.ReactElement {
  return <RadiusLoginSelector {...props} />;
}
