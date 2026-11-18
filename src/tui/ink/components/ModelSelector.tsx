// ModelSelector - chọn mô hình
// Bắt chước nguyên tắc pi-mono components/model-selector.ts:
//   - Ô tìm kiếm phía trên danh sách
//   - Danh sách mô hình kèm nhà cung cấp, mục hiện tại đánh dấu "✓"
//   - Lọc mờ theo id/tên/nhà cung cấp
//   - Phạm vi: tất cả / chỉ scoped models
//   - Làm mới danh mục mô hình
//   - Đặt làm mặc định (Ctrl+S)
// Port sang Ink TSX, khong copy code truc iep.

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { selectWindow } from "../core/select-window.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
// // import { getModelSearchText } from "../../../modes/interactive/model-search.js";
const getModelSearchText = (item: { id: string; provider: string; name?: string }) => `${item.id} ${item.provider} ${item.name ?? ""}`;

export interface ModelItem {
  id: string;
  provider: string;
  name?: string;
  model?: any; // Full model object for refresh
}

export interface ScopedModelItem {
  id: string;
  provider: string;
  name?: string;
  thinkingLevel?: string;
}

export interface ModelSelectorProps {
  models: ModelItem[];
  currentModel?: string;
  onSelect: (model: ModelItem) => void;
  onCancel: () => void;
  /** Đặt làm mô hình mặc định (thay vì chỉ phiên hiện tại). */
  onSelectAsDefault?: (model: ModelItem) => void;
  /** Scoped models (giới hạn trong phạm vi). */
  scopedModels?: ScopedModelItem[];
  /** Callback để làm mới danh mục mô hình. */
  onRefresh?: () => void;
  /** Trạng thái đang làm mới. */
  refreshing?: boolean;
  /** Thông báo lỗi từ lần làm mới cuối. */
  refreshError?: string;
  /** Thông báo thành công từ lần làm mới cuối. */
  refreshSuccess?: string;
  width?: number;
}

type ModelScope = "all" | "scoped";

const MAX_VISIBLE = 10;

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  currentModel,
  onSelect,
  onCancel,
  onSelectAsDefault,
  scopedModels = [],
  onRefresh,
  refreshing = false,
  refreshError,
  refreshSuccess,
  width = 80,
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [scope, setScope] = useState<ModelScope>(scopedModels.length > 0 ? "scoped" : "all");
  const [refreshAbortController] = useState(() => new AbortController());

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allModels = models;
  const scopedModelItems = scopedModels.map((s) => ({
    provider: s.provider,
    id: s.id,
    name: s.name,
    model: s as any,
  }));

  const sortModels = useCallback((items: ModelItem[]): ModelItem[] => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const aIsCurrent = a.id === currentModel;
      const bIsCurrent = b.id === currentModel;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      return a.provider.localeCompare(b.provider);
    });
    return sorted;
  }, [currentModel]);

  const filtered = useMemo(() => {
    const source = scope === "scoped" ? scopedModelItems : allModels;
    const sortedSource = sortModels(source);

    if (!query.trim()) return sortedSource;

    return fuzzyFilter(sortedSource, query, (item) => {
      const defaultText = item.id === currentModel ? " default" : "";
      return `${getModelSearchText({ id: item.id, provider: item.provider, name: item.name })}${defaultText}`;
    });
  }, [scope, allModels, scopedModelItems, query, sortModels]);

  const list = filtered;
  const window = selectWindow(selected, list.length, MAX_VISIBLE);
  const clamped = window.clamped;

  const refreshAbortControllerRef = useRef(new AbortController());

  useEffect(() => {
    if (clamped >= 0 && clamped !== selected) setSelected(clamped);
  }, [clamped, selected]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    refreshAbortControllerRef.current.abort();
    refreshAbortControllerRef.current = new AbortController();
    
    // Refresh logic would be handled by parent
    onRefresh();
  }, [onRefresh, refreshing]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((i: number) => (i <= 0 ? Math.max(0, list.length - 1) : i - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((i: number) => (i >= list.length - 1 ? 0 : i + 1));
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
      setQuery((q: string) => q.slice(0, -1));
      return;
    }
    if (input === "\t") {
      if (scopedModels.length > 0) {
        setScope((prev: ModelScope) => prev === "all" ? "scoped" : "all");
      }
      return;
    }
    // Ctrl+R: refresh model catalogs
    if (key.ctrl && input === "r") {
      handleRefresh();
      return;
    }
    // Ctrl+S: select and save as default
    if (key.ctrl && input === "s" && onSelectAsDefault) {
      const model = list[clamped];
      if (model) {
        onSelectAsDefault(model);
      }
      return;
    }
    if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
      setQuery((q: string) => q + input);
    }
  });

  const { start, end } = window;
  const visible = list.slice(start, end);
  const active = list[clamped];

  const scopeText = scope === "all" ? fg("muted", "all") : fg("accent", "scoped");
  const otherScopeText = scope === "all" ? fg("accent", "scoped") : fg("muted", "all");
  const scopeHint = `Tab để chuyển: ${scopeText} | ${otherScopeText}`;

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Box flexDirection="row">
        <Text bold>{fg("accent", "Chọn mô hình")}</Text>
        <Text>{" ".repeat(Math.max(1, width - 20))}</Text>
        <Text>{fg("muted", scopeHint)}</Text>
      </Box>
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
        const defaultBadge = isCurrent ? fg("muted", " (default)") : "";
        return (
          <Text key={`${model.provider}/${model.id}`}>
            {isSelected ? fg("accent", `${cursor}${mark}${label}${badge}${defaultBadge}`) : `${cursor}${mark}${label}${badge}${defaultBadge}`}
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
      {refreshing && <Text>{fg("muted", "  Đang làm mới danh mục mô hình…")}</Text>}
      {refreshError && <Text>{fg("error", `  Lỗi: ${refreshError}`)}</Text>}
      {refreshSuccess && <Text>{fg("success", `  Đã làm mới danh mục mô hình.`)}</Text>}
      <Text> </Text>
      <Text>
        {fg("dim", "  Enter để chọn")}
        {onSelectAsDefault ? fg("dim", " · Ctrl+S đặt mặc định") : ""}
        {onRefresh ? fg("dim", " · Ctrl+R làm mới") : ""}
        {fg("dim", " · Tab đổi phạm vi")}
        {fg("dim", " · Esc để hủy")}
      </Text>
      <DynamicBorder />
    </Box>
  );
};

export default ModelSelector;