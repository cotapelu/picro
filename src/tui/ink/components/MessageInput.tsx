// MessageInput - ô nhập tin nhắn của chế độ tương tác
// Bắt chước vai trò pi-mono CustomEditor (bọc Editor của tầng tui):
//   - ĐẦY ĐỦ tính năng editor: nhiều dòng, lịch sử, kill-ring, undo, paste marker
//   - Autocomplete: lệnh slash khi bắt đầu bằng "/", đường dẫn khi gõ "@"
//   - Chế độ bash: dòng đầu bắt đầu bằng "!"/"!!" -> đổi màu viền
//   - Phím cuộn transcript được ủy quyền ra ngoài qua callback
//   - Đây là component DUY NHẤT nhận useInput (Ink chỉ cho một component nhận phím)
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { matchesKey } from "../core/Keys.js";
import { Editor, type EditorHandle } from "./Editor.js";
import { CombinedAutocompleteProvider, type SlashCommand } from "../core/Autocomplete.js";

export interface MessageInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** Vô hiệu hóa khi agent đang xử lý. */
  disabled?: boolean;
  /** Gợi ý phím cuộn transcript (do App truyền vào). */
  onScroll?: (direction: "up" | "down", page: boolean) => void;
  /** Alt+Enter: xếp hàng thay vì gửi ngay (pi-mono handleFollowUp). */
  onQueue?: (text: string) => void;
  width?: number;
  /** Lịch sử tin nhắn đã gửi (duyệt bằng mũi tên lên/xuống). */
  history?: readonly string[];
  /** Danh sách lệnh slash cho autocomplete. */
  slashCommands?: readonly SlashCommand[];
  /** Có bật autocomplete đường dẫn không. */
  enablePathCompletion?: boolean;
}

const PROMPT = "> ";

/** Gợi ý mặc định khi ô nhập rỗng. */
const PLACEHOLDER = "Nhập tin nhắn… (Enter gửi · Shift+Enter xuống dòng · / xem lệnh · ! chạy bash)";

export const MessageInput = React.forwardRef<EditorHandle, MessageInputProps>(
  (
    {
      onSubmit,
      placeholder = PLACEHOLDER,
      disabled = false,
      onScroll,
      onQueue,
      width = 80,
      history = [],
      slashCommands = [],
      enablePathCompletion = true,
    },
    ref,
  ) => {
  const t = getTheme();
  const editorRef = useRef<EditorHandle | null>(null);
  const [value, setValue] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
    },
    [disabled, onSubmit],
  );

  // Mũi tên lên/xuống trên ô RỖNG cuộn transcript thay vì duyệt lịch sử:
  // Editor đã tự xử lý lịch sử khi có nội dung, nên ta chỉ cần can thiệp khi rỗng.
  const handleKey = useCallback(
    (
      data: string,
      keys: { up: boolean; down: boolean; pageUp: boolean; pageDown: boolean },
    ) => {
      if (!onScroll) return;
      const empty = valueRef.current.length === 0;
      if (!empty) return;
      // Ô rỗng: mũi tên và PageUp/PageDown cuộn transcript thay vì duyệt lịch sử.
      if (keys.pageUp) onScroll("up", true);
      else if (keys.pageDown) onScroll("down", true);
      else if (keys.up) onScroll("up", false);
      else if (keys.down) onScroll("down", false);
    },
    [onScroll],
  );

  const empty = value.length === 0;

  return (
    <Box flexDirection="column" flexShrink={0}>
      {empty ? <Text>{t.fg("dim", placeholder)}</Text> : null}
      <MessageEditor
        ref={ref ?? editorRef}
        value={value}
        onChange={setValue}
        onSubmit={submit}
        onQueue={onQueue}
        disabled={disabled}
        onKey={handleKey}
        width={width}
        history={history}
        slashCommands={slashCommands}
        enablePathCompletion={enablePathCompletion}
      />
    </Box>
  );
  },
);

/**
 * Bọc Editor để giữ ref tới API getText/setText cho cha.
 *
 * Ink chỉ cho PHÍM tới component đăng ký useInput; Editor là component đó, nên
 * mọi xử lý phím (kể cả cuộn transcript khi ô rỗng) đi qua nó.
 */
const MessageEditor = React.forwardRef<
  EditorHandle,
  {
    value: string;
    onChange: (text: string) => void;
    onSubmit: (text: string) => void;
    disabled: boolean;
    onKey: (data: string, keys: { up: boolean; down: boolean; pageUp: boolean; pageDown: boolean }) => void;
    onQueue?: (text: string) => void;
    width: number;
    history: readonly string[];
    slashCommands: readonly SlashCommand[];
    enablePathCompletion: boolean;
  }
>(({ value, onChange, onSubmit, onQueue, disabled, onKey, width }, ref) => {
  // Bắt Alt+Enter (tui.input.newLine binding cũng nhận alt+enter ở một số
  // terminal) để xếp hàng thay vì xuống dòng: giống pi-mono handleFollowUp.
  const handleQueue = React.useCallback(
    (text: string) => {
      if (onQueue) onQueue(text);
    },
    [onQueue],
  );
  return (
    <Editor
      ref={ref}
      value={value}
      onSubmit={onSubmit}
      onChange={onChange}
      disableSubmit={disabled}
      width={width}
      onKey={onKey}
      onQueue={handleQueue}
    />
  );
});

MessageEditor.displayName = "MessageEditor";

MessageInput.displayName = "MessageInput";

export { matchesKey };
