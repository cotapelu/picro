// Input - nhập liệu người dùng
// Bắt chước nguyên tắc pi-tui Input component:
//   - Prompt "> " cố định đầu dòng
//   - Con trỏ blinking (█) giả lập hardware cursor khi focus
//   - Chỉ component này đăng ký useInput của Ink để tránh xung đột phím bấm
//   - Xử lý Enter (submit), Backspace (xóa ký tự trước), ký tự in được

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";

interface InputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  value?: string;
}

export const Input: React.FC<InputProps> = ({ onSubmit, placeholder = "> ", value = "" }) => {
  const [text, setText] = useState<string>(value);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const inputRef = useRef<string>(text);

  // Nhập liệu từ stdin (Ink useInput) - duy nhất một component đăng ký
  useInput((inputString, key) => {
    // Ctrl+C - để Ink/exitOnCtrlC xử lý, không can thiệp
    if (key.ctrl && inputString === "\u0003") {
      return;
    }
    // Enter - submit tin nhắn
    if (key.return) {
      const current = inputRef.current.trim();
      if (current) {
        onSubmit(current);
      }
      inputRef.current = "";
      setText("");
      return;
    }
    // Backspace - xóa ký tự trước con trỏ
    if (key.backspace) {
      inputRef.current = inputRef.current.slice(0, -1);
      setText(inputRef.current);
      return;
    }
    // Ký tự in được (không xử lý các ký tự điều khiển khác)
    if (
      inputString &&
      inputString.length === 1 &&
      inputString.charCodeAt(0) >= 32 &&
      inputString.charCodeAt(0) <= 126
    ) {
      inputRef.current += inputString;
      setText(inputRef.current);
    }
  });

  // Đồng bộ giá trị từ props (nếu có)
  useEffect(() => {
    if (value !== undefined && value !== inputRef.current) {
      inputRef.current = value;
      setText(value);
    }
  }, [value]);

  // Con trỏ blinking cada 500ms (giả lập hardware cursor)
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((prev) => !prev), 500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback((t: string) => {
    onSubmit(t);
  }, [onSubmit]);

  return (
    <Box paddingBottom={1} flexDirection="row" flexShrink={0}>
      <Text>{placeholder}</Text>
      <Text>{text}</Text>
      {cursorVisible && <Text bold>█</Text>}
    </Box>
  );
}
