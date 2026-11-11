// Toast - thông báo tạm thời
// Bắt chước nguyên tắc pi-mono AltScreenFlashContainer:
//   - Hiển thị ở lớp trên cùng, dùng video ngược để nổi bật
//   - Tự gỡ sau khoảng thời gian cố định (mặc định ~3 giây)
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "../theme/index.js";

interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
  createdAt: number;
}

interface ToastProps {
  toasts: Toast[];
}

/** Khoảng thời gian mặc định một thông báo sống. */
const DEFAULT_DURATION_MS = 3000;
/** Khoảng cách kiểm tra hết hạn. */
const TICK_MS = 120;

const colorOf = (type: Toast["type"]): ((text: string) => string) => {
  switch (type) {
    case "error":
      return theme.brightRed as unknown as (text: string) => string;
    case "success":
      return theme.brightGreen as unknown as (text: string) => string;
    case "warning":
      return theme.brightYellow as unknown as (text: string) => string;
    default:
      return theme.brightCyan as unknown as (text: string) => string;
  }
};

export const Toast: React.FC<ToastProps> = ({ toasts }) => {
  // Truy cập Date.now() mỗi lần tick để loại các mục đã hết hạn.
  const [, forceTick] = useState(0);
  const tickRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), TICK_MS);
    tickRef.current = timer;
    return () => clearInterval(timer);
  }, []);

  const now = Date.now();
  const visible = toasts.filter((t) => now - t.createdAt < (t.duration ?? DEFAULT_DURATION_MS));
  if (visible.length === 0) return null;

  return (
    <Box flexDirection="column" flexShrink={0}>
      {visible.map((t) => (
        <Text key={t.id}>{theme.inverse(colorOf(t.type)(` ${t.message} `))}</Text>
      ))}
    </Box>
  );
};
