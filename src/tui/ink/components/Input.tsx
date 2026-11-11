// Input - nhập liệu người dùng một dòng
// Bắt chước nguyên tắc pi-tui Input:
//   - Prompt "> " cố định đầu dòng
//   - Con trỏ blinking (reverse video) khi đang focus
//   - Hiển thị placeholder khi rỗng
//   - Cuộn ngang khi dòng nhập dài hơn khung nhìn
//   - Xóa theo cụm (Ctrl+W), xóa về đầu dòng (Ctrl+U), xóa đến cuối (Ctrl+K)
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme.js";

interface InputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  value?: string;
  /** Tắt ô nhập khi đang xử lý, tránh gửi trùng lệnh. */
  disabled?: boolean;
  /** Chuỗi gợi ý hiển thị khi ô nhập rỗng. */
  hint?: string;
}

/** Chiều rộng prompt, dùng để tính vùng hiển thị khả dụng. */
const PROMPT = "> ";

export const Input: React.FC<InputProps> = ({
  onSubmit,
  placeholder = "",
  value = "",
  disabled = false,
  hint,
}) => {
  const [text, setText] = useState<string>(value);
  const [cursor, setCursor] = useState<number>(text.length);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const inputRef = useRef<{ text: string; cursor: number }>({ text, cursor });

  // Đồng bộ từ props: giá trị ngoại lai (vd setText("") sau khi gửi) đẩy vào state.
  useEffect(() => {
    if (value !== inputRef.current.text) {
      inputRef.current = { text: value, cursor: value.length };
      setText(value);
      setCursor(value.length);
    }
  }, [value]);

  // Con trỏ blinking 500ms, giả lập hardware cursor vì Ink không có cursor native.
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  const apply = useCallback((nextText: string, nextCursor: number) => {
    inputRef.current = { text: nextText, cursor: nextCursor };
    setText(nextText);
    setCursor(nextCursor);
  }, []);

  const handleSubmit = useCallback(
    (t: string) => {
      onSubmit(t);
    },
    [onSubmit]
  );

  // Nhập liệu từ stdin - duy nhất component đăng ký useInput trong App.
  useInput((inputString, key) => {
    if (key.ctrl && inputString === "\u0003") {
      return; // để exitOnCtrlC của Ink xử lý
    }
    if (disabled) return;

    if (key.return) {
      const current = inputRef.current.text.trim();
      if (current) {
        handleSubmit(current);
        apply("", 0);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (inputRef.current.cursor > 0) {
        const before = inputRef.current.text.slice(0, inputRef.current.cursor);
        const after = inputRef.current.text.slice(inputRef.current.cursor);
        const trimmed = before.slice(0, -1);
        apply(trimmed + after, trimmed.length);
      }
      return;
    }

    if (key.leftArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.rightArrow) {
      setCursor((c) => Math.min(inputRef.current.text.length, c + 1));
      return;
    }
    if (key.upArrow || key.downArrow) {
      return; // lịch sử do controller/editor cấp cao hơn lo
    }

    // Ctrl+W - xóa cụm phía trước
    if (key.ctrl && inputString === "w") {
      const before = inputRef.current.text.slice(0, inputRef.current.cursor);
      const trimmed = before.replace(/\s*\S*$/, "");
      apply(trimmed + inputRef.current.text.slice(inputRef.current.cursor), trimmed.length);
      return;
    }
    // Ctrl+U - xóa về đầu dòng
    if (key.ctrl && inputString === "u") {
      apply(inputRef.current.text.slice(inputRef.current.cursor), 0);
      return;
    }
    // Ctrl+K - xóa đến cuối dòng
    if (key.ctrl && inputString === "k") {
      apply(inputRef.current.text.slice(0, inputRef.current.cursor), inputRef.current.cursor);
      return;
    }
    // Ctrl+A - về đầu dòng
    if (key.ctrl && inputString === "a") {
      setCursor(0);
      return;
    }
    // Ctrl+E - xuống cuối dòng
    if (key.ctrl && inputString === "e") {
      setCursor(inputRef.current.text.length);
      return;
    }

    if (
      inputString &&
      inputString.length === 1 &&
      inputString.charCodeAt(0) >= 32 &&
      inputString.charCodeAt(0) <= 126
    ) {
      const before = inputRef.current.text.slice(0, inputRef.current.cursor);
      const after = inputRef.current.text.slice(inputRef.current.cursor);
      const next = before + inputString + after;
      apply(next, before.length + inputString.length);
    }
  });

  // Cửa sổ cuộn ngang: giữ con trỏ luôn nằm trong khung nhìn.
  const VIEWPORT = 72;
  const visible = (() => {
    const t = text;
    if (t.length === 0) return "";
    let start = 0;
    let end = t.length;
    if (cursor < start + 1) start = Math.max(0, cursor - 1);
    if (end - start > VIEWPORT) {
      if (cursor <= start) start = Math.max(0, cursor - 1);
      end = start + VIEWPORT;
      if (end > t.length) {
        end = t.length;
        start = Math.max(0, end - VIEWPORT);
      }
    }
    return t.slice(start, end);
  })();
  const cursorInWindow = Math.max(0, Math.min(cursor, visible.length));

  const before = visible.slice(0, cursorInWindow);
  const atCursor = visible.slice(cursorInWindow, cursorInWindow + 1);
  const after = visible.slice(cursorInWindow + 1);
  const showPlaceholder = text.length === 0;
  const placeholderText = placeholder || hint || "";

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box flexDirection="row">
        <Text>{PROMPT}</Text>
        {showPlaceholder && placeholderText ? (
          <Text>{fg("dim", placeholderText)}</Text>
        ) : (
          <Text>
            {before}
            {cursorVisible ? theme.inverse(atCursor || " ") : atCursor || "\u00a0"}
            {after}
          </Text>
        )}
      </Box>
      {hint && text.length === 0 ? <Text>{fg("dim", `  ${hint}`)}</Text> : null}
    </Box>
  );
};
