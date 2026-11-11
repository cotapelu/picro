// TruncatedText - hiển thị đúng một dòng, cắt khi quá dài
// Bắt chước nguyên tắc pi-tui components/truncated-text.ts:
//   - Chỉ lấy dòng đầu (dừng ở ký tự xuống dòng)
//   - Cắt theo chiều rộng khả dụng, thêm dấu ba chấm khi tràn
//   - Đệm đủ chiều rộng khung nhìn
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useMemo } from "react";
import { Text } from "ink";
import { theme, fg, bg } from "../theme.js";

export interface TruncatedTextWrapperProps {
  text: string;
  paddingX?: number;
  paddingY?: number;
  width?: number;
  /** Chuỗi thay thế khi cắt (mặc định "..."). */
  ellipsis?: string;
}

/** Cắt theo số cột hiển thị (không tính ANSI). */
function truncate(text: string, maxWidth: number, ellipsis: string): string {
  if (maxWidth <= 0) return "";
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= maxWidth) return text;
  if (maxWidth === 1) return text.slice(0, 1);
  return text.slice(0, maxWidth - ellipsis.length) + fg("dim", ellipsis);
}

export const TruncatedTextWrapper: React.FC<TruncatedTextWrapperProps> = ({
  text,
  paddingX = 0,
  paddingY = 0,
  width,
  ellipsis = "...",
}) => {
  const line = useMemo(() => {
    const availableWidth = Math.max(1, (width ?? 80) - paddingX * 2);
    let singleLine = text;
    const nl = text.indexOf("\n");
    if (nl !== -1) singleLine = text.slice(0, nl);
    const cut = truncate(singleLine.replace(/\t/g, "    "), availableWidth, ellipsis);
    const left = " ".repeat(paddingX);
    const right = " ".repeat(paddingX);
    const withPadding = `${left}${cut}${right}`;
    return width ? withPadding.padEnd(width, " ") : withPadding;
  }, [text, width, paddingX, ellipsis]);

  return (
    <Text>
      {Array.from({ length: paddingY }).map((_, i) => (
        <span key={`pt-${i}`}>
          {"\n"}
          {" ".repeat(Math.max(1, width ?? 80))}
        </span>
      ))}
      {line}
      {Array.from({ length: paddingY }).map((_, i) => (
        <span key={`pb-${i}`}>
          {"\n"}
          {" ".repeat(Math.max(1, width ?? 80))}
        </span>
      ))}
    </Text>
  );
};
