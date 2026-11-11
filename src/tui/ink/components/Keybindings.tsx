// Keybindings - hiển thị các phím tắt có sẵn
// Port ý tưởng từ pi-mono keybinding-hints.ts
// Viết lại bằng Ink TSX, không copy code
import React from "react";
import { Box, Text } from "ink";

interface KeybindingsProps {
  show?: boolean;
}

export const Keybindings: React.FC<KeybindingsProps> = ({ show = true }) => {
  if (!show) return null;

  const bindings = [
    { key: "Ctrl+C", desc: "Thoát ứng dụng" },
    { key: "Ctrl+K", desc: "Tìm kiếm slash commands" },
    { key: "Ctrl+P", desc: "Chuyển model" },
    { key: "Ctrl+L", desc: "Xóa màn hình" },
    { key: "↑/↓", desc: "Lịch sử lệnh" },
    { key: "Tab", desc: "Hoàn thành lệnh" },
  ];

  return (
    <Box padding={1} borderStyle="round" borderColor="dim">
      <Text bold>Phím tắt:</Text>
      {bindings.map((b) => (
        <Box key={b.key} flexDirection="row" justifyContent="space-between">
          <Text dimColor>{b.key}</Text>
          <Text>{b.desc}</Text>
        </Box>
      ))}
    </Box>
  );
}
