// ConfigSelector - bật/tắt tài nguyên package (extension/skill/prompt/theme)
// Bắt chước nguyên tắc pi-mono components/config-selector.ts:
//   - Nhóm theo origin (package/top-level) rồi scope (user/project/path)
//   - Trong mỗi nhóm: nhóm con theo loại tài nguyên, rồi từng mục
//   - Ô tìm kiếm lọc theo tên/loại/đường dẫn
//   - Space/Enter đổi trạng thái; Tab đổi phạm vi ghi (global/project)
//   - Phạm vi project: vòng tròn inherit -> load -> unload
//   - Mục kế thừa toàn cục hiện mờ
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { truncateToWidth } from "../core/index.js";
import { filterConfigEntries } from "./config-filter.js";
import { selectWindow } from "../core/select-window.js";
import { matchesKey } from "../core/Keys.js";

export type ResourceType = "extensions" | "skills" | "prompts" | "themes";
export type ConfigWriteScope = "global" | "project";
export type ProjectOverrideState = "inherit" | "load" | "unload";

export interface ResourceItem {
  path: string;
  enabled: boolean;
  resourceType: ResourceType;
  /** Tên hiển thị (vd "extension.ts"). */
  displayName: string;
  /** Nguồn: "npm:...", "git:...", "auto", "builtin", "local". */
  source: string;
  scope: "user" | "project" | "temporary";
  origin: "package" | "top-level";
  baseDir?: string;
}

export interface ResourceSubgroup {
  type: ResourceType;
  label: string;
  items: ResourceItem[];
}

export interface ResourceGroup {
  label: string;
  scope: "user" | "project" | "temporary";
  origin: "package" | "top-level";
  source: string;
  subgroups: ResourceSubgroup[];
}

/** Số dòng tối đa hiển thị trong bảng cấu hình. */
const CONFIG_MAX_VISIBLE = 12;

const TYPE_LABELS: Record<ResourceType, string> = {
  extensions: "Extension",
  skills: "Skill",
  prompts: "Prompt",
  themes: "Chủ đề",
};

export interface ConfigSelectorProps {
  groups: ResourceGroup[];
  onChange: (item: ResourceItem, newEnabled: boolean) => void;
  onClose: () => void;
  onExit?: () => void;
  /** Đổi phạm vi ghi; trả về true nếu chuyển được. */
  onSwitchMode?: () => boolean;
  projectModeAvailable?: boolean;
  writeScope?: ConfigWriteScope;
  width?: number;
}

/** Danh sách phẳng để điều hướng: nhóm / nhóm con / mục. */
export type FlatEntry =
  | { type: "group"; group: ResourceGroup }
  | { type: "subgroup"; subgroup: ResourceSubgroup; group: ResourceGroup }
  | { type: "item"; item: ResourceItem };

export const ConfigSelector: React.FC<ConfigSelectorProps> = ({
  groups,
  onChange,
  onClose,
  onExit,
  onSwitchMode,
  projectModeAvailable = true,
  writeScope = "global",
  width = 80,
}) => {
  const t = getTheme();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [flash, setFlash] = useState<string | undefined>(undefined);

  const flat = useMemo<FlatEntry[]>(() => {
    const entries: FlatEntry[] = [];
    for (const group of groups) {
      entries.push({ type: "group", group });
      for (const subgroup of group.subgroups) {
        entries.push({ type: "subgroup", subgroup, group });
        for (const item of subgroup.items) entries.push({ type: "item", item });
      }
    }
    return entries;
  }, [groups]);

  // Lọc theo truy vấn: giữ nhóm/nhóm con có chứa mục khớp.
  //
  // Delegates to filterConfigEntries(): the inline version tracked matching
  // groups/subgroups by their display LABEL, so two groups sharing a label
  // leaked each other's results - a header with no matching item under it
  // stayed visible, and a matching group's header could be dropped.
  const filtered = useMemo(
    () => filterConfigEntries(flat, groups, query),
    [flat, groups, query],
  );

  const firstItemIndex = Math.max(0, filtered.findIndex((e) => e.type === "item"));
  const window = selectWindow(selected, filtered.length, CONFIG_MAX_VISIBLE);
  const clamped = window.clamped;

  // Keep the stored index inside the current list (see core/select-window.ts).
  useEffect(() => {
    if (clamped >= 0 && clamped !== selected) setSelected(clamped);
  }, [clamped, selected]);

  const findNextItem = (from: number, direction: 1 | -1): number => {
    let idx = from + direction;
    while (idx >= 0 && idx < filtered.length) {
      if (filtered[idx]!.type === "item") return idx;
      idx += direction;
    }
    return from;
  };

  useInput((data, key) => {
    if (matchesKey(data, "escape")) {
      if (query) {
        setQuery("");
        setSelected(firstItemIndex);
        return;
      }
      onClose();
      return;
    }
    if (matchesKey(data, "ctrl+c")) {
      onExit?.();
      return;
    }
    if (matchesKey(data, "tab")) {
      if (projectModeAvailable && onSwitchMode) {
        onSwitchMode();
        setFlash("Đã đổi phạm vi ghi");
      }
      return;
    }
    if (key.upArrow) {
      setSelected((i) => findNextItem(i, -1));
      return;
    }
    if (key.downArrow) {
      setSelected((i) => findNextItem(i, 1));
      return;
    }
    if (key.pageUp) setSelected((i) => Math.max(0, i - 10));
    if (key.pageDown) setSelected((i) => Math.min(filtered.length - 1, i + 10));
    if (data === " ") {
      const entry = filtered[clamped];
      if (entry?.type === "item") {
        onChange(entry.item, !entry.item.enabled);
        setFlash(`${entry.item.displayName} ${entry.item.enabled ? "tắt" : "bật"}`);
      }
      return;
    }
    if (key.backspace) {
      setQuery((q) => q.slice(0, -1));
      return;
    }
    if (data.length === 1 && !key.ctrl && !key.meta && data.charCodeAt(0) >= 32) {
      setQuery((q) => q + data);
      setSelected(0);
    }
  });

  // Xóa thông báo flash sau 1.5s.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(undefined), 1500);
    return () => clearTimeout(timer);
  }, [flash]);

  const { start } = window;
  const visible = filtered.slice(start, start + CONFIG_MAX_VISIBLE);

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{t.fg("accent", writeScope === "project" ? "Tài nguyên cục bộ dự án" : "Tài nguyên toàn cục")}</Text>
        <Text>
          {t.fg("dim", projectModeAvailable ? "Tab đổi phạm vi · " : "")}
          {t.fg("dim", "Space bật/tắt")}
          {t.fg("dim", " · Esc đóng")}
        </Text>
      </Box>
      <Text>{t.fg("muted", writeScope === "project" ? ".picro/settings.json" : "~/.picro/agent/settings.json")}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm tài nguyên…" onChange={setQuery} />
      <Text> </Text>
      {filtered.length === 0 ? (
        <Text>{t.fg("muted", "  Không có tài nguyên")}</Text>
      ) : (
        visible.map((entry, i) => {
          const index = start + i;
          const isSelected = index === clamped;
          if (entry.type === "group") {
            const inherited = writeScope === "project" && entry.group.scope === "user";
            return (
              <Text key={`g-${entry.group.label}-${i}`}>
                {t.fg(inherited ? "dim" : "accent", t.bold(`  ${entry.group.label}${inherited ? " · kế thừa toàn cục" : ""}`))}
              </Text>
            );
          }
          if (entry.type === "subgroup") {
            const color = writeScope === "project" && entry.group.scope === "user" ? "dim" : "muted";
            return <Text key={`sg-${entry.subgroup.label}-${i}`}>{t.fg(color, `    ${TYPE_LABELS[entry.subgroup.type]}`)}</Text>;
          }
          const item = entry.item;
          const cursor = isSelected ? "> " : "  ";
          const box = item.enabled ? t.fg("success", "[x]") : t.fg("dim", "[ ]");
          const name = isSelected ? t.bold(item.displayName) : item.displayName;
          const tail = item.path.length > 30 ? `…${item.path.slice(-29)}` : item.path;
          return (
            <Text key={`i-${item.path}-${i}`}>
              {truncateToWidth(`${cursor}    ${box} ${name} ${t.fg("dim", tail)}`, width, "...")}
            </Text>
          );
        })
      )}
      {start > 0 || visible.length < filtered.length ? (
        <Text>{t.fg("dim", `  (${clamped + 1}/${filtered.length})`)}</Text>
      ) : null}
      {flash ? (
        <>
          <Text> </Text>
          <Text>{t.fg("success", `  ${flash}`)}</Text>
        </>
      ) : null}
      <DynamicBorder />
    </Box>
  );
};

/** Gợi ý phím cho đầu bảng cấu hình. */
export function renderConfigHeaderHint(projectModeAvailable: boolean, writeScope: ConfigWriteScope): string {
  const switchHint = projectModeAvailable ? "Tab đổi phạm vi · " : "";
  return `${switchHint}Space bật/tắt · Esc đóng (${writeScope})`;
}
