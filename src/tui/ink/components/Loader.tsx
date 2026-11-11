// Loader - spinner quay kèm thông điệp
// Bắt chước nguyên tắc pi-tui components/loader.ts:
//   - Khung hình mặc định ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]
//   - Chu kỳ 80ms
//   - Có thể tắt bằng frames rỗng
//   - Màu spinner và thông điệp tách riêng
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useEffect, useState } from "react";
import { Text } from "ink";
import { theme } from "../theme/index.js";

export interface LoaderProps {
  message?: string;
  /** Các khung hình của spinner; mảng rỗng = ẩn. */
  frames?: string[];
  intervalMs?: number;
  /** Màu con quay. */
  spinnerColor?: (text: string) => string;
  /** Màu thông điệp. */
  messageColor?: (text: string) => string;
}

const DEFAULT_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const DEFAULT_INTERVAL_MS = 80;
const DEFAULT_MESSAGE = "Loading...";

export const Loader: React.FC<LoaderProps> = ({
  message = DEFAULT_MESSAGE,
  frames = DEFAULT_FRAMES,
  intervalMs = DEFAULT_INTERVAL_MS,
  spinnerColor = theme.accent,
  messageColor = theme.muted,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % frames.length);
    }, Math.max(1, intervalMs));
    return () => clearInterval(timer);
  }, [frames.length, intervalMs]);

  const frame = frames[index] ?? "";
  const spinner = frame ? `${spinnerColor(frame)} ` : "";
  return <Text>{`${spinner}${messageColor(message)}`}</Text>;
};
