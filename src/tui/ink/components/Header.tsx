// Header - tiêu đề ứng dụng đầu màn hình
// Bắt chước nguyên tắc pi-mono BuiltInHeader:
//   - Tên app + phiên bản, thay đổi được khi chủ đề đổi
//   - Gợi ý phím tắt dưới dạng gọn (compact) hoặc đầy đủ (expanded)
//   - Dòng onboarding gợi ý cách dùng
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme.js";

interface HeaderProps {
  title?: string;
  version?: string;
  cwd?: string;
  /** Bật gợi ý phím tắt đầy đủ thay vì dạng gọn. */
  expanded?: boolean;
}

/** Gợi ý phím tắt: nhãn phím mờ, mô tả nhạt hơn. */
const useKeyHints = (expanded: boolean): Array<{ keys: string; text: string }> => {
  if (expanded) {
    return [
      { keys: "Ctrl+C", text: "thoát (nhấn hai lần)" },
      { keys: "Enter", text: "gửi tin nhắn" },
      { keys: "Ctrl+P", text: "chuyển model" },
      { keys: "Ctrl+L", text: "xóa màn hình" },
      { keys: "Ctrl+K", text: "tìm lệnh slash" },
      { keys: "/help", text: "xem trợ giúp" },
      { keys: "!", text: "chạy bash" },
      { keys: "@", text: "đính kèm file" },
    ];
  }
  return [
    { keys: "Enter", text: "gửi" },
    { keys: "/help", text: "lệnh" },
    { keys: "!", text: "bash" },
    { keys: "Ctrl+C", text: "thoát" },
  ];
};

const KeyHintRow: React.FC<{ keys: string; text: string }> = ({ keys, text }) => (
  <Text>
    {fg("dim", keys)}
    {fg("muted", ` ${text}`)}
  </Text>
);

export const Header: React.FC<HeaderProps> = ({
  title = "picro",
  version,
  cwd,
  expanded = false,
}) => {
  const hints = useKeyHints(expanded);
  // Nội dung được dựng lại mỗi lần render nên đổi chủ đề vẫn áp dụng đúng màu.
  const [label, setLabel] = useState<string>(`${title}${version ? ` v${version}` : ""}`);

  useEffect(() => {
    setLabel(`${title}${version ? ` v${version}` : ""}`);
  }, [title, version]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>{fg("accent", label)}</Text>
      {cwd ? <Text>{fg("dim", cwd)}</Text> : null}
      <Box flexDirection="column">
        {hints.map((hint) => (
          <KeyHintRow key={hint.keys} {...hint} />
        ))}
      </Box>
      <Text>
        {fg("dim", "Hỏi tôi cách dùng hoặc mở rộng picro.")}
      </Text>
    </Box>
  );
};
