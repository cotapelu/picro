// MessageInput - ô nhập tin nhắn cấp ứng dụng
// Bắt chước vai trò của pi-mono CustomEditor (bọc Editor của tầng tui):
//   - Prompt "> ", placeholder, con trỏ blinking
//   - Gõ nhiều dòng, Enter gửi, Shift+Enter xuống dòng
//   - Lịch sử với mũi tên lên/xuống khi ô rỗng
//   - Phím cuộn transcript được ủy quyền ra ngoài qua callback
//   - Gợi ý dòng lệnh khi rỗng (/help, !bash, @file)
// Port sang Ink TSX, khon copy code truc iep.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { TextInput } from "./TextInput.js";
import { getTheme } from "../theme/index.js";
import { matchesKey } from "../core/Keys.js";

export interface MessageInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  /** Vô hiệu hóa khi agent đang xử lý. */
  disabled?: boolean;
  /** Gợi ý phím cuộn transcript (do App truyền vào). */
  onScroll?: (direction: "up" | "down", page: boolean) => void;
  width?: number;
}

const PROMPT = "> ";

export const MessageInput: React.FC<MessageInputProps> = ({
  onSubmit,
  placeholder = "Nhập tin nhắn…",
  disabled = false,
  onScroll,
  width = 80,
}) => {
  const t = getTheme();
  const [value, setValue] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Con trỏ nhấp nháy 500ms.
  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(timer);
  }, []);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      setValue("");
    },
    [disabled, onSubmit],
  );

  // Mũi tên lên/xuống trên ô rỗng cuộn transcript thay vì duyệt lịch sử.
  const handleKey = useCallback(
    (data: string, isUp: boolean, isDown: boolean) => {
      if (!onScroll) return;
      if (isUp && valueRef.current.length === 0) onScroll("up", false);
      if (isDown && valueRef.current.length === 0) onScroll("down", false);
      void data;
    },
    [onScroll],
  );

  const showHint = value.length === 0;

  return (
    <Box flexDirection="column" flexShrink={0} width={width}>
      <Box flexDirection="row">
        <Text>{PROMPT}</Text>
        {showHint ? (
          <Text>{t.fg("dim", placeholder)}</Text>
        ) : (
          <Text>
            {value}
            {cursorVisible ? t.inverse(" ") : "\u00a0"}
          </Text>
        )}
      </Box>
      {showHint ? (
        <Text>{t.fg("dim", "  /help xem lệnh · ! chạy bash · @ đính kèm file")}</Text>
      ) : null}
      {/* Lớp nhận phím thật: ủy quyền cho TextInput và chuyển phím cuộn ra ngoài. */}
      <HiddenKeyProxy onSubmit={submit} onChange={setValue} disabled={disabled} onNav={handleKey} />
    </Box>
  );
};

/**
 * Lớp vô hình nhận useInput: Ink chỉ cho một component nhận phím,
 * nên ta gom toàn bộ xử lý phím ở đây rồi đẩy value ra props.
 */
const HiddenKeyProxy: React.FC<{
  onSubmit: (text: string) => void;
  onChange: (value: string) => void;
  disabled: boolean;
  onNav: (data: string, isUp: boolean, isDown: boolean) => void;
}> = ({ onSubmit, onChange, disabled, onNav }) => {
  const [value, setValue] = useState("");
  const ref = useRef(value);
  ref.current = value;

  const apply = (next: string) => {
    ref.current = next;
    setValue(next);
    onChange(next);
  };

  return (
    <TextInput
      value={value}
      disabled={disabled}
      onSubmit={(text) => {
        onSubmit(text);
        apply("");
      }}
      onChange={apply}
      onKey={onNav}
    />
  );
};

export { matchesKey };
