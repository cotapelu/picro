// Input - nhập liệu người dùng
// Port ý tưởng từ pi-mono, dùng Ink useInput hook
import React, { useRef, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface InputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
}

export const Input: React.FC<InputProps> = ({ onSubmit, placeholder = '> ' }) => {
  const { exit } = useApp();
  const inputRef = useRef<string>('');

  // Xử lý phím bấm từ stdin
  useInput((inputString, key) => {
    // Ctrl+C
    if (key.ctrl && inputString === '\u0003') {
      exit();
      process.exit(0);
    }
    // Enter
    if (key.return) {
      const currentValue = inputRef.current;
      if (currentValue.trim()) {
        onSubmit(currentValue.trim());
      }
      inputRef.current = '';
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

  return (
    <Box paddingBottom={1} flexDirection="row">
      <Text>{placeholder}</Text>
      <Text>{inputRef.current}</Text>
    </Box>
  );
}
