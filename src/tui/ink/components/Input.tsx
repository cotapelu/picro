// Input - nhập liệu người dùng
// Port ý tưởng từ pi-mono, dùng Ink useInput hook
// Viết lại bằng Ink TSX, không copy code
import React, { useRef, useEffect, useCallback } from "react";
import { Box, Text, useInput, useApp } from "ink";

interface InputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  value?: string;
}

export const Input: React.FC<InputProps> = ({ onSubmit, placeholder = "> ", value = "" }) => {
  const { exit } = useApp();
  const inputRef = useRef<string>(value);

  // Xử lý phím bấm từ stdin
  useInput((inputString, key) => {
    // Ctrl+C
    if (key.ctrl && inputString === "\u0003") {
      exit();
      process.exit(0);
    }
    // Ctrl+K - Tìm kiếm slash commands
    if (key.ctrl && inputString === "k") {
      onSubmit("/");
      return;
    }
    // Ctrl+P - Chuyển model
    if (key.ctrl && inputString === "p") {
      onSubmit("/model");
      return;
    }
    // Ctrl+L - Xóa màn hình
    if (key.ctrl && inputString === "l") {
      onSubmit("/clear");
      return;
    }
    // Enter
    if (key.return) {
      const currentValue = inputRef.current;
      if (currentValue.trim()) {
        onSubmit(currentValue.trim());
      }
      inputRef.current = "";
    }
    // Backspace
    if (key.backspace) {
      inputRef.current = inputRef.current.slice(0, -1);
    }
    // Xử ký tự in được
    if (
      inputString &&
      inputString.length === 1 &&
      inputString.charCodeAt(0) >= 32 &&
      inputString.charCodeAt(0) <= 126
    ) {
      inputRef.current += inputString;
    }
  });

  useEffect(() => {
    inputRef.current = value;
  }, [value]);

  return (
    <Box paddingBottom={1} flexDirection="row" flexShrink={0}>
      <Text>{placeholder}</Text>
      <Text>{inputRef.current}</Text>
    </Box>
  );
}
