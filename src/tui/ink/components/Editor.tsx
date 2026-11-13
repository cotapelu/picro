// Editor - ô nhập nhiều dòng kiểu pi-tui Editor
// Bắt chước nguyên tắc pi-tui components/editor.ts:
//   - Bản rộng logic (lines/cursorLine/cursorCol) tách bi với bản rộng hiển thị
//   - buildVisualLineMap: map dòng hiển thị <-> vị trí logic sau khi wrap
//   - Con trỏ dọc với cột "dính" (preferredVisualCol) theo bảng quyết định
//   - Lịch sử với bản nháp, kill-ring, undo theo cụm gõ
//   - Đánh dấu paste lớn thành [paste #N +X lines] và mở rộng khi gửi
//   - Tự cuộn để con trỏ luôn trong khung nhìn
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { KillRing } from "../core/KillRing.js";
import { UndoStack } from "../core/UndoStack.js";
import { findWordBackward, findWordForward } from "../core/WordNavigation.js";
import { visibleWidth, wrapTextWithAnsi } from "../core/TerminalText.js";
import { isWhitespaceChar } from "../core/TextPredicates.js";
import { matchesKey, decodePrintableKey } from "../core/Keys.js";
import { fuzzyFilter } from "../core/Fuzzy.js";
import type {
  AutocompleteItem,
  AutocompleteProvider,
  SlashCommand,
} from "../core/Autocomplete.js";
import { getKeybindings } from "../core/Keybindings.js";

export interface EditorProps {
  value?: string;
  /** Nhà cung cấp gợi ý (lệnh slash + đường dẫn). Không truyền = tắt autocomplete. */
  autocompleteProvider?: AutocompleteProvider;
  /** Số mục gợi ý tối đa. */
  autocompleteMaxVisible?: number;
  onSubmit?: (text: string) => void;
  onChange?: (text: string) => void;
  /** Tắt hành vi tự gửi (vd khi hội thoại đang xử lý). */
  disableSubmit?: boolean;
  /** Chiều rộng khung nhìn để wrap; mặc định 80. */
  width?: number;
  /**
   * Nhận phím điều hướng (mũi tên lên/xuống, PageUp/PageDown) để lớp ngoài can
   * thiệp — ví dụ cuộn transcript khi ô nhập rỗng thay vì duyệt lịch sử.
   */
  onKey?: (data: string, keys: { up: boolean; down: boolean; pageUp: boolean; pageDown: boolean }) => void;
  /**
   * Alt+Enter: xếp hàng nội dung thay vì gửi/xuống dòng (pi-mono
   * app.message.followUp). Terminal không có Shift+Enter thường gửi alt+enter
   * cho hành động này.
   */
  onQueue?: (text: string) => void;
  /** Ctrl+T: mở rộng/thu gọn tool output (pi-mono app.tools.expand). */
  onToggleExpand?: () => void;
  /** Hành động ứng dụng theo phím (pi-mono `onAction("app.*")`).
   * Editor là component duy nhất nhận useInput nên mọi phím toàn cục phải đi
   * qua đây: Ctrl+C/D/Z, Esc, Ctrl+G, Ctrl+V, Ctrl+P/N.
   */
  onAppAction?: (action: AppAction) => void;
  /** Ô nhập đang ở chế độ bash ("!" đầu dòng) → viền đổi màu. */
  bashMode?: boolean;
}

/** Hành động ứng dụng editor gửi lên lớp controller. */
export type AppAction =
  | "clear" // Ctrl+C (app.clear)
  | "exit" // Ctrl+D (app.exit)
  | "suspend" // Ctrl+Z (app.suspend)
  | "escape" // Esc
  | "externalEditor" // Ctrl+G (app.editor.external)
  | "clipboardPaste" // Ctrl+V
  | "modelCycleForward" // Ctrl+P (app.model.cycleForward)
  | "modelCycleBackward" // Ctrl+N (app.model.cycleBackward)
  | "dequeue" // Ctrl+O (app.message.dequeue)
  | "copyMessage"; // Ctrl+Y (app.message.copy)

interface EditorState {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
}

interface EditorSnapshot extends EditorState {
  pastes: Map<number, string>;
  pasteCounter: number;
}

interface LayoutLine {
  text: string;
  hasCursor: boolean;
  cursorPos?: number;
}

interface VisualLine {
  logicalLine: number;
  startCol: number;
  length: number;
}

interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

const PASTE_MARKER_REGEX = /\[paste #(\d+)( (\+\d+ lines|\d+ chars))?\]/g;
const PASTE_MARKER_SINGLE = /^\[paste #(\d+)( (\+\d+ lines|\d+ chars))?\]$/;
const MAX_HISTORY = 100;
const PASTE_MAX_LINES = 10;
const PASTE_MAX_CHARS = 1000;

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function segmentsOf(text: string): string[] {
  return [...graphemeSegmenter.segment(text)].map((s) => s.segment);
}

/** Chiều cao terminal hiện tại (theo dõi resize), dùng cho vùng xem editor. */
function useTerminalRows(): number {
  const [rows, setRows] = useState(() => process.stdout.rows || 24);
  useEffect(() => {
    const onResize = () => setRows(process.stdout.rows || 24);
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);
  return rows;
}

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

/**
 * Extract the payload of a bracketed-paste block, or null when `data` is not one.
 *
 * Terminal.ts enables bracketed paste and forwards a paste as
 * "\x1b[200~<content>\x1b[201~", which reaches useInput verbatim. That data
 * begins with ESC (0x1B), so any "is this printable input" check rejects it -
 * the paste used to be dropped on the floor.
 */
export function parsePastePayload(data: string): string | null {
  const start = data.indexOf(PASTE_START);
  if (start === -1) return null;
  const contentStart = start + PASTE_START.length;
  const end = data.indexOf(PASTE_END, contentStart);
  // A missing end marker previously made slice(start, -1) silently drop the last
  // character of the payload; treat everything after the start marker as content.
  return end === -1 ? data.slice(contentStart) : data.slice(contentStart, end);
}

/** Wrap một dòng thành chunk có đánh chỉ số nguồn. */
function wordWrapLine(line: string, maxWidth: number): TextChunk[] {
  if (!line || maxWidth <= 0) return [{ text: "", startIndex: 0, endIndex: 0 }];
  if (visibleWidth(line) <= maxWidth) {
    return [{ text: line, startIndex: 0, endIndex: line.length }];
  }

  const chunks: TextChunk[] = [];
  const segments = segmentsOf(line);
  let currentWidth = 0;
  let chunkStart = 0;
  let wrapOppIndex = -1;
  let wrapOppWidth = 0;

  const graphemeIndex: number[] = [];
  {
    let offset = 0;
    for (const seg of segments) {
      graphemeIndex.push(offset);
      offset += seg.length;
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const gWidth = visibleWidth(seg);
    const charIndex = graphemeIndex[i]!;
    const isWs = isWhitespaceChar(seg);

    if (currentWidth + gWidth > maxWidth) {
      if (wrapOppIndex >= 0 && currentWidth - wrapOppWidth + gWidth <= maxWidth) {
        chunks.push({ text: line.slice(chunkStart, wrapOppIndex), startIndex: chunkStart, endIndex: wrapOppIndex });
        chunkStart = wrapOppIndex;
        currentWidth -= wrapOppWidth;
      } else if (chunkStart < charIndex) {
        chunks.push({ text: line.slice(chunkStart, charIndex), startIndex: chunkStart, endIndex: charIndex });
        chunkStart = charIndex;
        currentWidth = 0;
      }
      wrapOppIndex = -1;
    }

    if (gWidth > maxWidth) {
      const sub = wordWrapLine(seg, maxWidth);
      for (let j = 0; j < sub.length - 1; j++) {
        const sc = sub[j]!;
        chunks.push({ text: sc.text, startIndex: charIndex + sc.startIndex, endIndex: charIndex + sc.endIndex });
      }
      const last = sub[sub.length - 1]!;
      chunkStart = charIndex + last.startIndex;
      currentWidth = visibleWidth(last.text);
      wrapOppIndex = -1;
      continue;
    }

    currentWidth += gWidth;
    const next = segments[i + 1];
    if (isWs && next && !isWhitespaceChar(next)) {
      wrapOppIndex = graphemeIndex[i + 1]!;
      wrapOppWidth = currentWidth;
    }
  }
  chunks.push({ text: line.slice(chunkStart), startIndex: chunkStart, endIndex: line.length });
  return chunks;
}

/** Ngắt một dòng logic thành các dòng hiển thị. */
function wrapLineIntoDisplay(line: string, maxWidth: number): string[] {
  if (line.length <= maxWidth) return [line];
  return wrapTextWithAnsi(line, maxWidth);
}

export interface EditorHandle {
  /** Nội dung hiển thị trong editor (chưa mở rộng paste marker). */
  getText(): string;
  /** Đặt lại nội dung (ví dụ sau khi gửi, hoặc khôi phục tin nhắn đã queue). */
  setText(text: string): void;
  /** Chèn văn bản tại con trỏ (clipboard paste, khôi phục hàng đợi). */
  insert(text: string): void;
  /** Vị trí con trỏ (0-based) trong chuỗi nhiều dòng. */
  getCursor(): number;
  /** Thêm vào lịch sử duyệt bằng mũi tên lên/xuống. */
  addToHistory(text: string): void;
}

/**
 * Lấy danh sách lệnh slash từ provider (nếu provider là CombinedAutocompleteProvider).
 *
 * AutocompleteProvider chuẩn không nhất thiết phải khai báo commands, nên ta đọc
 * field nội bộ qua duck-typing thay vì ép kiểu.
 */
function providerCommands(provider: AutocompleteProvider): SlashCommand[] | undefined {
  const commands = (provider as unknown as { commands?: SlashCommand[] }).commands;
  return Array.isArray(commands) ? commands : undefined;
}

export const Editor = React.forwardRef<EditorHandle, EditorProps>(
  (
    {
      value = "",
      onSubmit,
      onChange,
      disableSubmit = false,
      width = 80,
      onKey,
      onQueue,
      onToggleExpand,
      onAppAction,
      autocompleteProvider,
      autocompleteMaxVisible = 5,
    },
    ref,
  ) => {
  const [state, setState] = useState<EditorState>(() => ({
    lines: value.length > 0 ? value.split("\n") : [""],
    cursorLine: value.length > 0 ? value.split("\n").length - 1 : 0,
    cursorCol: value.length > 0 ? value.split("\n").at(-1)!.length : 0,
  }));
  const [pastes, setPastes] = useState<Map<number, string>>(new Map());
  const [pasteCounter, setPasteCounter] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  /** historyRef giữ giá trị mới nhất cho handle addToHistory không bị stale. */
  const historyRef = useRef(history);
  historyRef.current = history;
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historyDraft, setHistoryDraft] = useState<EditorState | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [focused, setFocused] = useState(true);
  /** Gợi ý đang mở (null = tắt). */
  const [autocomplete, setAutocompleteState] = useState<{
    items: AutocompleteItem[];
    prefix: string;
    selected: number;
  } | null>(null);
  /**
   * Bản ref của `autocomplete`.
   *
   * Ink's useInput handler đọc state qua useEffectEvent, nhưng khi state được
   * đổi từ một ref callback (refreshAutocomplete qua refreshAutocompleteRef) thì
   * handler vẫn đọc closure cũ; dùng ref giữ giá trị đọc được ngay trong handler.
   */
  const autocompleteRef = useRef<{
    items: AutocompleteItem[];
    prefix: string;
    selected: number;
  } | null>(null);
  autocompleteRef.current = autocomplete;

  /** Đặt gợi ý, đồng bộ cả state lẫn ref. */
  const setAutocomplete = useCallback(
    (next: { items: AutocompleteItem[]; prefix: string; selected: number } | null) => {
      autocompleteRef.current = next;
      setAutocompleteState(next);
    },
    [],
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const pastesRef = useRef(pastes);
  pastesRef.current = pastes;
  const counterRef = useRef(pasteCounter);
  counterRef.current = pasteCounter;

  const undoStack = useRef(new UndoStack<EditorSnapshot>());
  const killRing = useRef(new KillRing());
  const lastAction = useRef<"kill" | "yank" | "type-word" | null>(null);
  const preferredVisualCol = useRef<number | null>(null);
  const snappedFromCursorCol = useRef<number | null>(null);
  const lastWidth = useRef(width > 2 ? width - 1 : width);
  /** Hướng nhảy ký tự đang chờ ký tự đích, hoặc null. */
  const jumpMode = useRef<"forward" | "backward" | null>(null);

  const notifyChange = useCallback(
    (next: EditorState) => {
      onChange?.(next.lines.join("\n"));
    },
    [onChange],
  );

  const pushUndo = useCallback((current: EditorState) => {
    undoStack.current.push({
      ...current,
      pastes: new Map(pastesRef.current),
      pasteCounter: counterRef.current,
    });
  }, []);

  const setLines = useCallback(
    (next: EditorState, opts: { undo?: boolean } = {}) => {
      if (opts.undo) pushUndo(stateRef.current);
      stateRef.current = next;
      setState(next);
      notifyChange(next);
    },
    [notifyChange, pushUndo],
  );

  const buildVisualLineMap = useCallback((w: number): VisualLine[] => {
    const visual: VisualLine[] = [];
    stateRef.current.lines.forEach((line, i) => {
      if (line.length === 0) {
        visual.push({ logicalLine: i, startCol: 0, length: 0 });
        return;
      }
      if (visibleWidth(line) <= w) {
        visual.push({ logicalLine: i, startCol: 0, length: line.length });
        return;
      }
      for (const chunk of wordWrapLine(line, w)) {
        visual.push({ logicalLine: i, startCol: chunk.startIndex, length: chunk.endIndex - chunk.startIndex });
      }
    });
    return visual;
  }, []);

  const findVisualLineAt = useCallback((visual: VisualLine[], line: number, col: number): number => {
    for (let i = 0; i < visual.length; i++) {
      const vl = visual[i]!;
      if (vl.logicalLine !== line) continue;
      const offset = col - vl.startCol;
      const isLast = i === visual.length - 1 || visual[i + 1]?.logicalLine !== vl.logicalLine;
      if (offset >= 0 && (offset < vl.length || (isLast && offset === vl.length))) return i;
    }
    return visual.length - 1;
  }, []);

  /** Bố trí các dòng hiển thị kèm vị trí con trỏ. */
  const layoutText = useCallback(
    (contentWidth: number): LayoutLine[] => {
      const layoutLines: LayoutLine[] = [];
      const { lines, cursorLine, cursorCol } = stateRef.current;

      if (lines.length === 1 && lines[0] === "") {
        layoutLines.push({ text: "", hasCursor: true, cursorPos: 0 });
        return layoutLines;
      }

      lines.forEach((line, i) => {
        const isCurrent = i === cursorLine;
        if (line.length === 0) {
          layoutLines.push({ text: "", hasCursor: isCurrent, cursorPos: 0 });
          return;
        }
        const wrapped = wrapLineIntoDisplay(line, contentWidth);
        let consumed = 0;
        wrapped.forEach((text, idx) => {
          const isLastChunk = idx === wrapped.length - 1;
          if (!isCurrent) {
            layoutLines.push({ text, hasCursor: false });
          } else {
            const startIndex = consumed;
            const endIndex = consumed + text.length;
            let hasCursor: boolean;
            let adjusted: number;
            if (isLastChunk) {
              hasCursor = cursorCol >= startIndex;
              adjusted = cursorCol - startIndex;
            } else {
              hasCursor = cursorCol >= startIndex && cursorCol < endIndex;
              adjusted = hasCursor ? cursorCol - startIndex : 0;
            }
            layoutLines.push({
              text,
              hasCursor,
              cursorPos: Math.min(adjusted, text.length),
            });
          }
          consumed += text.length;
        });
      });
      return layoutLines;
    },
    [],
  );

  const insertCharacter = useCallback(
    (char: string) => {
      const current = stateRef.current;
      if (isWhitespaceChar(char) || lastAction.current !== "type-word") pushUndo(current);
      lastAction.current = "type-word";

      const line = current.lines[current.cursorLine] ?? "";
      const before = line.slice(0, current.cursorCol);
      const after = line.slice(current.cursorCol);
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = before + char + after;
      setLines({
        ...current,
        lines: nextLines,
        cursorCol: current.cursorCol + char.length,
      });
      // Gõ "/" ở đầu dòng hoặc ký tự kích hoạt -> mở gợi ý.
      // refreshAutocomplete khai báo phía dưới nên giữ qua ref để tránh phụ
      // thuộc vòng giữa hai useCallback.
      refreshAutocompleteRef.current(char);
    },
    [pushUndo, setLines],
  );

  const refreshAutocompleteRef = useRef<(char: string) => void>(() => {});

  /**
   * Chèn một đoạn văn bản (một hoặc nhiều dòng) tại con trỏ, ATOMIC.
   *
   * Caller đã pushUndo trước đó, nên hàm này không push thêm snapshot: bản cũ
   * gọi setLines (mặc định undo:false) cho paste một dòng, khiến paste không
   * hoàn tác được, còn nhánh marker lại chèn giữa hai snapshot undo -> lệch state.
   */
  const insertTextAtomic = useCallback(
    (text: string) => {
      const current = stateRef.current;
      const inserted = text.split("\n");
      const line = current.lines[current.cursorLine] ?? "";
      const before = line.slice(0, current.cursorCol);
      const after = line.slice(current.cursorCol);

      if (inserted.length === 1) {
        const nextLines = [...current.lines];
        nextLines[current.cursorLine] = before + text + after;
        setLines(
          { ...current, lines: nextLines, cursorCol: current.cursorCol + text.length },
          { undo: false },
        );
        return;
      }
      const nextLines = [
        ...current.lines.slice(0, current.cursorLine),
        before + inserted[0]!,
        ...inserted.slice(1, -1),
        inserted[inserted.length - 1]! + after,
        ...current.lines.slice(current.cursorLine + 1),
      ];
      setLines(
        {
          ...current,
          lines: nextLines,
          cursorLine: current.cursorLine + inserted.length - 1,
          cursorCol: inserted[inserted.length - 1]!.length,
        },
        { undo: false },
      );
    },
    [setLines],
  );

  /**
   * Xóa một paste marker khỏi registry và ĐÁNH SỐ LẠI các marker còn lại.
   *
   * Không đổi số id thì sau khi xóa `[paste #1]` trong khi `[paste #2]` còn
   * tồn tại, lần submit sau sẽ mở rộng đúng nội dung nhưng editor hiển thị id
   * không khớp registry; xóa lần nữa cùng một marker sẽ không còn gì để xóa.
   * Cách làm của pi-mono: dời id lớn hơn xuống 1 và viết lại marker trong text.
   */
  const removePasteMarker = useCallback(
    (targetId: number) => {
      const nextMap = new Map(pastesRef.current);
      nextMap.delete(targetId);
      const higher = [...nextMap.keys()].filter((id) => id > targetId).sort((a, b) => a - b);
      for (const id of higher) {
        nextMap.set(id - 1, nextMap.get(id)!);
        nextMap.delete(id);
      }
      pastesRef.current = nextMap;
      setPastes(nextMap);
      setPasteCounter((c) => Math.max(0, c - 1));
      const current = stateRef.current;
      const renumbered = current.lines.map((line) =>
        line.replace(PASTE_MARKER_REGEX, (full, idGroup, suffixGroup) => {
          const id = Number(idGroup);
          if (id <= targetId) return full;
          return `[paste #${id - 1}${suffixGroup ?? ""}]`;
        }),
      );
      setLines({ ...current, lines: renumbered }, { undo: false });
    },
    [setLines],
  );

  const addNewLine = useCallback(() => {
    const current = stateRef.current;
    pushUndo(current);
    lastAction.current = null;

    const line = current.lines[current.cursorLine] ?? "";
    const before = line.slice(0, current.cursorCol);
    const after = line.slice(current.cursorCol);
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = before;
    nextLines.splice(current.cursorLine + 1, 0, after);
    setLines({ ...current, lines: nextLines, cursorLine: current.cursorLine + 1, cursorCol: 0 });
  }, [pushUndo, setLines]);

  const handleBackspace = useCallback(() => {
    const current = stateRef.current;
    if (current.cursorCol > 0) {
      pushUndo(current);
      lastAction.current = null;
      const line = current.lines[current.cursorLine] ?? "";
      const before = line.slice(0, current.cursorCol);
      const segs = segmentsOf(before);
      const remove = segs.at(-1)?.length ?? 1;
      // Xóa trọn một paste marker thì phải dọn registry và đánh số lại, nếu không
      // id còn trong text không còn khớp nội dung đã lưu (và marker bị xóa lần 2
      // sẽ không tìm thấy gì để mở rộng khi submit).
      const marker = PASTE_MARKER_SINGLE.exec(segs.at(-1) ?? "");
      const trimmed = before.slice(0, before.length - remove);
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = trimmed + line.slice(current.cursorCol);
      if (marker) {
        removePasteMarker(Number(marker[1]));
        return;
      }
      setLines({ ...current, lines: nextLines, cursorCol: current.cursorCol - remove });
      return;
    }
    if (current.cursorLine > 0) {
      pushUndo(current);
      lastAction.current = null;
      const prev = current.lines[current.cursorLine - 1] ?? "";
      const cur = current.lines[current.cursorLine] ?? "";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine - 1] = prev + cur;
      nextLines.splice(current.cursorLine, 1);
      setLines({ ...current, lines: nextLines, cursorLine: current.cursorLine - 1, cursorCol: prev.length });
    }
  }, [pushUndo, removePasteMarker, setLines]);

  const deleteToLineStart = useCallback(() => {
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol > 0) {
      pushUndo(current);
      const deleted = line.slice(0, current.cursorCol);
      killRing.current.push(deleted, { prepend: true, accumulate: lastAction.current === "kill" });
      lastAction.current = "kill";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = line.slice(current.cursorCol);
      setLines({ ...current, lines: nextLines, cursorCol: 0 });
    } else if (current.cursorLine > 0) {
      pushUndo(current);
      killRing.current.push("\n", { prepend: true, accumulate: lastAction.current === "kill" });
      lastAction.current = "kill";
      const prev = current.lines[current.cursorLine - 1] ?? "";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine - 1] = prev + line;
      nextLines.splice(current.cursorLine, 1);
      setLines({ ...current, lines: nextLines, cursorLine: current.cursorLine - 1, cursorCol: prev.length });
    }
  }, [pushUndo, setLines]);

  const deleteToLineEnd = useCallback(() => {
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol < line.length) {
      pushUndo(current);
      const deleted = line.slice(current.cursorCol);
      killRing.current.push(deleted, { prepend: false, accumulate: lastAction.current === "kill" });
      lastAction.current = "kill";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = line.slice(0, current.cursorCol);
      setLines({ ...current, lines: nextLines });
    } else if (current.cursorLine < current.lines.length - 1) {
      pushUndo(current);
      killRing.current.push("\n", { prepend: false, accumulate: lastAction.current === "kill" });
      lastAction.current = "kill";
      const next = current.lines[current.cursorLine + 1] ?? "";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = line + next;
      nextLines.splice(current.cursorLine + 1, 1);
      setLines({ ...current, lines: nextLines });
    }
  }, [pushUndo, setLines]);

  const deleteWordBackwards = useCallback(() => {
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol === 0) {
      if (current.cursorLine > 0) {
        pushUndo(current);
        killRing.current.push("\n", { prepend: true, accumulate: lastAction.current === "kill" });
        lastAction.current = "kill";
        const prev = current.lines[current.cursorLine - 1] ?? "";
        const nextLines = [...current.lines];
        nextLines[current.cursorLine - 1] = prev + line;
        nextLines.splice(current.cursorLine, 1);
        setLines({ ...current, lines: nextLines, cursorLine: current.cursorLine - 1, cursorCol: prev.length });
      }
      return;
    }
    pushUndo(current);
    const wasKill = lastAction.current === "kill";
    const oldCol = current.cursorCol;
    const target = findWordBackward(line, oldCol);
    const deleted = line.slice(target, oldCol);
    killRing.current.push(deleted, { prepend: true, accumulate: wasKill });
    lastAction.current = "kill";
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = line.slice(0, target) + line.slice(oldCol);
    setLines({ ...current, lines: nextLines, cursorCol: target });
  }, [pushUndo, setLines]);

  const yank = useCallback(() => {
    const text = killRing.current.peek();
    if (!text) return;
    const current = stateRef.current;
    pushUndo(current);
    lastAction.current = "yank";
    const line = current.lines[current.cursorLine] ?? "";
    const before = line.slice(0, current.cursorCol);
    const after = line.slice(current.cursorCol);
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = before + text + after;
    setLines({ ...current, lines: nextLines, cursorCol: current.cursorCol + text.length });
  }, [pushUndo, setLines]);

  const yankPop = useCallback(() => {
    if (lastAction.current !== "yank" || killRing.current.length <= 1) return;
    const current = stateRef.current;
    pushUndo(current);
    const prev = killRing.current.peek() ?? "";
    const line = current.lines[current.cursorLine] ?? "";
    const stripped = line.slice(0, current.cursorCol - prev.length) + line.slice(current.cursorCol);
    killRing.current.rotate();
    const text = killRing.current.peek() ?? "";
    const before = stripped.slice(0, current.cursorCol - prev.length);
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = before + text + stripped.slice(current.cursorCol - prev.length);
    setLines({ ...current, lines: nextLines, cursorCol: current.cursorCol - prev.length + text.length });
    lastAction.current = "yank";
  }, [pushUndo, setLines]);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    pastesRef.current = snapshot.pastes;
    setPastes(snapshot.pastes);
    setPasteCounter(snapshot.pasteCounter);
    lastAction.current = null;
    setLines({ lines: snapshot.lines, cursorLine: snapshot.cursorLine, cursorCol: snapshot.cursorCol }, { undo: false });
  }, [setLines]);

  const navigateHistory = useCallback(
    (direction: 1 | -1) => {
      if (history.length === 0) return;
      lastAction.current = null;
      const nextIndex = historyIndex - direction;
      if (nextIndex < -1 || nextIndex >= history.length) return;

      if (historyIndex === -1 && nextIndex >= 0) {
        pushUndo(stateRef.current);
        setHistoryDraft(stateRef.current);
      }
      setHistoryIndex(nextIndex);

      if (nextIndex === -1) {
        const draft = historyDraft;
        setHistoryDraft(null);
        if (draft) {
          setLines(draft);
          preferredVisualCol.current = null;
          snappedFromCursorCol.current = null;
          setScrollOffset(0);
        } else {
          setLines({ lines: [""], cursorLine: 0, cursorCol: 0 });
        }
      } else {
        const text = history[nextIndex] ?? "";
        const lines = text.split("\n");
        setLines(
          direction === -1
            ? { lines, cursorLine: 0, cursorCol: 0 }
            : { lines, cursorLine: lines.length - 1, cursorCol: lines.at(-1)!.length },
        );
      }
    },
    [history, historyIndex, historyDraft, pushUndo, setLines],
  );

  /** Di chuyển con trỏ về trước một từ (giữ nguyên dòng). */
  const moveWordBackwards = useCallback(() => {
    lastAction.current = null;
    preferredVisualCol.current = null;
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol === 0) {
      if (current.cursorLine > 0) {
        const prevLen = (current.lines[current.cursorLine - 1] ?? "").length;
        setLines({ ...current, cursorLine: current.cursorLine - 1, cursorCol: prevLen });
      }
      return;
    }
    setLines({ ...current, cursorCol: findWordBackward(line, current.cursorCol) });
  }, [setLines]);

  /** Di chuyển con trỏ tới trước một từ (giữ nguyên dòng). */
  const moveWordForwards = useCallback(() => {
    lastAction.current = null;
    preferredVisualCol.current = null;
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol >= line.length) {
      if (current.cursorLine < current.lines.length - 1) {
        setLines({ ...current, cursorLine: current.cursorLine + 1, cursorCol: 0 });
      }
      return;
    }
    setLines({ ...current, cursorCol: findWordForward(line, current.cursorCol) });
  }, [setLines]);

  /** Xóa ký tự ngay sau con trỏ (Delete), gộp dòng khi ở cuối dòng. */
  const handleForwardDelete = useCallback(() => {
    lastAction.current = null;
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol < line.length) {
      pushUndo(current);
      const segs = segmentsOf(line.slice(current.cursorCol));
      const remove = segs[0]?.length ?? 1;
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = line.slice(0, current.cursorCol) + line.slice(current.cursorCol + remove);
      setLines({ ...current, lines: nextLines });
      return;
    }
    if (current.cursorLine < current.lines.length - 1) {
      pushUndo(current);
      const next = current.lines[current.cursorLine + 1] ?? "";
      const nextLines = [...current.lines];
      nextLines[current.cursorLine] = line + next;
      nextLines.splice(current.cursorLine + 1, 1);
      setLines({ ...current, lines: nextLines });
    }
  }, [pushUndo, setLines]);

  /** Xóa về trước một từ (Ctrl+W), gộp dòng khi ở đầu dòng. */
  const deleteWordForward = useCallback(() => {
    lastAction.current = null;
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    if (current.cursorCol >= line.length) {
      if (current.cursorLine < current.lines.length - 1) {
        pushUndo(current);
        killRing.current.push("\n", { prepend: false, accumulate: lastAction.current === "kill" });
        lastAction.current = "kill";
        const next = current.lines[current.cursorLine + 1] ?? "";
        const nextLines = [...current.lines];
        nextLines[current.cursorLine] = line + next;
        nextLines.splice(current.cursorLine + 1, 1);
        setLines({ ...current, lines: nextLines });
      }
      return;
    }
    pushUndo(current);
    const wasKill = lastAction.current === "kill";
    const oldCol = current.cursorCol;
    const target = findWordForward(line, oldCol);
    killRing.current.push(line.slice(oldCol, target), { prepend: false, accumulate: wasKill });
    lastAction.current = "kill";
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = line.slice(0, oldCol) + line.slice(target);
    setLines({ ...current, lines: nextLines });
  }, [pushUndo, setLines]);

  /** Cuộn một trang (30% chiều cao terminal, tối thiểu 5 dòng). */
  const pageScroll = useCallback((direction: -1 | 1) => {
    lastAction.current = null;
    const visual = buildVisualLineMap(lastWidth.current);
    const currentVisual = findVisualLineAt(visual, stateRef.current.cursorLine, stateRef.current.cursorCol);
    const pageSize = Math.max(5, Math.floor((process.stdout.rows || 24) * 0.3));
    const target = Math.max(0, Math.min(visual.length - 1, currentVisual + direction * pageSize));
    if (target === currentVisual) return;
    // Tái dùng logic di chuyển dọc (đã khai báo phía dưới) để giữ đúng "cột dính".
    moveCursorVerticalRef.current(target - currentVisual);
  }, [buildVisualLineMap, findVisualLineAt]);

  /** Nhảy tới ký tự chỉ định theo hướng (Ctrl+] / Ctrl+Alt+]). */
  const jumpToChar = useCallback((char: string, direction: "forward" | "backward") => {
    lastAction.current = null;
    const current = stateRef.current;
    const isForward = direction === "forward";
    const end = isForward ? current.lines.length : -1;
    const step = isForward ? 1 : -1;
    for (let lineIdx = current.cursorLine; lineIdx !== end; lineIdx += step) {
      const line = current.lines[lineIdx] ?? "";
      const isCurrent = lineIdx === current.cursorLine;
      const from = isCurrent ? (isForward ? current.cursorCol + 1 : current.cursorCol - 1) : undefined;
      const idx = isForward ? line.indexOf(char, from) : line.lastIndexOf(char, from);
      if (idx !== -1) {
        setLines({ ...current, cursorLine: lineIdx, cursorCol: idx });
        return;
      }
    }
  }, [setLines]);

  /**
   * Di chuyển con trỏ tới một dòng hiển thị mục tiêu, áp bảng quyết định
   * "cột dính" (preferredVisualCol) để di chuyển lên/xuống qua nhiều dòng wrap
   * không nhảy cột. Dùng chung cho mũi tên dọc và cuộn trang.
   */
  const moveToVisualLine = useCallback(
    (visual: VisualLine[], currentVisual: number, targetVisual: number) => {
      const current = stateRef.current;
      const curVL = visual[currentVisual];
      const tgtVL = visual[targetVisual];
      if (!curVL || !tgtVL) return;

      const isLastSource =
        currentVisual === visual.length - 1 || visual[currentVisual + 1]?.logicalLine !== curVL.logicalLine;
      const sourceMax = isLastSource ? curVL.length : Math.max(0, curVL.length - 1);
      const isLastTarget =
        targetVisual === visual.length - 1 || visual[targetVisual + 1]?.logicalLine !== tgtVL.logicalLine;
      const targetMax = isLastTarget ? tgtVL.length : Math.max(0, tgtVL.length - 1);

      const currentVisualCol = current.cursorCol - curVL.startCol;
      const hasPreferred = preferredVisualCol.current !== null;
      const cursorInMiddle = currentVisualCol < sourceMax;
      const targetTooShort = targetMax < currentVisualCol;

      let moveTo: number;
      if (!hasPreferred || cursorInMiddle) {
        if (targetTooShort) {
          preferredVisualCol.current = currentVisualCol;
          moveTo = targetMax;
        } else {
          preferredVisualCol.current = null;
          moveTo = currentVisualCol;
        }
      } else {
        const cantFit = targetMax < preferredVisualCol.current!;
        if (targetTooShort || cantFit) {
          moveTo = targetMax;
        } else {
          moveTo = preferredVisualCol.current!;
          preferredVisualCol.current = null;
        }
      }

      const logicalLine = current.lines[tgtVL.logicalLine] ?? "";
      let col = Math.min(tgtVL.startCol + moveTo, logicalLine.length);
      // Dính vào đầu grapheme để con trỏ không nằm giữa ký tự.
      const segs = segmentsOf(logicalLine.slice(0, col));
      let offset = 0;
      for (const seg of segs) {
        if (offset + seg.length >= col && seg.length > 1) {
          col = offset;
          break;
        }
        offset += seg.length;
      }
      lastAction.current = null;
      setLines({ ...current, cursorLine: tgtVL.logicalLine, cursorCol: col });
    },
    [setLines],
  );

  const moveCursorVertical = useCallback(
    (delta: number) => {
      const current = stateRef.current;
      const visual = buildVisualLineMap(lastWidth.current);
      const currentVisual = findVisualLineAt(visual, current.cursorLine, current.cursorCol);
      const target = currentVisual + delta;
      if (target < 0 || target >= visual.length) return;
      moveToVisualLine(visual, currentVisual, target);
    },
    [buildVisualLineMap, findVisualLineAt, moveToVisualLine],
  );
  // pageScroll khai báo trước moveCursorVertical nên giữ qua ref để tránh
  // phụ thuộc vòng giữa hai useCallback.
  const moveCursorVerticalRef = useRef(moveCursorVertical);
  moveCursorVerticalRef.current = moveCursorVertical;

  // Handle cho phép cha (MessageInput/InteractiveController) đọc-ghi nội dung editor
  // và nối history từ bên ngoài — đúng vai trò EditorComponent của pi-mono.
  useImperativeHandle(
    ref,
    () => ({
      getText: () => stateRef.current.lines.join("\n"),
      setText: (text: string) => {
        const lines = text.split("\n");
        stateRef.current = { lines, cursorLine: lines.length - 1, cursorCol: lines.at(-1)?.length ?? 0 };
        setState(stateRef.current);
        notifyChange(stateRef.current);
      },
      insert: (text: string) => {
        // Không có nội dung thì thay toàn bộ (tránh dấu xuống dòng đầu).
        const current = stateRef.current;
        if (current.lines.length === 1 && current.lines[0] === "") {
          stateRef.current = { lines: text.split("\n"), cursorLine: 0, cursorCol: 0 };
          setState(stateRef.current);
          notifyChange(stateRef.current);
          return;
        }
        pushUndo(current);
        insertTextAtomic(text);
      },
      getCursor: () => {
        const current = stateRef.current;
        let offset = 0;
        for (let i = 0; i < current.cursorLine; i++) offset += (current.lines[i] ?? "").length + 1;
        return offset + current.cursorCol;
      },
      addToHistory: (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (historyRef.current.length > 0 && historyRef.current[0] === trimmed) return;
        setHistory((prev) => [trimmed, ...prev].slice(0, MAX_HISTORY));
      },
    }),
    [notifyChange, pushUndo, insertTextAtomic],
  );

  const submit = useCallback(() => {
    if (disableSubmit) return;
    const current = stateRef.current;
    let text = current.lines.join("\n");
    // Mở rộng marker paste trước khi gửi.
    for (const [id, content] of pastesRef.current) {
      const re = new RegExp(`\\[paste #${id}( (\\+\\d+ lines|\\d+ chars))?\\]`, "g");
      text = text.replace(re, () => content);
    }
    text = text.trim();
    if (!text) return;

    const trimmed = text.length > 0 ? text : "";
    if (history.length === 0 || history[0] !== trimmed) {
      setHistory((prev) => {
        const next = [trimmed, ...prev];
        return next.slice(0, MAX_HISTORY);
      });
    }
    setHistoryIndex(-1);
    setHistoryDraft(null);
    setPastes(new Map());
    setPasteCounter(0);
    undoStack.current.clear();
    lastAction.current = null;
    setLines({ lines: [""], cursorLine: 0, cursorCol: 0 }, { undo: false });
    onSubmit?.(text);
  }, [disableSubmit, history, onSubmit, setLines]);


  /** Vô hiệu hóa gợi ý. */
  const closeAutocomplete = useCallback(() => setAutocomplete(null), []);

  /** Lấy gợi ý cho văn bản trước con trỏ. */
  const refreshAutocomplete = useCallback(
    (force = false) => {
      const provider = autocompleteProvider;
      if (!provider) return;
      const current = stateRef.current;
      const line = current.lines[current.cursorLine] ?? "";
      const before = line.slice(0, current.cursorCol);
      const trimmed = before.trimStart();
      // Lệnh slash: chỉ khi bắt đầu dòng (như pi-mono: slash menu ở đầu message).
      if (trimmed.startsWith("/") && !trimmed.includes(" ")) {
        const prefix = trimmed.slice(1);
        const items = fuzzyFilter(
          (providerCommands(provider) ?? []).map((cmd) => ({
            value: cmd.name,
            label: cmd.name,
            description: cmd.description ?? cmd.argumentHint,
          })),
          prefix,
          (item) => `${item.value} ${item.description ?? ""}`,
        );
        if (items.length === 0) {
          closeAutocomplete();
          return;
        }
        setAutocomplete({ items: items.slice(0, autocompleteMaxVisible), prefix, selected: 0 });
        return;
      }
      // Đường dẫn: token trước con trỏ trông như đường dẫn.
      if (force || /(^|[\s@])[.~\w][\w./\-]*$/.test(before)) {
        const token = before.split(/[\s(){}<>`"']/).at(-1) ?? "";
        void provider
          .getSuggestions(current.lines, current.cursorLine, current.cursorCol, {
            signal: new AbortController().signal,
            force,
          })
          .then((result) => {
            if (!result || result.items.length === 0) {
              closeAutocomplete();
              return;
            }
            setAutocomplete({
              items: result.items.slice(0, autocompleteMaxVisible),
              prefix: result.prefix,
              selected: 0,
            });
          })
          .catch(() => closeAutocomplete());
        return;
      }
      closeAutocomplete();
    },
    [autocompleteProvider, autocompleteMaxVisible, closeAutocomplete],
  );

  // Cập nhật ref để insertCharacter gọi được (khai báo trước đó).
  refreshAutocompleteRef.current = (char: string) => {
    if (char === "/" || char === "@") {
      refreshAutocomplete();
      return;
    }
    if (stateRef.current.lines[stateRef.current.cursorLine]?.trimStart().startsWith("/")) {
      refreshAutocomplete();
    }
  };

  /** Chèn mục đang chọn vào dòng hiện tại. */
  const applyAutocomplete = useCallback(() => {
    const state = autocompleteRef.current;
    if (!state) return false;
    const item = state.items[state.selected];
    if (!item) return false;
    const current = stateRef.current;
    const line = current.lines[current.cursorLine] ?? "";
    const before = line.slice(0, current.cursorCol - state.prefix.length);
    const after = line.slice(current.cursorCol);
    const isSlash = before.trim() === "" && line.trimStart().startsWith("/");
    const value = isSlash ? `/${item.value}` : item.value;
    const suffix = isSlash ? " " : "";
    const nextLines = [...current.lines];
    nextLines[current.cursorLine] = `${before}${value}${suffix}${after}`;
    closeAutocomplete();
    setLines(
      { ...current, lines: nextLines, cursorCol: before.length + value.length + suffix.length },
      { undo: false },
    );
    return true;
  }, [autocomplete, closeAutocomplete, setLines]);

  /** Đánh dấu paste lớn, chèn thay vì dán toàn bộ. */
  const handlePaste = useCallback(
    (pasted: string) => {
      pushUndo(stateRef.current);
      lastAction.current = null;

      // Chuẩn hóa: xuống dòng, tab -> 4 space, và bỏ ký tự điều khiển trừ \n.
      let clean = pasted
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, "    ");
      // Dán đường dẫn thì thêm một space nếu ký tự trước con trỏ là ký tự từ,
      // để path không dính vào chữ (pi-mono: readability cho file attachment).
      if (/^[/~.]/.test(clean)) {
        const line = stateRef.current.lines[stateRef.current.cursorLine] ?? "";
        const before = stateRef.current.cursorCol > 0 ? line[stateRef.current.cursorCol - 1] : "";
        if (before && /\w/.test(before)) clean = ` ${clean}`;
      }
      const lines = clean.split("\n");
      const totalChars = clean.length;

      if (lines.length > PASTE_MAX_LINES || totalChars > PASTE_MAX_CHARS) {
        const id = counterRef.current + 1;
        const nextMap = new Map(pastesRef.current);
        nextMap.set(id, clean);
        pastesRef.current = nextMap;
        setPastes(nextMap);
        setPasteCounter(id);
        const marker =
          lines.length > PASTE_MAX_LINES
            ? `[paste #${id} +${lines.length} lines]`
            : `[paste #${id} ${totalChars} chars]`;
        insertTextAtomic(marker);
        return;
      }
      insertTextAtomic(clean);
    },
    [insertTextAtomic, pushUndo],
  );

  const kb = getKeybindings();

  useInput((data, key) => {
    // Phím toàn cục của ứng dụng. Ink không còn exitOnCtrlC nên Ctrl+C phải được
    // route về controller: lần đầu xóa ô nhập, lần hai trong 500ms mới thoát.
    if (key.ctrl && data === "\u0003") {
      onAppAction?.("clear");
      return;
    }
    if (key.ctrl && data === "\u0004") {
      onAppAction?.("exit");
      return;
    }
    if (key.ctrl && data === "\u001a") {
      onAppAction?.("suspend");
      return;
    }
    if (key.ctrl && data === "g") {
      onAppAction?.("externalEditor");
      return;
    }
    if (key.ctrl && data === "v") {
      onAppAction?.("clipboardPaste");
      return;
    }
    if (key.ctrl && data === "p") {
      onAppAction?.("modelCycleForward");
      return;
    }
    if (key.ctrl && data === "n") {
      onAppAction?.("modelCycleBackward");
      return;
    }
    if (key.ctrl && data === "o") {
      onAppAction?.("dequeue");
      return;
    }
    if (key.ctrl && data === "y") {
      onAppAction?.("copyMessage");
      return;
    }

    // --- Gợi ý đang mở: điều hướng + chọn ---
    if (autocompleteRef.current) {
      if (matchesKey(data, "escape")) {
        closeAutocomplete();
        return;
      }
      if (matchesKey(data, "up")) {
        setAutocomplete({
          ...autocompleteRef.current,
          selected:
            autocompleteRef.current.selected === 0
              ? autocompleteRef.current.items.length - 1
              : autocompleteRef.current.selected - 1,
        });
        return;
      }
      if (matchesKey(data, "down")) {
        setAutocomplete({
          ...autocompleteRef.current,
          selected:
            autocompleteRef.current.selected === autocompleteRef.current.items.length - 1
              ? 0
              : autocompleteRef.current.selected + 1,
        });
        return;
      }
      // Ink báo Tab là chuỗi rỗng + key.tab (không phải "\t").
      if (data === "\t" || key.tab) {
        applyAutocomplete();
        return;
      }
      if (matchesKey(data, "enter")) {
        const wasSlash = autocompleteRef.current.prefix.length > 0 && (stateRef.current.lines[stateRef.current.cursorLine] ?? "").trimStart().startsWith("/");
        if (applyAutocomplete() && wasSlash) {
          // Chọn lệnh slash xong thì gửi luôn (pi-mono: Tab chọn, Enter gửi).
          submit();
          return;
        }
        return;
      }
    }
    // Esc khi KHÔNG có autocomplete: huỷ stream / thoát bash mode / mở tree
    // (pi-mono defaultEditor.onEscape).
    if (matchesKey(data, "escape")) {
      onAppAction?.("escape");
      return;
    }

    // Ctrl+T: mở rộng/thu gọn tool output toàn cục.
    if (key.ctrl && data === "t" && onToggleExpand) {
      onToggleExpand();
      return;
    }

    // Ink không thể phân biệt Alt+Enter (nó nuốt ESC của "\x1b\r" và chỉ trả
    // "\r"), nên hành động "xếp hàng" của pi-mono (app.message.followUp) được
    // gán cho Shift+Enter/Ctrl+J — tức byte "\n" mà Ink báo riêng biệt. Khi
    // không có onQueue, cùng phím đó giữ nhiệm vụ xuống dòng.
    if (data === "\n" || kb.matches(data, "shift+enter")) {
      if (onQueue) {
        const text = stateRef.current.lines.join("\n");
        if (text.trim()) {
          setLines({ lines: [""], cursorLine: 0, cursorCol: 0 }, { undo: false });
          onQueue(text);
        }
        return;
      }
      addNewLine();
      return;
    }


    // Chờ ký tự đích của lệnh nhảy (Ctrl+]).
    if (jumpMode.current !== null) {
      if (kb.matches(data, "tui.editor.jumpForward") || kb.matches(data, "tui.editor.jumpBackward")) {
        jumpMode.current = null;
        return;
      }
      const printable = decodePrintableKey(data) ?? (data.charCodeAt(0) >= 32 ? data : undefined);
      if (printable !== undefined) {
        const direction = jumpMode.current;
        jumpMode.current = null;
        jumpToChar(printable, direction);
        return;
      }
      jumpMode.current = null;
    }

    if (kb.matches(data, "tui.input.submit")) {
      const line = stateRef.current.lines[stateRef.current.cursorLine] ?? "";
      // Dấu "\" ở cuối dòng => xuống dòng thay vì gửi (terminal không có Shift+Enter).
      if (stateRef.current.cursorCol > 0 && line[stateRef.current.cursorCol - 1] === "\\") {
        handleBackspace();
        addNewLine();
        return;
      }
      submit();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteCharBackward") || matchesKey(data, "shift+backspace")) {
      handleBackspace();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteCharForward") || matchesKey(data, "shift+delete")) {
      handleForwardDelete();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteToLineStart")) {
      deleteToLineStart();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteToLineEnd")) {
      deleteToLineEnd();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteWordBackward")) {
      deleteWordBackwards();
      return;
    }
    if (kb.matches(data, "tui.editor.deleteWordForward")) {
      deleteWordForward();
      return;
    }
    if (kb.matches(data, "tui.editor.yank")) {
      yank();
      return;
    }
    if (kb.matches(data, "tui.editor.yankPop")) {
      yankPop();
      return;
    }
    if (kb.matches(data, "tui.editor.undo")) {
      undo();
      return;
    }
    if (kb.matches(data, "tui.editor.historyPrevious")) {
      navigateHistory(-1);
      return;
    }
    if (kb.matches(data, "tui.editor.historyNext")) {
      navigateHistory(1);
      return;
    }
    if (kb.matches(data, "tui.editor.cursorUp")) {
      const { lines, cursorLine, cursorCol } = stateRef.current;
      // Ô rỗng: ủy quyền mũi tên lên cho cha (cuộn transcript), như pi-mono cho
      // CustomEditor. Có nội dung thì vào lịch sử như bình thường.
      if (lines.length === 1 && lines[0] === "" && onKey) {
        onKey(data, { up: true, down: false, pageUp: false, pageDown: false });
        return;
      }
      const isFirstVisual = buildVisualLineMap(lastWidth.current).length > 0 && findVisualLineAt(buildVisualLineMap(lastWidth.current), cursorLine, cursorCol) === 0;
      if (isFirstVisual && (lines.length === 1 && lines[0] === "") || historyIndex > -1) {
        if (cursorCol === 0 || (lines.length === 1 && lines[0] === "")) {
          navigateHistory(-1);
          return;
        }
      }
      moveCursorVertical(-1);
      return;
    }
    if (kb.matches(data, "tui.editor.cursorDown")) {
      const { cursorLine, cursorCol } = stateRef.current;
      if (onKey && stateRef.current.lines.length === 1 && stateRef.current.lines[0] === "") {
        onKey(data, { up: false, down: true, pageUp: false, pageDown: false });
        return;
      }
      const map = buildVisualLineMap(lastWidth.current);
      const isLastVisual = findVisualLineAt(map, cursorLine, cursorCol) === map.length - 1;
      if (isLastVisual && historyIndex > -1) {
        navigateHistory(1);
        return;
      }
      moveCursorVertical(1);
      return;
    }
    if (kb.matches(data, "tui.editor.cursorWordLeft")) {
      moveWordBackwards();
      return;
    }
    if (kb.matches(data, "tui.editor.cursorWordRight")) {
      moveWordForwards();
      return;
    }
    if (kb.matches(data, "tui.editor.pageUp")) {
      // Ô rỗng: ủy quyền cho cha cuộn transcript (pi-mono: editor rỗng nhả phím
      // trang cho vùng xem). Có nội dung thì cuộn chính editor.
      if (onKey && stateRef.current.lines.length === 1 && stateRef.current.lines[0] === "") {
        onKey(data, { up: false, down: false, pageUp: true, pageDown: false });
        return;
      }
      pageScroll(-1);
      return;
    }
    if (kb.matches(data, "tui.editor.pageDown")) {
      if (onKey && stateRef.current.lines.length === 1 && stateRef.current.lines[0] === "") {
        onKey(data, { up: false, down: false, pageUp: false, pageDown: true });
        return;
      }
      pageScroll(1);
      return;
    }
    if (kb.matches(data, "tui.editor.jumpForward")) {
      jumpMode.current = "forward";
      return;
    }
    if (kb.matches(data, "tui.editor.jumpBackward")) {
      jumpMode.current = "backward";
      return;
    }
    if (kb.matches(data, "tui.editor.cursorLeft")) {
      const current = stateRef.current;
      if (current.cursorCol > 0) {
        const line = current.lines[current.cursorLine] ?? "";
        const segs = segmentsOf(line.slice(0, current.cursorCol));
        setLines({ ...current, cursorCol: current.cursorCol - (segs.at(-1)?.length ?? 1) });
      } else if (current.cursorLine > 0) {
        const prevLen = (current.lines[current.cursorLine - 1] ?? "").length;
        setLines({ ...current, cursorLine: current.cursorLine - 1, cursorCol: prevLen });
      }
      preferredVisualCol.current = null;
      return;
    }
    if (kb.matches(data, "tui.editor.cursorRight")) {
      const current = stateRef.current;
      const line = current.lines[current.cursorLine] ?? "";
      if (current.cursorCol < line.length) {
        const segs = segmentsOf(line.slice(current.cursorCol));
        setLines({ ...current, cursorCol: current.cursorCol + (segs[0]?.length ?? 1) });
      } else if (current.cursorLine < current.lines.length - 1) {
        setLines({ ...current, cursorLine: current.cursorLine + 1, cursorCol: 0 });
      }
      preferredVisualCol.current = null;
      return;
    }
    if (kb.matches(data, "tui.editor.cursorLineStart")) {
      const current = stateRef.current;
      setLines({ ...current, cursorCol: 0 });
      preferredVisualCol.current = null;
      return;
    }
    if (kb.matches(data, "tui.editor.cursorLineEnd")) {
      const current = stateRef.current;
      setLines({ ...current, cursorCol: (current.lines[current.cursorLine] ?? "").length });
      preferredVisualCol.current = null;
      return;
    }

    // Bracketed paste must be handled before the printable-character test:
    // the payload is wrapped in escape sequences, so it starts with ESC and
    // would otherwise be discarded.
    const pasted = parsePastePayload(data);
    if (pasted !== null) {
      handlePaste(pasted);
      return;
    }

    // Ký tự in được
    if (data.length >= 1 && !key.ctrl && !key.meta && data.charCodeAt(0) >= 32) {
      insertCharacter(data);
    }
  });

  // Tự cuộn để con trỏ luôn trong khung nhìn.
  // Số dòng hiển thị của editor = 30% chiều cao terminal, tối thiểu 5 — đúng như
  // pi-mono. Bản cũ hardcode 24 rows nên terminal cao cũng chỉ hiện 7 dòng.
  const terminalRows = useTerminalRows();
  const MAX_VISIBLE = Math.max(5, Math.floor(terminalRows * 0.3));
  const layout = layoutText(Math.max(1, lastWidth.current));
  let cursorLineIndex = layout.findIndex((l) => l.hasCursor);
  if (cursorLineIndex === -1) cursorLineIndex = 0;

  useEffect(() => {
    setFocused(true);
  }, []);

  useEffect(() => {
    if (cursorLineIndex < scrollOffset) setScrollOffset(cursorLineIndex);
    else if (cursorLineIndex >= scrollOffset + MAX_VISIBLE) {
      setScrollOffset(cursorLineIndex - MAX_VISIBLE + 1);
    }
  }, [cursorLineIndex, scrollOffset]);

  const maxScroll = Math.max(0, layout.length - MAX_VISIBLE);
  const effectiveOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
  const visibleLines = layout.slice(effectiveOffset, effectiveOffset + MAX_VISIBLE);
  const hiddenAbove = effectiveOffset;
  const hiddenBelow = layout.length - (effectiveOffset + visibleLines.length);

  return (
    <Box flexDirection="column">
      {hiddenAbove > 0 ? (
        <Text>{fg("dim", `─ ↑ ${hiddenAbove} more `)}</Text>
      ) : null}
      {autocomplete && autocomplete.items.length > 0 ? (
        <Box flexDirection="column">
          {autocomplete.items.map((item, index) => {
            const isSelected = index === autocomplete.selected;
            return (
              <Text key={item.value}>
                {isSelected
                  ? fg("accent", `→ ${item.label}`)
                  : `  ${item.label}`}
                {item.description ? fg("muted", ` ${item.description}`) : ""}
              </Text>
            );
          })}
        </Box>
      ) : null}
      {visibleLines.map((line, i) => {
        if (!line.hasCursor || line.cursorPos === undefined) {
          return <Text key={`el-${effectiveOffset + i}`}>{line.text || " "}</Text>;
        }
        const before = line.text.slice(0, line.cursorPos);
        const segs = segmentsOf(line.text.slice(line.cursorPos));
        const atCursor = segs[0] ?? " ";
        const after = line.text.slice(line.cursorPos + atCursor.length);
        return (
          <Text key={`el-${effectiveOffset + i}`}>
            {`${before}${focused ? theme.inverse(atCursor) : atCursor}${after}`}
          </Text>
        );
      })}
      {hiddenBelow > 0 ? (
        <Text>{fg("dim", `─ ↓ ${hiddenBelow} more `)}</Text>
      ) : null}
    </Box>
  );
  },
);

Editor.displayName = "Editor";
