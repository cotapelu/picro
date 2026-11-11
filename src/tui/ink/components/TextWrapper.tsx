// Text - hiển thị văn bản nhiều dòng, tự ngắt theo chiều rộng
// Bắt chước nguyên tắc pi-tui components/text.ts:
//   - Đệm ngang/đứng cấu hình được
//   - Ngắt theo từ, có ngắt cứng khi từ dài hơn dòng
//   - Đệm đủ chiều rộng khung nhìn để nền đồng nhất
//   - Không in gì khi nội dung rỗng
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";

export interface TextWrapperProps {
  text: string;
  /** Đệm trái/phải. */
  paddingX?: number;
  /** Đệm trên/dưới. */
  paddingY?: number;
  /** Chiều rộng khung nhìn để đệm cho đủ. */
  width?: number;
  /** Hàm tô nền cho toàn bộ khối. */
  background?: (text: string) => string;
}

/** Ngắt một đoạn văn theo ranh giới từ, giới hạn bề rộng. */
function wrapSegment(segment: string, maxWidth: number): string[] {
  if (segment.length <= maxWidth) return [segment];

  const words = segment.split(/(\s+)/).filter((part) => part.length > 0);
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;

  const pushCurrent = () => {
    lines.push(current.trimEnd());
    current = "";
    currentWidth = 0;
  };

  for (const word of words) {
    const wordWidth = word.length;

    // Từ dài hộng cả dòng: cắt cứng theo ký tự.
    if (wordWidth > maxWidth) {
      if (current) pushCurrent();
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
      continue;
    }

    if (currentWidth + wordWidth > maxWidth && currentWidth > 0) {
      pushCurrent();
    }
    current += word;
    currentWidth += wordWidth;
  }
  if (current) pushCurrent();
  return lines;
}

/** Ngắt văn bản có nhiều dòng thành các dòng vừa khung. */
function wrapAll(text: string, maxWidth: number): string[] {
  if (!text) return [];
  const logical = text.split(/\r\n|\r|\n/);
  const out: string[] = [];
  for (const line of logical) {
    if (line.length <= maxWidth) {
      out.push(line);
      continue;
    }
    out.push(...wrapSegment(line, maxWidth));
  }
  return out;
}

export const TextWrapper: React.FC<TextWrapperProps> = ({
  text,
  paddingX = 0,
  paddingY = 0,
  width,
  background,
}) => {
  const lines = useMemo(() => {
    if (!text || text.trim() === "") return [];
    const contentWidth = Math.max(1, (width ?? 80) - paddingX * 2);
    return wrapAll(text.replace(/\t/g, "    "), contentWidth);
  }, [text, width, paddingX]);

  const left = " ".repeat(paddingX);
  const right = " ".repeat(paddingX);
  const blank = " ".repeat(Math.max(1, width ?? 80));

  return (
    <Box flexDirection="column">
      {Array.from({ length: paddingY }).map((_, i) => (
        <Text key={`pad-top-${i}`}>{blank}</Text>
      ))}
      {lines.map((line, i) => {
        const withMargins = `${left}${line}${right}`;
        const padded = width ? withMargins.padEnd(width, " ") : withMargins;
        return <Text key={`line-${i}`}>{background ? background(padded) : padded}</Text>;
      })}
      {Array.from({ length: paddingY }).map((_, i) => (
        <Text key={`pad-bottom-${i}`}>{blank}</Text>
      ))}
    </Box>
  );
};
