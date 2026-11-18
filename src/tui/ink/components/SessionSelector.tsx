// SessionSelector - chọn phiên làm việc để mở lại
// Bắt chước nguyên tắc pi-mono components/session-selector.ts:
//   - Phạm vi: thư mục hiện tại hoặc toàn bộ
//   - Sắp xếp: threaded / recent / relevance
//   - Lọc theo tên: tất cả / chỉ có tên
//   - Cây phiên (parentSessionPath) cho threaded
//   - Tìm kiếm mờ, hiển thị thư mục, tên, số tin nhắn, độ tuổi
//   - Xóa phiên (trash CLI fallback unlink)
//   - Đổi tên phiên
//   - Toggle hiển thị đường dẫn
// Port sang Ink TSX, khong copy code truc iep.

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { selectWindow } from "../core/select-window.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { unlink } from "fs/promises";
import { canonicalizePath, getPathComparisonKey, shortenHomePath } from "../../../utils/paths.js";

export interface SessionInfo {
  id: string;
  name?: string;
  cwd?: string;
  /** Thời điểm sửa đổi gần nhất (ms). */
  modified?: number;
  /** Đường dẫn file phiên. */
  path?: string;
  /** Đường dẫn phiên cha (cho threaded view). */
  parentSessionPath?: string;
  /** Số lượng tin nhắn. */
  messageCount?: number;
  /** Tin nhắn đầu tiên (dùng làm preview). */
  firstMessage?: string;
}

export interface SessionSelectorProps {
  sessions: SessionInfo[];
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
  /** Mở rộng phạm vi sang mọi phiên (không chỉ thư mục hiện tại). */
  onScopeToggle?: (allSessions: boolean) => void;
  scopeAll?: boolean;
  /** Callback khi đổi tên phiên. */
  onRename?: (sessionId: string, newName: string) => void;
  /** Callback khi xóa phiên. */
  onDelete?: (sessionId: string) => void;
  width?: number;
}

type SessionScope = "current" | "all";
type SortMode = "threaded" | "recent" | "relevance";
type NameFilter = "all" | "named";

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
  if (days < 7) return `${days}ng`;
  if (days < 30) return `${Math.floor(days / 7)}tu`;
  if (days < 365) return `${Math.floor(days / 30)}th`;
  return `${Math.floor(days / 365)}nm`;
}

/** So khóa đường dẫn phiên; theo dõi symlink và bỏ qua case trên Windows. */
function getSessionPathKey(path: string): string {
  return getPathComparisonKey(canonicalizePath(path));
}

/** Nút cây phiên cho hiển thị phân cấp. */
interface SessionTreeNode {
  session: SessionInfo;
  children: SessionTreeNode[];
  latestActivity: number;
}

/** Nút làm phẳng để hiển thị với thông tin cấu trúc cây. */
interface FlatSessionNode {
  session: SessionInfo;
  depth: number;
  isLast: boolean;
  /** Với mỗi cấp tổ tiên, có thêm anh chị em sau không. */
  ancestorContinues: boolean[];
}

/** Xây dựng cấu trúc cây từ các phiên dựa trên parentSessionPath. Trả về các nút gốc sắp xếp theo ngày sửa (giảm dần). */
function buildSessionTree(sessions: SessionInfo[]): SessionTreeNode[] {
  const byPath = new Map<string, SessionTreeNode>();

  for (const session of sessions) {
    const sessionPath = getSessionPathKey(session.path ?? session.id);
    byPath.set(sessionPath, { session, children: [], latestActivity: session.modified ?? 0 });
  }

  const roots: SessionTreeNode[] = [];

  for (const session of sessions) {
    const sessionPath = getSessionPathKey(session.path ?? session.id);
    const node = byPath.get(sessionPath)!;
    const parentPath = session.parentSessionPath ? getSessionPathKey(session.parentSessionPath) : undefined;

    if (parentPath && byPath.has(parentPath)) {
      byPath.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const updateLatestActivity = (node: SessionTreeNode): number => {
    let latestActivity = node.session.modified ?? 0;
    for (const child of node.children) {
      latestActivity = Math.max(latestActivity, updateLatestActivity(child));
    }
    node.latestActivity = latestActivity;
    return latestActivity;
  };

  for (const root of roots) {
    updateLatestActivity(root);
  }

  // Sắp xếp con và gốc theo hoạt động gần nhất trong từng nhánh (giảm dần)
  const sortNodes = (nodes: SessionTreeNode[]): void => {
    nodes.sort((a, b) => b.latestActivity - a.latestActivity);
    for (const node of nodes) {
      sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

/** Làm phẳng cây thành danh sách hiển thị với siêu dữ liệu cấu trúc cây. */
function flattenSessionTree(roots: SessionTreeNode[]): FlatSessionNode[] {
  const result: FlatSessionNode[] = [];

  const walk = (node: SessionTreeNode, depth: number, ancestorContinues: boolean[], isLast: boolean): void => {
    result.push({ session: node.session, depth, isLast, ancestorContinues });

    for (let i = 0; i < node.children.length; i++) {
      const childIsLast = i === node.children.length - 1;
      // Chỉ hiển thị đường tiếp nối cho tổ tiên không phải gốc
      const continues = depth > 0 ? !isLast : false;
      walk(node.children[i]!, depth + 1, [...ancestorContinues, continues], childIsLast);
    }
  };

  for (let i = 0; i < roots.length; i++) {
    walk(roots[i]!, 0, [], i === roots.length - 1);
  }

  return result;
}

/** Lọc và sắp xếp các phiên (chế độ phẳng). */
function filterAndSortSessions(
  sessions: SessionInfo[],
  query: string,
  sortMode: SortMode,
  nameFilter: NameFilter,
): SessionInfo[] {
  const trimmed = query.trim();

  const nameFiltered = nameFilter === "all" ? sessions : sessions.filter((s) => s.name && s.name.trim().length > 0);

  if (sortMode === "threaded" && !trimmed) {
    // Threaded mode without search: show tree structure (handled separately)
    return nameFiltered;
  }

  if (trimmed) {
    // Tìm kiếm mờ cho tất cả các chế độ sắp xếp khi có truy vấn
    const filtered = fuzzyFilter(nameFiltered, trimmed, (session) => {
      const namePart = session.name ? `${session.name} ` : "";
      return `${namePart}${session.id} ${session.cwd ?? ""} ${session.firstMessage ?? ""}`;
    });
    return filtered;
  }

  // Không có truy vấn: sắp xếp theo chế độ
  const sorted = [...nameFiltered];
  switch (sortMode) {
    case "recent":
      sorted.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
      break;
    case "relevance":
      // Default: modified desc
      sorted.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
      break;
    default:
      sorted.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));
  }
  return sorted;
}

/** Xóa file phiên, thử `trash` CLI trước, sau đó fallback unlink. */
async function deleteSessionFile(
  sessionPath: string,
): Promise<{ ok: boolean; method: "trash" | "unlink"; error?: string }> {
  // Thử `trash` trước (nếu cài đặt)
  const trashArgs = sessionPath.startsWith("-") ? ["--", sessionPath] : [sessionPath];
  const trashResult = spawnSync("trash", trashArgs, { encoding: "utf-8" });

  const getTrashErrorHint = (): string | null => {
    const parts: string[] = [];
    if (trashResult.error) {
      parts.push(trashResult.error.message);
    }
    const stderr = trashResult.stderr?.trim();
    if (stderr) {
      parts.push(stderr.split("\n")[0] ?? stderr);
    }
    if (parts.length === 0) return null;
    return `trash: ${parts.join(" · ").slice(0, 200)}`;
  };

  // Nếu trash báo thành công, hoặc file biến mất sau đó, coi như thành công
  if (trashResult.status === 0 || !existsSync(sessionPath)) {
    return { ok: true, method: "trash" };
  }

  // Fallback xóa vĩnh viễn
  try {
    await unlink(sessionPath);
    return { ok: true, method: "unlink" };
  } catch (err) {
    const unlinkError = err instanceof Error ? err.message : String(err);
    const trashErrorHint = getTrashErrorHint();
    const error = trashErrorHint ? `${unlinkError} (${trashErrorHint})` : unlinkError;
    return { ok: false, method: "unlink", error };
  }
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  onSelect,
  onCancel,
  onScopeToggle,
  scopeAll = false,
  onRename,
  onDelete,
  width = 80,
}) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [scope, setScope] = useState<SessionScope>(scopeAll ? "all" : "current");
  const [sortMode, setSortMode] = useState<SortMode>("threaded");
  const [nameFilter, setNameFilter] = useState<NameFilter>("all");
  const [showPath, setShowPath] = useState(false);
  const [confirmingDeletePath, setConfirmingDeletePath] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "info" | "error"; message: string } | null>(null);
  const [showRenameHint, setShowRenameHint] = useState(false);
  const [renameMode, setRenameMode] = useState<{ sessionId: string; currentName: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const allSessions = sessions;
  const currentSessions = useMemo(
    () => sessions.filter((s) => s.cwd && s.cwd === process.cwd()),
    [sessions],
  );

  const sorted = useMemo(() => {
    const sourceSessions = scope === "current" ? currentSessions : allSessions;
    if (sortMode === "threaded" && !query.trim()) {
      // Trả về cây cho threaded mode
      return sourceSessions;
    }
    return filterAndSortSessions(sourceSessions, query, sortMode, nameFilter);
  }, [scope, sortMode, nameFilter, query, allSessions, currentSessions]);

  // Xử lý tree flatten cho threaded mode
  const displayNodes = useMemo(() => {
    if (sortMode === "threaded" && !query.trim()) {
      const sourceSessions = scope === "current" ? currentSessions : allSessions;
      const roots = buildSessionTree(sourceSessions);
      return flattenSessionTree(roots);
    }
    // Chế độ phẳng: bọc mỗi session vào FlatSessionNode
    return sorted.map((session) => ({
      session,
      depth: 0,
      isLast: true,
      ancestorContinues: [],
    }));
  }, [sorted, sortMode, query, scope, allSessions, currentSessions]);

  const window = selectWindow(selected, displayNodes.length, MAX_VISIBLE);
  const clamped = window.clamped;

  useEffect(() => {
    if (clamped >= 0 && clamped !== selected) setSelected(clamped);
  }, [clamped, selected]);

  const clearStatusTimeout = useRef<NodeJS.Timeout | null>(null);
  const setStatusMessageCb = useCallback((msg: { type: "info" | "error"; message: string } | null, autoHideMs?: number) => {
    if (clearStatusTimeout.current) {
      clearTimeout(clearStatusTimeout.current);
      clearStatusTimeout.current = null;
    }
    setStatusMessage(msg);
    if (!msg || !autoHideMs) return;
    clearStatusTimeout.current = setTimeout(() => {
      setStatusMessage(null);
      clearStatusTimeout.current = null;
    }, autoHideMs);
  }, []);

  useInput((input, key) => {
    // Xử lý trạng thái xác nhận xóa trước - chặn mọi phím
    if (confirmingDeletePath !== null) {
      if (key.return) {
        const pathToDelete = confirmingDeletePath;
        setConfirmingDeletePath(null);
        // Tìm session ID từ path
        const session = allSessions.find(s => getSessionPathKey(s.path ?? s.id) === pathToDelete);
        if (session && onDelete) onDelete(session.id);
        return;
      }
      if (key.escape) {
        setConfirmingDeletePath(null);
        return;
      }
      // Bỏ qua các phím khác khi đang xác nhận
      return;
    }

    // Xử lý chế độ đổi tên
    if (renameMode) {
      if (key.escape) {
        setRenameMode(null);
        setRenameInput("");
        return;
      }
      if (key.return) {
        if (renameInput.trim() && onRename) {
          onRename(renameMode.sessionId, renameInput.trim());
        }
        setRenameMode(null);
        setRenameInput("");
        return;
      }
      if (key.backspace) {
        setRenameInput((prev: string) => prev.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
        setRenameInput((prev: string) => prev + input);
        return;
      }
      return;
    }

    if (key.upArrow) {
      setSelected((i: number) => (i <= 0 ? Math.max(0, displayNodes.length - 1) : i - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((i: number) => (i >= displayNodes.length - 1 ? 0 : i + 1));
      return;
    }
    if (key.return) {
      const node = displayNodes[clamped];
      if (node) onSelect(node.session.id);
      return;
    }
    if (input === "\t") {
      if (onScopeToggle) {
        setScope((prev: SessionScope) => prev === "current" ? "all" : "current");
        onScopeToggle(scope === "current");
      }
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.backspace) {
      setQuery(prev => prev.slice(0, -1));
      return;
    }
    // Ctrl+D: khởi tạo xác nhận xóa
    if (key.ctrl && input === "d") {
      const node = displayNodes[clamped];
      if (node && !getSessionPathKey(node.session.path ?? node.session.id).startsWith(getSessionPathKey(process.cwd()))) {
        setConfirmingDeletePath(node.session.path ?? node.session.id);
      }
      return;
    }
    // Ctrl+P: toggle hiển thị đường dẫn
    if (key.ctrl && input === "p") {
      setShowPath((prev: boolean) => !prev);
      return;
    }
    // Ctrl+Backspace: alias không xâm lấn cho xóa
    if (key.ctrl && input === "\x7f") {
      if (query.length > 0) {
        setQuery(prev => prev.slice(0, -1));
        return;
      }
      const node = displayNodes[clamped];
      if (node) setConfirmingDeletePath(node.session.path ?? node.session.id);
      return;
    }
    // Rename: Ctrl+R
    if (key.ctrl && input === "r") {
      const node = displayNodes[clamped];
      if (node && onRename) {
        setRenameMode({ sessionId: node.session.id, currentName: node.session.name ?? "" });
        setRenameInput(node.session.name ?? "");
      }
      return;
    }
    // Toggle sort mode: Ctrl+S
    if (key.ctrl && input === "s") {
      setSortMode((prev: SortMode) => prev === "threaded" ? "recent" : prev === "recent" ? "relevance" : "threaded");
      return;
    }
    // Toggle name filter: Ctrl+N
    if (key.ctrl && input === "n") {
      setNameFilter((prev: NameFilter) => prev === "all" ? "named" : "all");
      return;
    }
    if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
      setQuery((prev: string) => prev + input);
    }
  });

  const { start, end } = window;
  const visible = displayNodes.slice(start, end);
  const scopeLabel = scope === "all" ? "mọi phiên" : "thư mục này";
  const sortLabel = sortMode === "threaded" ? "Threaded" : sortMode === "recent" ? "Recent" : "Relevance";
  const nameLabel = nameFilter === "all" ? "Tất cả" : "Có tên";

  // Dòng tiêu đề
  const leftTitle = theme.bold("Mở lại phiên");
  const sortText = fg("muted", "Sắp xếp: ") + fg("accent", sortLabel);
  const nameText = fg("muted", "Lọc: ") + fg("accent", nameLabel);
  let scopeText: string;
  if (scope === "current") {
    scopeText = fg("accent", "◉ Thư mục này") + fg("muted", " | ○ Tất cả");
  } else {
    scopeText = fg("muted", "○ Thư mục này | ") + fg("accent", "◉ Tất cả");
  }
  const rightTitle = `${scopeText}  ${nameText}  ${sortText}`;

  // Dòng hint - thay đổi dựa trên trạng thái
  let hintLine1: string;
  let hintLine2: string;
  if (confirmingDeletePath !== null) {
    const confirmHint = `Xóa phiên? Enter xác nhận · Esc hủy`;
    hintLine1 = fg("error", confirmHint);
    hintLine2 = "";
  } else if (statusMessage) {
    const color = statusMessage.type === "error" ? "error" : "accent";
    hintLine1 = fg(color, statusMessage.message);
    hintLine2 = "";
  } else if (renameMode) {
    hintLine1 = fg("dim", `Nhập tên mới: ${renameInput}_ · Enter lưu · Esc hủy`);
    hintLine2 = "";
  } else {
    const sep = fg("muted", " · ");
    const hint1 = fg("muted", "Tab đổi phạm vi") + sep + fg("muted", 're:<pattern> regex · "phrase" exact');
    const hint2Parts = [
      fg("muted", "Ctrl+S sắp xếp"),
      fg("muted", "Ctrl+N lọc tên"),
      fg("muted", "Ctrl+D xóa"),
      fg("muted", "Ctrl+R đổi tên"),
      fg("muted", "Ctrl+P đường dẫn"),
    ];
    if (showRenameHint) hint2Parts.push(fg("muted", "Ctrl+R đổi tên"));
    hintLine1 = hint1;
    hintLine2 = hint2Parts.join(sep);
  }

  // Xây dựng tiền tố cây
  const buildTreePrefix = (node: FlatSessionNode): string => {
    if (node.depth === 0) return "";
    const parts = node.ancestorContinues.map((continues) => (continues ? "│  " : "   "));
    const branch = node.isLast ? "└─ " : "├─ ";
    return parts.join("") + branch;
  };

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder color={(s) => fg("accent", s)} />
      <Box flexDirection="row">
        <Text>{leftTitle}</Text>
        <Text>{" ".repeat(Math.max(1, width - visibleWidth(leftTitle) - visibleWidth(rightTitle)))}</Text>
        <Text>{rightTitle}</Text>
      </Box>
      <Text> </Text>
      <TextInput value={query} placeholder="Tìm phiên…" onChange={setQuery} />
      <Text> </Text>
      {visible.map((node, offset) => {
        const index = start + offset;
        const isSelected = index === clamped;
        const isConfirmingDelete = node.session.path === confirmingDeletePath;
        const session = node.session;

        const cursor = isSelected ? fg("accent", "› ") : "  ";
        const prefix = buildTreePrefix(node);
        const prefixStyled = fg("dim", prefix);

        const hasName = !!session.name;
        const displayText = session.name ?? session.firstMessage ?? session.id;
        const normalizedMessage = displayText.replace(/[\x00-\x1f\x7f]/g, " ").trim();

        const age = formatAgo(session.modified);
        const msgCount = String(session.messageCount ?? 0);
        let rightPart = `${msgCount} ${age}`;
        if (showPath && session.cwd) {
          rightPart = `${shortenHomePath(session.cwd)} ${rightPart}`;
        }

        const prefixWidth = visibleWidth(prefixStyled);
        const rightWidth = visibleWidth(rightPart) + 2;
        const availableForMsg = width - 2 - prefixWidth - rightWidth;

        const truncatedMsg = truncateToWidth(normalizedMessage, Math.max(10, availableForMsg), "…");

        let messageColor: "error" | "warning" | "accent" | null = null;
        if (isConfirmingDelete) messageColor = "error";
        else if (hasName) messageColor = "warning";
        let styledMsg = messageColor ? fg(messageColor, truncatedMsg) : truncatedMsg;
        if (isSelected) styledMsg = theme.bold(styledMsg);

        const leftPart = cursor + prefixStyled + styledMsg;
        const leftWidth = visibleWidth(leftPart);
        const spacing = Math.max(1, width - leftWidth - visibleWidth(rightPart));
        const styledRight = fg(isConfirmingDelete ? "error" : "dim", rightPart);

        let line = leftPart + " ".repeat(spacing) + styledRight;
        if (isSelected) line = bg("selectedBg", line);

        return <Text key={session.id}>{truncateToWidth(line, width)}</Text>;
      })}
      {displayNodes.length === 0 ? (
        <Text>{fg("muted", "  Không có phiên")}</Text>
      ) : null}
      {start > 0 || end < displayNodes.length ? (
        <Text>{fg("dim", `  (${clamped + 1}/${displayNodes.length})`)}</Text>
      ) : null}
      <Text> </Text>
      <Text>{hintLine1}</Text>
      {hintLine2 && <Text>{hintLine2}</Text>}
      <DynamicBorder color={(s) => fg("accent", s)} />
      {/* Overlay đổi tên */}
      {renameMode && (
        <Box flexDirection="column" width={width}>
          <Text>{theme.bold("Đổi tên phiên")}</Text>
          <Text> </Text>
          <TextInput value={renameInput} onChange={setRenameInput} />
          <Text> </Text>
          <Text>{fg("muted", "Enter để lưu · Esc để hủy")}</Text>
        </Box>
      )}
    </Box>
  );
};

// Helper truncateToWidth (nếu chưa có)
function truncateToWidth(text: string, width: number, ellipsis = "…"): string {
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return text;
  return text.slice(0, Math.max(0, width - ellipsis.length)) + ellipsis;
}

function visibleWidth(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

export default SessionSelector;