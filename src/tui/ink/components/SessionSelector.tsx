// SessionSelector - chọn phiên làm việc để mở lại
// Bắt chước nguyên tắc pi-mono components/session-selector.ts:
//   - Phạm vi: thư mục hiện tại hoặc toàn bộ
//   - Sắp xếp theo thời điểm sửa gần nhất
//   - Tìm kiếm theo id/tên, hiển thị thư mục và tên phiên
// Port sang Ink TSX, khong copy code truc iep.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { selectWindow } from "../core/select-window.js";

export interface SessionInfo {
  id: string;
  name?: string;
  cwd?: string;
  /** Thời điểm sửa đổi gần nhất (ms). */
  modified?: number;
}

export interface SessionSelectorProps {
  sessions: SessionInfo[];
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
  /** Mở rộng phạm vi sang mọi phiên (không chỉ thư mục hiện tại). */
  onScopeToggle?: (allSessions: boolean) => void;
  scopeAll?: boolean;
  width?: number;
}

const MAX_VISIBLE = 10;

/** Định dạng khoảng thời gian tương đối cho gọn. */
function formatAgo(ms?: number): string {
  if (ms === undefined) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins}p`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}g`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}ng`;
  return `${Math.floor(days / 30)}th`;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  onSelect,
  onCancel,
  onScopeToggle,
  scopeAll = false,
  width = 80,
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0)),
    [sessions],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((s) =>
      `${s.id} ${s.name ?? ""} ${s.cwd ?? ""}`.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const list = filtered;
  const window = selectWindow(selected, list.length, MAX_VISIBLE);
  const clamped = window.clamped;

  // Keep the stored index inside the current list (see ModelSelector).
  useEffect(() => {
    if (clamped >= 0 && clamped !== selected) setSelected(clamped);
  }, [clamped, selected]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((i) => (i <= 0 ? Math.max(0, list.length - 1) : i - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((i) => (i >= list.length - 1 ? 0 : i + 1));
      return;
    }
    if (key.return) {
      const session = list[clamped];
      if (session) onSelect(session.id);
      return;
    }
    if (input === "\t" && onScopeToggle) {
      onScopeToggle(!scopeAll);
      return;
    }
    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onCancel();
      return;
    }
    if (key.backspace) {
      setQuery((q) => q.slice(0, -1));
      return;
    }
    if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
      setQuery((q) => q + input);
    }
  });

  const { start, end } = window;
  const visible = list.slice(start, end);
  const scopeLabel = scopeAll ? "mọi phiên" : "thư mục này";

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{fg("accent", "Mở lại phiên")}</Text>
      <Text>{fg("muted", `Phạm vi: ${scopeLabel}`)}</Text>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm phiên…" onChange={setQuery} />
      <Text> </Text>
      {visible.map((session, offset) => {
        const index = start + offset;
        const isSelected = index === clamped;
        const cursor = isSelected ? fg("accent", "› ") : "  ";
        const head = session.name ? `${session.name} · ${session.id}` : session.id;
        const tail = fg("dim", ` ${formatAgo(session.modified)}`);
        return (
          <Text key={session.id}>
            {isSelected ? fg("accent", `${cursor}${head}${tail}`) : `${cursor}${fg("text", head)}${tail}`}
          </Text>
        );
      })}
      {list.length === 0 ? <Text>{fg("muted", "  Không có phiên")}</Text> : null}
      {start > 0 || end < list.length ? (
        <Text>{fg("dim", `  (${clamped + 1}/${list.length})`)}</Text>
      ) : null}
      <Text> </Text>
      <Text>
        {fg("dim", "  Enter để mở")}
        {onScopeToggle ? fg("dim", " · Tab đổi phạm vi") : ""}
        {fg("dim", " · Esc để hủy")}
      </Text>
      <DynamicBorder />
    </Box>
  );
};
