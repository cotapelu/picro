// Header - tiêu đề ứng dụng và hướng dẫn phím tắt ngắn
// Bắt chước nguyên tắc pi-mono BuiltInHeader:
//   - Tên app + phiên bản
//   - Các phím tắt chính (Ctrl+C thoát, Enter gửi, v.v.)

import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title?: string;
  cwd?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = "picro", cwd }) => {
  return (
    <Box padding={1} flexDirection="column">
      <Text bold>{title}</Text>
      <Text dimColor>
        {cwd || "."}  ·  Ctrl+C thoát  ·  Enter gửi  ·  /lệnh
      </Text>
    </Box>
  );
}
