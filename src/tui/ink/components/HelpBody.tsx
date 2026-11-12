// HelpBody - nội dung trợ giúp của cửa sổ phụ /help
// Bắt chước nguyên tắc pi-mono BUILTIN_SLASH_COMMANDS + keybinding hints:
//   - Liệt kê lệnh slash kèm mô tả một dòng
//   - Gợi ý phím tắt cấp app (interrupt/clear/model/thinking...)
//   - Không tự nhận phím: App quyết định component nào nhận useInput
// Port sang Ink TSX, khong copy code truc iep.

import React from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";

interface HelpEntry {
  command: string;
  description: string;
}

const COMMANDS: HelpEntry[] = [
  { command: "/help", description: "hiện trợ giúp này" },
  { command: "/model [provider/id]", description: "đổi mô hình" },
  { command: "/thinking [mức]", description: "đổi cấp độ suy nghĩ" },
  { command: "/compact [ngữ cảnh]", description: "nén ngữ cảnh ngay" },
  { command: "/sessions [id]", description: "liệt kê / chuyển phiên" },
  { command: "/new", description: "tạo phiên mới" },
  { command: "/resume", description: "mở lại phiên cũ" },
  { command: "/copy [all]", description: "chép hội thoại" },
  { command: "/theme [tên]", description: "đổi chủ đề" },
  { command: "/settings", description: "bảng cài đặt" },
  { command: "/quit", description: "thoát" },
];

const KEYS: HelpEntry[] = [
  { command: "Enter", description: "gửi tin nhắn" },
  { command: "Shift+Enter", description: "xuống dòng" },
  { command: "Ctrl+C", description: "xóa ô nhập (2 lần: thoát)" },
  { command: "Ctrl+D", description: "thoát khi ô nhập rỗng" },
  { command: "!", description: "chạy lệnh bash (!! loại khỏi ngữ cảnh)" },
  { command: "/", description: "lệnh slash" },
  { command: "@", description: "đính kèm file" },
];

export const HelpBody: React.FC<{ width?: number }> = ({ width = 80 }) => {
  void width;
  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", "Trợ giúp")}</Text>
      <Text> </Text>
      {COMMANDS.map((entry) => (
        <Text key={entry.command}>
          {fg("dim", entry.command.padEnd(24, " "))}
          {fg("muted", entry.description)}
        </Text>
      ))}
      <Text> </Text>
      <Text bold>{fg("accent", "Phím tắt")}</Text>
      {KEYS.map((entry) => (
        <Text key={entry.command}>
          {fg("dim", entry.command.padEnd(24, " "))}
          {fg("muted", entry.description)}
        </Text>
      ))}
      <Text> </Text>
      <Text>{fg("dim", "Esc để đóng")}</Text>
    </Box>
  );
};

export default HelpBody;
