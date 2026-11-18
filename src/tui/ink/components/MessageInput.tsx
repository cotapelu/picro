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
import { Editor, type EditorHandle, type AppAction as EditorAppAction } from "./Editor.js";
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
  /** Ctrl+T: mở rộng/thu gọn tool output toàn cục. */
  onToggleExpand?: () => void;
  /** Hành động ứng dụng theo phím (Ctrl+C/D/Z, Esc, Ctrl+G/V/P/N). */
  onAppAction?: (action: EditorAppAction) => void;
  /** Ô nhập đang ở chế độ bash ("!" đầu dòng) → viền đổi màu. */
  bashMode?: boolean;
  width?: number;
  /** Lịch sử tin nhắn đã gửi (duyệt bằng mũi tên lên/xuống). */
  history?: readonly string[];
  /** Danh sách lệnh slash cho autocomplete. */
  slashCommands?: readonly SlashCommand[];
  /** Prompt templates cho autocomplete (từ resource loader). */
  promptTemplates?: Array<{ name: string; description?: string; argumentHint?: string }>;
  /** Extension commands cho autocomplete (từ extension runner). */
  extensionCommands?: Array<{ name: string; description?: string; argumentHint?: string; getArgumentCompletions?: (prefix: string) => any }>;
  /** Skill commands cho autocomplete (kiểu `skill:<name>`). */
  skillCommands?: Array<{ name: string; description?: string }>;
  /** Trạng thái đang chạy nhúng trên editor (working/compaction/retry). */
  workingStatus?: string;
  /** Hộp tìm kiếm transcript đang mở (mọi phím thuộc về tìm kiếm). */
  searchActive?: boolean;
  /** Gõ/kéo truy vấn tìm kiếm. */
  onSearchChange?: (query: string) => void;
  /** Enter: tới kết quả tiếp theo. */
  onSearchSubmit?: () => void;
  /** Esc: đóng hộp tìm kiếm. */
  onSearchCancel?: () => void;
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
      onToggleExpand,
      onAppAction,
      bashMode = false,
      width = 80,
      history = [],
      slashCommands = [],
      promptTemplates = [],
      extensionCommands = [],
      skillCommands = [],
      workingStatus,
      searchActive = false,
      onSearchChange,
      onSearchSubmit,
      onSearchCancel,
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
      // Xóa ô nhập NGAY khi gửi (pi-mono: onSubmit xong editor.setText("")).
      // Bản cũ chỉ gọi onSubmit nên chữ người dùng vừa gửi vẫn nằm trong ô nhập
      // và lần gửi sau bị dính thêm — người dùng tưởng app không nhận lệnh.
      setValue("");
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
        onToggleExpand={onToggleExpand}
        onAppAction={onAppAction}
        disabled={disabled}
        onKey={handleKey}
        width={width}
        bashMode={bashMode}
        history={history}
        slashCommands={slashCommands}
        promptTemplates={promptTemplates}
        extensionCommands={extensionCommands}
        skillCommands={skillCommands}
        workingStatus={workingStatus}
        searchActive={searchActive}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onSearchCancel={onSearchCancel}
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
    onToggleExpand?: () => void;
    onAppAction?: (action: EditorAppAction) => void;
    bashMode?: boolean;
    width: number;
    history: readonly string[];
    slashCommands: readonly SlashCommand[];
    promptTemplates: Array<{ name: string; description?: string; argumentHint?: string }>;
    extensionCommands: Array<{ name: string; description?: string; argumentHint?: string; getArgumentCompletions?: (prefix: string) => any }>;
    skillCommands: Array<{ name: string; description?: string }>;
    workingStatus?: string;
    searchActive?: boolean;
    onSearchChange?: (query: string) => void;
    onSearchSubmit?: () => void;
    onSearchCancel?: () => void;
    enablePathCompletion: boolean;
  }
>(({ value, onChange, onSubmit, onQueue, onToggleExpand, onAppAction, bashMode = false, disabled, onKey, width, slashCommands, promptTemplates, extensionCommands, skillCommands, workingStatus, searchActive, onSearchChange, onSearchSubmit, onSearchCancel, enablePathCompletion }, ref) => {
  // Shift+Enter (byte \n) xếp hàng thay vì xuống dòng: giống pi-mono
  // app.message.followUp (Ink không phân biệt được Alt+Enter).
  const handleQueue = React.useCallback(
    (text: string) => {
      if (onQueue) onQueue(text);
    },
    [onQueue],
  );

  // Nhà cung gợi ý (slash + prompt templates + extension commands + skill commands
  // + đường dẫn), dựng một lần theo props. Skill commands trùng tên thì extension
  // command thắng (extension có thể ghi đè).
  const provider = React.useMemo(() => {
    if (!enablePathCompletion && slashCommands.length === 0) return undefined;
    return new CombinedAutocompleteProvider(
      [...slashCommands],
      process.cwd(),
      promptTemplates,
      [...extensionCommands, ...skillCommands],
    );
  }, [slashCommands, enablePathCompletion, promptTemplates, extensionCommands, skillCommands]);
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
      onToggleExpand={onToggleExpand}
      onAppAction={onAppAction}
      {...(provider ? { autocompleteProvider: provider } : {})}
      workingStatus={workingStatus}
      searchActive={searchActive}
      onSearchChange={onSearchChange}
      onSearchSubmit={onSearchSubmit}
      onSearchCancel={onSearchCancel}
      data-testid="message-input-searchActive"
    />
  );
});

MessageEditor.displayName = "MessageEditor";

MessageInput.displayName = "MessageInput";
