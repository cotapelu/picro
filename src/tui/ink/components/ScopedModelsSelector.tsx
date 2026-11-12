// ScopedModelsSelector - bật/tắt và sắp xếp mô hình cho Ctrl+P
// Bắt chước nguyên tắc pi-mono components/scoped-models-selector.ts:
//   - enabledIds: null = tất cả; mảng = danh sách tường minh có thứ tự
//   - Toggle/enableAll/clearAll/toggleProvider/reorder theo từng provider
//   - Thay đổi chỉ áp cho phiên tới khi Ctrl+S lưu vào settings
//   - Lọc mờ theo id/tên/provider
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
import { matchesKey } from "../core/Keys.js";
import { getDistinctModelName } from "../core/ModelSearch.js";
import { selectWindow } from "../core/select-window.js";

export interface ModelItemInput {
  id: string;
  provider: string;
  name?: string;
}

export interface ModelsConfig {
  allModels: ModelItemInput[];
  /** null = tất cả đang bật. */
  enabledModelIds: string[] | null;
  refreshStatus?: string;
}

export interface ModelsCallbacks {
  onChange: (enabledModelIds: string[] | null) => void | Promise<void>;
  onPersist: (enabledModelIds: string[] | null) => void | Promise<void>;
  onCancel: () => void;
}

/** null = tất cả; mảng = danh sách tường minh. */
export type EnabledIds = string[] | null;

function isEnabled(enabled: EnabledIds, id: string): boolean {
  return enabled === null || enabled.includes(id);
}

/** Gộp lại thành null khi danh sách đã phủ mọi mô hình. */
function normalizeEnabled(result: string[], allIds: string[]): EnabledIds {
  return result.length === allIds.length && result.every((id) => allIds.includes(id)) ? null : result;
}

function toggleIds(enabled: EnabledIds, allIds: string[], id: string): EnabledIds {
  if (enabled === null) return allIds.filter((modelId) => modelId !== id);
  const index = enabled.indexOf(id);
  if (index >= 0) return [...enabled.slice(0, index), ...enabled.slice(index + 1)];
  return normalizeEnabled([...enabled, id], allIds);
}

function enableAllIds(enabled: EnabledIds, allIds: string[], targetIds?: string[]): EnabledIds {
  if (enabled === null) return null;
  const targets = targetIds ?? allIds;
  const result = [...enabled];
  for (const id of targets) if (!result.includes(id)) result.push(id);
  return normalizeEnabled(result, allIds);
}

function clearAllIds(enabled: EnabledIds, allIds: string[], targetIds?: string[]): EnabledIds {
  if (enabled === null) return targetIds ? allIds.filter((id) => !targetIds.includes(id)) : [];
  const targets = new Set(targetIds ?? enabled);
  return enabled.filter((id) => !targets.has(id));
}

const MAX_VISIBLE = 8;

export const ScopedModelsSelector: React.FC<{
  config: ModelsConfig;
  callbacks: ModelsCallbacks;
  width?: number;
}> = ({ config, callbacks, width = 80 }) => {
  const t = getTheme();
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState<EnabledIds>(config.enabledModelIds);
  const [isDirty, setDirty] = useState(false);
  const [selected, setSelected] = useState(0);

  const allIds = useMemo(() => config.allModels.map((m) => `${m.provider}/${m.id}`), [config.allModels]);
  const byId = useMemo(() => new Map(config.allModels.map((m) => [`${m.provider}/${m.id}`, m])), [config.allModels]);

  // Thứ tự: id đã bật trước, rồi tới các id chưa bật.
  const items = useMemo(() => {
    if (enabled === null) return allIds;
    const enabledSet = new Set(enabled);
    return [...enabled, ...allIds.filter((id) => !enabledSet.has(id))];
  }, [enabled, allIds]);

  const filtered = useMemo(
    () =>
      query.trim()
        ? fuzzyFilter(items, query, (id) => {
            const m = byId.get(id);
            return `${m?.id ?? id} ${m?.name ?? ""} ${m?.provider ?? ""}`;
          })
        : items,
    [items, query, byId],
  );

  const window = selectWindow(selected, filtered.length, MAX_VISIBLE);
  const clamped = window.clamped;
  const { start } = window;
  const visible = filtered.slice(start, start + MAX_VISIBLE);

  // Keep the stored index inside the current list (see core/select-window.ts):
  // the arrow keys bound-check the raw index, so after filtering the highlight
  // otherwise sat still while Up had to be pressed repeatedly.
  useEffect(() => {
    if (clamped >= 0 && clamped !== selected) setSelected(clamped);
  }, [clamped, selected]);

  const update = (next: EnabledIds) => {
    setEnabled(next);
    setDirty(true);
    void callbacks.onChange(next);
  };

  useInput((data, key) => {
    if (matchesKey(data, "escape")) {
      callbacks.onCancel();
      return;
    }
    if (key.return) {
      const id = filtered[clamped];
      if (id) update(toggleIds(enabled, allIds, id));
      return;
    }
    // Ctrl+S lưu vào settings.
    if (key.ctrl && data === "s") {
      void callbacks.onPersist(enabled);
      setDirty(false);
      return;
    }
    // Ctrl+A bật tất cả (hoặc các mục đang lọc).
    if (key.ctrl && data === "a") {
      update(enableAllIds(enabled, allIds, query.trim() ? filtered : undefined));
      return;
    }
    // Ctrl+X tắt tất cả (hoặc các mục đang lọc).
    if (key.ctrl && data === "x") {
      update(clearAllIds(enabled, allIds, query.trim() ? filtered : undefined));
      return;
    }
    // Ctrl+B đổi trạng thái cả provider của mục hiện tại.
    if (key.ctrl && data === "b") {
      const id = filtered[clamped];
      const provider = id ? byId.get(id)?.provider : undefined;
      if (!provider) return;
      const providerIds = allIds.filter((fullId) => byId.get(fullId)?.provider === provider);
      const allOn = providerIds.every((fullId) => isEnabled(enabled, fullId));
      update(allOn ? clearAllIds(enabled, allIds, providerIds) : enableAllIds(enabled, allIds, providerIds));
      return;
    }
    // Alt+Up / Alt+Down sắp xếp lại trong danh sách đã bật.
    if (key.ctrl && data === "[") {
      moveSelection(-1);
      return;
    }
    if (key.ctrl && data === "]") {
      moveSelection(1);
      return;
    }
    if (key.upArrow) setSelected((i) => (i <= 0 ? Math.max(0, filtered.length - 1) : i - 1));
    if (key.downArrow) setSelected((i) => (i >= filtered.length - 1 ? 0 : i + 1));
    if (key.backspace) setQuery((q) => q.slice(0, -1));
    if (data.length === 1 && !key.ctrl && data.charCodeAt(0) >= 32) setQuery((q) => q + data);
  });

  const moveSelection = (delta: number) => {
    if (enabled === null) return;
    const id = filtered[clamped];
    if (!id || !isEnabled(enabled, id)) return;
    const index = enabled.indexOf(id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= enabled.length) return;
    const next = [...enabled];
    [next[index], next[target]] = [next[target]!, next[index]!];
    update(next);
    // Clamp: the row index after the move may run past the end of the list.
    setSelected(Math.max(0, Math.min(clamped + delta, filtered.length - 1)));
  };

  const enabledCount = enabled === null ? allIds.length : enabled.filter((id) => byId.has(id)).length;

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "Cấu hình mô hình")}</Text>
      <Text>{t.fg("muted", "Chỉ áp cho phiên. Ctrl+S để lưu vào settings.")}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm mô hình…" onChange={setQuery} />
      <Text> </Text>
      {visible.length === 0 ? (
        <Text>{t.fg("muted", "  Không có mô hình")}</Text>
      ) : (
        visible.map((id, offset) => {
          const index = start + offset;
          const isSelected = index === clamped;
          const model = byId.get(id);
          const on = isEnabled(enabled, id);
          const cursor = isSelected ? t.fg("accent", "→ ") : "  ";
          const mark = on ? t.fg("accent", "✓ ") : "  ";
          const label = model?.id ?? id;
          const name = model ? getDistinctModelName(model) : undefined;
          const nameText = name ? t.fg("muted", ` (${name})`) : "";
          const badge = t.fg("muted", ` [${model?.provider ?? "không rõ"}]`);
          return (
            <Text key={id}>
              {isSelected
                ? t.fg("accent", `${cursor}${mark}${label}${nameText}${badge}`)
                : `${cursor}${mark}${model ? label : t.strikethrough(label)}${nameText}${badge}`}
            </Text>
          );
        })
      )}
      {start > 0 || visible.length < filtered.length ? (
        <Text>{t.fg("dim", `  (${clamped + 1}/${filtered.length})`)}</Text>
      ) : null}
      <Text> </Text>
      <Text>
        {t.fg("dim", "  Enter đổi · Ctrl+A tất cả · Ctrl+X tắt · Ctrl+B provider · Ctrl+[ ] sắp xếp · Ctrl+S lưu")}
        {isDirty ? t.fg("warning", " (chưa lưu)") : ""}
        {` · ${enabled === null ? "tất cả" : `${enabledCount}/${allIds.length}`}`}
      </Text>
      <DynamicBorder />
    </Box>
  );
};
