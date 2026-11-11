// TreeSelector - cây phiên làm việc để điều hướng nhánh
// Bắt chước nguyên tắc pi-mono components/tree-selector.ts:
//   - Làm phẳng cây: indent 3 ký tự mỗi cấp, connector ├─/└─
//   - Gutter "│" cho nhánh tổ tiên còn mở
//   - Gấp/mở nhánh: chỉ nhánh con có nhiều nhánh hoặc gốc mới gấp được
//   - Bộ lọc: default/no-tools/user-only/labeled-only/all
//   - Nhãn [label] + dấu thời gian; bấm để đổi nhãn
//   - Cuộn ngang khi mục chọn quá sâu so với khung nhìn
//   - Nhảy theo đoạn nhánh (segment start) với phím gấp/mở
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { TextInput } from "./TextInput.js";
import { truncateToWidth, visibleWidth, wrapTextWithAnsi } from "../core/index.js";
import { matchesKey } from "../core/Keys.js";

export type FilterMode = "default" | "no-tools" | "user-only" | "labeled-only" | "all";

/** Nút trong cây phiên (bề mặt tối thiểu mà picro cần). */
export interface SessionEntry {
  id: string;
  type: string;
  parentId?: string | null;
  timestamp?: string;
  message?: { role?: string; content?: unknown; stopReason?: string; errorMessage?: string };
  command?: string;
  toolCallId?: string;
  toolName?: string;
  customType?: string;
  content?: unknown;
  summary?: string;
  modelId?: string;
  thinkingLevel?: string;
  tokensBefore?: number;
  label?: string;
  path?: string;
  replacement?: string | null;
  targetId?: string;
}

export interface SessionTreeNode {
  entry: SessionEntry;
  children: SessionTreeNode[];
  label?: string;
  labelTimestamp?: string;
}

interface FlatNode {
  node: SessionTreeNode;
  indent: number;
  showConnector: boolean;
  isLast: boolean;
  gutters: Array<{ position: number; show: boolean }>;
  isVirtualRootChild: boolean;
}

const TREE_GUTTER_WIDTH = 2;
const MIN_ANCHOR_CONTENT = 4;
const MAX_ANCHOR_CONTENT = 20;

type ToolCallInfo = { name: string; arguments: Record<string, unknown> };

/** Trích text thuần từ nội dung một entry. */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (block && typeof block === "object" && "type" in block && (block as { type: string }).type === "text") {
      out += (block as { text?: string }).text ?? "";
    }
  }
  return out;
}

/** Gộp cây thành danh sách phẳng, ưu tiên nhánh chứa lá hoạt động lên trước. */
function flattenTree(roots: SessionTreeNode[], leafId: string | null): FlatNode[] {
  const result: FlatNode[] = [];
  const toolCalls = new Map<string, ToolCallInfo>();
  const multipleRoots = roots.length > 1;

  type StackItem = [SessionTreeNode, number, boolean, boolean, boolean, Array<{ position: number; show: boolean }>, boolean];
  const stack: StackItem[] = [];

  // Root chứa lá hoạt động lên trước.
  const containsActive = new Map<SessionTreeNode, boolean>();
  {
    const all: SessionTreeNode[] = [];
    const pre = [...roots];
    while (pre.length > 0) {
      const node = pre.pop()!;
      all.push(node);
      for (let i = node.children.length - 1; i >= 0; i--) pre.push(node.children[i]!);
    }
    for (let i = all.length - 1; i >= 0; i--) {
      const node = all[i]!;
      let has = leafId !== null && node.entry.id === leafId;
      for (const child of node.children) if (containsActive.get(child)) has = true;
      containsActive.set(node, has);
    }
  }
  const orderedRoots = [...roots].sort((a, b) => Number(containsActive.get(b)) - Number(containsActive.get(a)));
  for (let i = orderedRoots.length - 1; i >= 0; i--) {
    const isLast = i === orderedRoots.length - 1;
    stack.push([orderedRoots[i]!, multipleRoots ? 1 : 0, multipleRoots, multipleRoots, isLast, [], multipleRoots]);
  }

  while (stack.length > 0) {
    const [node, indent, justBranched, showConnector, isLast, gutters, isVirtualRootChild] = stack.pop()!;
    const entry = node.entry;

    if (entry.type === "message" && entry.message?.role === "assistant" && Array.isArray(entry.message.content)) {
      for (const block of entry.message.content as unknown[]) {
        if (block && typeof block === "object" && (block as { type?: string }).type === "toolCall") {
          const tc = block as { id?: string; name?: string; arguments?: Record<string, unknown> };
          if (tc.id) toolCalls.set(tc.id, { name: tc.name ?? "tool", arguments: tc.arguments ?? {} });
        }
      }
    }

    result.push({ node, indent, showConnector, isLast, gutters, isVirtualRootChild });

    const children = node.children;
    const multipleChildren = children.length > 1;
    const orderedChildren = [...children].sort(
      (a, b) => Number(containsActive.get(b)) - Number(containsActive.get(a)),
    );

    let childIndent: number;
    if (multipleChildren) childIndent = indent + 1;
    else if (justBranched && indent > 0) childIndent = indent + 1;
    else childIndent = indent;

    const connectorDisplayed = showConnector && !isVirtualRootChild;
    const displayIndent = multipleRoots ? Math.max(0, indent - 1) : indent;
    const connectorPosition = Math.max(0, displayIndent - 1);
    const childGutters = connectorDisplayed
      ? [...gutters, { position: connectorPosition, show: !isLast }]
      : gutters;

    for (let i = orderedChildren.length - 1; i >= 0; i--) {
      const childIsLast = i === orderedChildren.length - 1;
      stack.push([
        orderedChildren[i]!,
        childIndent,
        multipleChildren,
        multipleChildren,
        childIsLast,
        childGutters,
        false,
      ]);
    }
  }
  return result;
}

/** Văn bản tìm kiếm được của một nút. */
function searchableText(node: SessionTreeNode): string {
  const entry = node.entry;
  const parts: string[] = [];
  if (node.label) parts.push(node.label);
  if (entry.type === "message" && entry.message) {
    parts.push(entry.message.role ?? "");
    parts.push(extractText(entry.message.content));
    if (entry.message.role === "bashExecution" && entry.command) parts.push(entry.command);
  } else if (entry.type === "custom_message") {
    parts.push(entry.customType ?? "", extractText(entry.content));
  } else if (entry.type === "branch_summary") parts.push("tóm tắt nhánh", entry.summary ?? "");
  else if (entry.type === "compaction") parts.push("nén");
  else if (entry.type === "model_change") parts.push("mô hình", entry.modelId ?? "");
  else if (entry.type === "thinking_level_change") parts.push("suy nghĩ", entry.thinkingLevel ?? "");
  return parts.join(" ");
}

/** Nhãn hiển thị của một entry. */
function entryLabel(node: SessionTreeNode, toolCalls: Map<string, ToolCallInfo>, isSelected: boolean): string {
  const t = getTheme();
  const entry = node.entry;
  const normalize = (s: string) => s.replace(/[\n\t]/g, " ").trim();
  const bold = (s: string) => (isSelected ? t.bold(s) : s);
  let out = "";

  if (entry.type === "message" && entry.message) {
    const role = entry.message.role;
    if (role === "user") {
      out = bold(t.fg("accent", "user: ")) + normalize(extractText(entry.message.content));
    } else if (role === "assistant") {
      const text = normalize(extractText(entry.message.content));
      if (text) out = bold(t.fg("success", "assistant: ")) + text;
      else if (entry.message.stopReason === "aborted") out = bold(t.fg("success", "assistant: ")) + t.fg("muted", "(đã hủy)");
      else if (entry.message.errorMessage) out = bold(t.fg("success", "assistant: ")) + t.fg("error", normalize(entry.message.errorMessage).slice(0, 80));
      else out = bold(t.fg("success", "assistant: ")) + t.fg("muted", "(không nội dung)");
    } else if (role === "toolResult") {
      const call = entry.toolCallId ? toolCalls.get(entry.toolCallId) : undefined;
      out = call ? t.fg("muted", formatToolCall(call.name, call.arguments)) : t.fg("muted", `[${entry.toolName ?? "tool"}]`);
    } else if (role === "bashExecution") {
      out = t.fg("dim", `[bash]: ${normalize(entry.command ?? "")}`);
    } else {
      out = t.fg("dim", `[${role}]`);
    }
  } else if (entry.type === "custom_message") {
    out = t.fg("customMessageLabel", `[${entry.customType}]: `) + normalize(extractText(entry.content));
  } else if (entry.type === "compaction") {
    const tokens = Math.round((entry.tokensBefore ?? 0) / 1000);
    out = t.fg("borderAccent", `[nén: ${tokens}k token]`);
  } else if (entry.type === "branch_summary") {
    out = t.fg("warning", "[tóm tắt nhánh]: ") + normalize(entry.summary ?? "");
  } else if (entry.type === "model_change") {
    out = t.fg("dim", `[mô hình: ${entry.modelId}]`);
  } else if (entry.type === "thinking_level_change") {
    out = t.fg("dim", `[suy nghĩ: ${entry.thinkingLevel}]`);
  } else if (entry.type === "session_info") {
    out = entry.label
      ? [t.fg("dim", "[tiêu đề: "), t.fg("dim", entry.label), t.fg("dim", "]")].join("")
      : [t.fg("dim", "[tiêu đề: "), t.italic(t.fg("dim", "trống")), t.fg("dim", "]")].join("");
  } else if (entry.type === "label") {
    out = t.fg("dim", `[nhãn: ${entry.label ?? "(đã xóa)"}]`);
  } else if (entry.type === "context_edit") {
    out = t.fg("dim", `[ngữ cảnh ${entry.replacement === null ? "bỏ" : "thay"}: ${entry.targetId}]`);
  }
  return out;
}

function formatToolCall(name: string, args: Record<string, unknown>): string {
  const cmd = String(args.command ?? "").replace(/[\n\t]/g, " ").trim().slice(0, 50);
  if (name === "bash") return `[bash: ${cmd}${String(args.command ?? "").length > 50 ? "..." : ""}]`;
  const path = String(args.path ?? args.file_path ?? ".");
  return `[${name}: ${path}]`;
}

/** Chỉ báo lọc. */
function statusLabels(mode: FilterMode, showTime: boolean): string {
  const map: Record<FilterMode, string> = {
    default: "",
    "no-tools": " [no-tools]",
    "user-only": " [user]",
    "labeled-only": " [labeled]",
    all: " [all]",
  };
  return map[mode] + (showTime ? " [+thời gian]" : "");
}

const MODES: FilterMode[] = ["default", "no-tools", "user-only", "labeled-only", "all"];

export interface TreeSelectorProps {
  tree: SessionTreeNode[];
  currentLeafId: string | null;
  terminalHeight?: number;
  onSelect: (entryId: string) => void;
  onCancel: () => void;
  onLabelChange?: (entryId: string, label: string | undefined) => void;
  onCopy?: (text: string | undefined) => void;
  initialSelectedId?: string;
  initialFilterMode?: FilterMode;
  width?: number;
}

export const TreeSelector: React.FC<TreeSelectorProps> = ({
  tree,
  currentLeafId,
  terminalHeight = 24,
  onSelect,
  onCancel,
  onLabelChange,
  onCopy,
  initialSelectedId,
  initialFilterMode = "default",
  width = 80,
}) => {
  const t = getTheme();
  const allFlat = useMemo(() => flattenTree(tree, currentLeafId), [tree, currentLeafId]);
  const toolCalls = useMemo(() => {
    const map = new Map<string, ToolCallInfo>();
    for (const flat of allFlat) {
      const entry = flat.node.entry;
      if (entry.type === "message" && entry.message?.role === "assistant" && Array.isArray(entry.message.content)) {
        for (const block of entry.message.content as unknown[]) {
          if (block && typeof block === "object" && (block as { type?: string }).type === "toolCall") {
            const tc = block as { id?: string; name?: string; arguments?: Record<string, unknown> };
            if (tc.id) map.set(tc.id, { name: tc.name ?? "tool", arguments: tc.arguments ?? {} });
          }
        }
      }
    }
    return map;
  }, [allFlat]);

  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode);
  const [query, setQuery] = useState("");
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState(() => {
    const idx = allFlat.findIndex((f) => f.node.entry.id === (initialSelectedId ?? currentLeafId));
    return idx >= 0 ? idx : allFlat.length - 1;
  });
  const [showTime, setShowTime] = useState(false);
  const [labelInput, setLabelInput] = useState<{ id: string; value: string } | null>(null);

  // Lọc theo chế độ + truy vấn.
  const visible = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const kept = allFlat.filter((flat) => {
      const entry = flat.node.entry;
      if (entry.type === "usage") return false;
      const isLeaf = entry.id === currentLeafId;
      if (entry.type === "message" && entry.message?.role === "assistant" && !isLeaf) {
        const hasText = Boolean(extractText(entry.message.content).trim());
        const err = entry.message.stopReason && entry.message.stopReason !== "stop" && entry.message.stopReason !== "toolUse";
        if (!hasText && !err) return false;
      }
      let passes = true;
      const isSettings =
        entry.type === "label" || entry.type === "context_edit" || entry.type === "custom" ||
        entry.type === "model_change" || entry.type === "thinking_level_change" || entry.type === "session_info";
      switch (filterMode) {
        case "user-only":
          passes = entry.type === "message" && entry.message?.role === "user";
          break;
        case "no-tools":
          passes = !isSettings && !(entry.type === "message" && entry.message?.role === "toolResult");
          break;
        case "labeled-only":
          passes = flat.node.label !== undefined;
          break;
        case "all":
          passes = true;
          break;
        default:
          passes = !isSettings;
      }
      if (!passes) return false;
      if (tokens.length > 0) {
        const text = searchableText(flat.node).toLowerCase();
        return tokens.every((token) => text.includes(token));
      }
      return true;
    });
    // Loại con cháu của nút đã gấp.
    if (folded.size === 0) return kept;
    const skip = new Set<string>();
    for (const flat of allFlat) {
      const { id, parentId } = flat.node.entry;
      if (parentId != null && (folded.has(parentId) || skip.has(parentId))) skip.add(id);
    }
    return kept.filter((flat) => !skip.has(flat.node.entry.id));
  }, [allFlat, query, filterMode, folded, currentLeafId]);

  const maxVisible = Math.max(5, Math.floor(terminalHeight / 2));
  const clamped = Math.max(0, Math.min(selected, visible.length - 1));
  const start = Math.max(0, Math.min(clamped - Math.floor(maxVisible / 2), visible.length - maxVisible));
  const rows = visible.slice(start, start + maxVisible);

  /** Tìm nút gấp được: có con hiển thị và là gốc hoặc cha có nhiều con hiển thị. */
  const foldableIds = useMemo(() => {
    const childrenOf = new Map<string | null, string[]>([[null, []]]);
    const parentOf = new Map<string, string | null>();
    for (const flat of visible) {
      const id = flat.node.entry.id;
      const parent = findVisibleParent(allFlat, visible, id);
      parentOf.set(id, parent);
      const list = childrenOf.get(parent) ?? [];
      list.push(id);
      childrenOf.set(parent, list);
    }
    const can = new Set<string>();
    for (const [id, parent] of parentOf) {
      const children = childrenOf.get(id) ?? [];
      if (children.length === 0) continue;
      if (parent === null) {
        can.add(id);
        continue;
      }
      const siblings = childrenOf.get(parent) ?? [];
      if (siblings.length > 1) can.add(id);
    }
    return can;
  }, [visible, allFlat]);

  useInput((data, key) => {
    if (labelInput) {
      if (key.return) {
        const value = labelInput.value.trim();
        onLabelChange?.(labelInput.id, value || undefined);
        setLabelInput(null);
      } else if (matchesKey(data, "escape")) {
        setLabelInput(null);
      } else if (key.backspace) {
        setLabelInput({ ...labelInput, value: labelInput.value.slice(0, -1) });
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
        setLabelInput({ ...labelInput, value: labelInput.value + data });
      }
      return;
    }
    if (matchesKey(data, "escape")) {
      if (query) {
        setQuery("");
        setFolded(new Set());
      } else onCancel();
      return;
    }
    if (key.upArrow) setSelected((i) => (i <= 0 ? visible.length - 1 : i - 1));
    if (key.downArrow) setSelected((i) => (i >= visible.length - 1 ? 0 : i + 1));
    if (key.leftArrow || key.pageUp) setSelected((i) => Math.max(0, i - maxVisible));
    if (key.rightArrow || key.pageDown) setSelected((i) => Math.min(visible.length - 1, i + maxVisible));
    if (key.return) {
      const node = visible[clamped];
      if (node) onSelect(node.node.entry.id);
      return;
    }
    // Gấp/mở nhánh hoặc nhảy đoạn nhánh.
    if (matchesKey(data, "app.tree.foldOrUp") || data === "h") {
      const id = visible[clamped]?.node.entry.id;
      if (id && foldableIds.has(id) && !folded.has(id)) {
        setFolded((prev) => new Set(prev).add(id));
      } else {
        setSelected((i) => Math.max(0, i - 1));
      }
      return;
    }
    if (matchesKey(data, "app.tree.unfoldOrDown") || data === "l") {
      const id = visible[clamped]?.node.entry.id;
      if (id && folded.has(id)) setFolded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      else setSelected((i) => Math.min(visible.length - 1, i + 1));
      return;
    }
    // Xoay vòng bộ lọc.
    if (data === "\t" || matchesKey(data, "app.tree.filter.cycleForward")) {
      const idx = MODES.indexOf(filterMode);
      setFilterMode(MODES[(idx + 1) % MODES.length]!);
      setFolded(new Set());
      return;
    }
    // Bật/tắt thời gian nhãn.
    if (matchesKey(data, "app.tree.toggleLabelTimestamp")) {
      setShowTime((v) => !v);
      return;
    }
    // Sửa nhãn.
    if (matchesKey(data, "app.tree.editLabel") || data === "L") {
      const node = visible[clamped];
      if (node && onLabelChange) setLabelInput({ id: node.node.entry.id, value: node.node.label ?? "" });
      return;
    }
    // Sao chép nội dung nút.
    if (matchesKey(data, "app.message.copy") || data === "y") {
      onCopy?.(copyTextOf(visible[clamped]?.node));
      return;
    }
    if (key.backspace) {
      setQuery((q) => q.slice(0, -1));
      return;
    }
    if (data.length === 1 && data.charCodeAt(0) >= 32) setQuery((q) => q + data);
  });

  // Gấp nhãn: hiện ô nhập thay cho cây.
  if (labelInput) {
    return (
      <Box flexDirection="column" width={width}>
        <DynamicBorder />
        <Text bold>{t.fg("accent", "  Cây phiên")}</Text>
        <Text>{t.fg("muted", "  Nhãn (để trống để xóa):")}</Text>
        <TextInput value={labelInput.value} onChange={(v) => setLabelInput({ ...labelInput, value: v })} width={width - 2} />
        <Text>{t.fg("dim", "  Enter lưu · Esc hủy")}</Text>
        <DynamicBorder />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "  Cây phiên")}</Text>
      <Text>{t.fg("muted", "  ↑↓ di chuyển · ←→ trang · h/l gấp mở · y chép · L nhãn · t thời gian · Tab lọc · tìm bằng cách gõ")}</Text>
      <Text>{t.fg("muted", `  ${query ? `Tìm: ${query}` : "Gõ để tìm:"} `)}</Text>
      <DynamicBorder />
      <Text> </Text>
      {visible.length === 0 ? (
        <Text>{t.fg("muted", "  Không có mục nào")}</Text>
      ) : (
        rows.map((flat, i) => {
          const index = start + i;
          const isSelected = index === clamped;
          const entry = flat.node.entry;
          const cursor = isSelected ? t.fg("accent", "› ") : "  ";
          const displayIndent = visible.length > 0 && isMultiRoot(visible) ? Math.max(0, flat.indent - 1) : flat.indent;
          const connector = flat.showConnector && !flat.isVirtualRootChild ? (flat.isLast ? "└─ " : "├─ ") : "";
          const connectorPos = connector ? displayIndent - 1 : -1;
          const totalChars = displayIndent * 3;
          const prefix: string[] = [];
          for (let c = 0; c < totalChars; c++) {
            const level = Math.floor(c / 3);
            const posInLevel = c % 3;
            const gutter = flat.gutters.find((g) => g.position === level);
            if (gutter) prefix.push(posInLevel === 0 ? (gutter.show ? "│" : " ") : " ");
            else if (connector && level === connectorPos) {
              if (posInLevel === 0) prefix.push(flat.isLast ? "└" : "├");
              else if (posInLevel === 1) prefix.push(foldableIds.has(entry.id) ? (folded.has(entry.id) ? "⊞" : "⊟") : "─");
              else prefix.push(" ");
            } else prefix.push(" ");
          }
          const isOnPath = isActivePath(allFlat, entry.id, currentLeafId);
          const pathMark = isOnPath ? t.fg("accent", "• ") : "";
          const labelMark = flat.node.label ? t.fg("warning", `[${flat.node.label}] `) : "";
          const timeMark =
            showTime && flat.node.label && flat.node.labelTimestamp
              ? t.fg("muted", `${formatLabelTime(flat.node.labelTimestamp)} `)
              : "";
          const body = t.fg("dim", prefix.join("")) + pathMark + labelMark + timeMark + entryLabel(flat.node, toolCalls, isSelected);
          const clipWidth = Math.max(4, width - TREE_GUTTER_WIDTH);
          return (
            <Text key={`${entry.id}-${index}`}>
              {clipToWidth(`${cursor}${body}`, width)}
            </Text>
          );
        })
      )}
      <Text>{t.fg("muted", `  (${clamped + 1}/${visible.length})${statusLabels(filterMode, showTime)}`)}</Text>
      <DynamicBorder />
    </Box>
  );
};

/** Cha hiển thị gần nhất của một nút. */
function findVisibleParent(
  allFlat: FlatNode[],
  visible: FlatNode[],
  id: string,
): string | null {
  const visibleIds = new Set(visible.map((f) => f.node.entry.id));
  const byId = new Map(allFlat.map((f) => [f.node.entry.id, f]));
  let current = byId.get(id)?.node.entry.parentId ?? null;
  while (current !== null) {
    if (visibleIds.has(current)) return current;
    current = byId.get(current)?.node.entry.parentId ?? null;
  }
  return null;
}

/** Cây hiển thị có nhiều gốc không. */
function isMultiRoot(visible: FlatNode[]): boolean {
  let roots = 0;
  for (const flat of visible) if (flat.indent === 0 || flat.isVirtualRootChild) roots++;
  return roots > 1;
}

/** Nút có nằm trên đường từ gốc tới lá không. */
function isActivePath(allFlat: FlatNode[], id: string, leafId: string | null): boolean {
  if (!leafId) return false;
  const byId = new Map(allFlat.map((f) => [f.node.entry.id, f]));
  const path = new Set<string>();
  let current: string | null = leafId;
  while (current) {
    path.add(current);
    current = byId.get(current)?.node.entry.parentId ?? null;
  }
  return path.has(id);
}

/** Nội dung để sao chép của một nút. */
function copyTextOf(node: SessionTreeNode | undefined): string | undefined {
  if (!node) return undefined;
  const entry = node.entry;
  let text: string | undefined;
  if (entry.type === "message") {
    if (entry.message?.role === "bashExecution") text = entry.command;
    else text = extractText(entry.message?.content);
  } else if (entry.type === "custom_message") text = extractText(entry.content);
  else if (entry.type === "compaction" || entry.type === "branch_summary") text = entry.summary;
  return text?.trim() ? text : undefined;
}

function formatLabelTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  if (date.toDateString() === now.toDateString()) return `${hh}:${mm}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
  return `${date.getFullYear().toString().slice(-2)}/${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
}

/** Cắt dòng theo chiều rộng hiển thị, không tính ANSI. */
function clipToWidth(text: string, width: number): string {
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return text;
  return text.slice(0, Math.max(0, width - 1));
}

export { truncateToWidth, visibleWidth, wrapTextWithAnsi, extractText };
