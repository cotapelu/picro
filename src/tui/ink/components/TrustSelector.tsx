// TrustSelector - quyết định tin tưởng dự án
// Bắt chước nguyên tắc pi-mono components/trust-selector.ts:
//   - Liệt kê các phương án (tin tưởng / không, kèm đường dẫn lưu)
//   - Hiện quyết định đã lưu và trạng thái phiên hiện tại
//   - Phương án trùng quyết định đã lưu được đánh dấu "✓"
// Port sang Ink TSX, khon copy code truc iep.

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";

export interface ProjectTrustOption {
  label: string;
  trusted: boolean;
  /** Đường dẫn lưu quyết định (vd thư mục dự án). */
  savedPath?: string;
  updates: Array<{ path: string; trusted: boolean }>;
}

export interface ProjectTrustStoreEntry {
  decision: boolean;
  path: string;
}

export interface TrustSelection {
  trusted: boolean;
  updates: ProjectTrustOption["updates"];
}

export interface TrustSelectorProps {
  cwd: string;
  savedDecision: ProjectTrustStoreEntry | null;
  projectTrusted: boolean;
  trustOptions: ProjectTrustOption[];
  onSelect: (selection: TrustSelection) => void;
  onCancel: () => void;
  width?: number;
}

function formatDecision(trustPath: string | undefined, decision: ProjectTrustStoreEntry | null): string {
  if (decision === null) return "chưa có";
  const label = decision.decision ? "tin tưởng" : "không tin tưởng";
  return trustPath !== undefined && decision.path !== trustPath
    ? `${label} (kế thừa từ ${decision.path})`
    : `${label} (${decision.path})`;
}

export const TrustSelector: React.FC<TrustSelectorProps> = ({
  cwd,
  savedDecision,
  projectTrusted,
  trustOptions,
  onSelect,
  onCancel,
  width = 80,
}) => {
  const t = getTheme();
  const [selected, setSelected] = useState(
    Math.max(
      0,
      trustOptions.findIndex(
        (option) =>
          option.savedPath !== undefined &&
          savedDecision?.decision === option.trusted &&
          savedDecision.path === option.savedPath,
      ),
    ),
  );

  const isCurrent = (option: ProjectTrustOption): boolean =>
    option.savedPath !== undefined &&
    savedDecision?.decision === option.trusted &&
    savedDecision.path === option.savedPath;

  useInput((data, key) => {
    if (matchesEscape(data, key)) {
      onCancel();
      return;
    }
    if (key.return || data === "\n") {
      const option = trustOptions[selected];
      if (option) onSelect({ trusted: option.trusted, updates: option.updates });
      return;
    }
    if (key.upArrow || data === "k") setSelected((i) => Math.max(0, i - 1));
    if (key.downArrow || data === "j") setSelected((i) => Math.min(trustOptions.length - 1, i + 1));
  });

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "Tin tưởng dự án")}</Text>
      <Text>{t.fg("muted", cwd)}</Text>
      <Text> </Text>
      <Text>{t.fg("muted", `Quyết định đã lưu: ${formatDecision(trustOptions[0]?.savedPath, savedDecision)}`)}</Text>
      <Text>{t.fg("muted", `Phiên hiện tại: ${projectTrusted ? "tin tưởng" : "không tin tưởng"}`)}</Text>
      <Text> </Text>
      {trustOptions.map((option, i) => {
        const isSelected = i === selected;
        const mark = isCurrent(option) ? t.fg("accent", "✓ ") : "  ";
        const cursor = isSelected ? t.fg("accent", "→ ") : "  ";
        const label = isSelected ? t.fg("accent", option.label) : t.fg("text", option.label);
        return (
          <Text key={`${i}-${option.label}`}>
            {cursor}
            {mark}
            {label}
          </Text>
        );
      })}
      <Text> </Text>
      <Text>{t.fg("dim", "  ↑↓ chọn · Enter lưu · Esc hủy")}</Text>
      <DynamicBorder />
    </Box>
  );
};

function matchesEscape(data: string, key: { ctrl?: boolean; meta?: boolean }): boolean {
  return data === "\u001b" && !key.ctrl && !key.meta;
}
