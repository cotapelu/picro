// ThemedText - văn bản màu theo chủ đề, dựng lại khi đổi chủ đề
// Bắt chước nguyên tắc pi-mono components/themed-text.ts:
//   - Nội dung build lại từ hàm `build` mỗi lần render
//   - invalidate() đánh dấu cần dựng lại (đổi chủ đề, đổi dữ liệu)
//   - paddingX/paddingY như component Text
// Port sang Ink TSX, khong copy code truc iep.

import React, { useEffect, useState } from "react";
import { Text } from "ink";

export interface ThemedTextProps {
  /** Hàm dựng nội dung; nên trả cùng nội dung mỗi lần gọi. */
  build: () => string;
  /** Đệm trái/phải. */
  paddingX?: number;
  /** Đệm trên/dưới. */
  paddingY?: number;
  /** Phụ thuộc: đổi giá trị này cũng buộc dựng lại. */
  deps?: unknown[];
}

export const ThemedText: React.FC<ThemedTextProps> = ({ build, paddingX = 1, paddingY = 1, deps = [] }) => {
  const [content, setContent] = useState(() => build());

  useEffect(() => {
    setContent(build());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const padX = " ".repeat(Math.max(0, paddingX));
  return (
    <>
      {Array.from({ length: Math.max(0, paddingY) }).map((_, i) => (
        <Text key={`pt-${i}`}> </Text>
      ))}
      <Text>{`${padX}${content}${padX}`}</Text>
      {Array.from({ length: Math.max(0, paddingY) }).map((_, i) => (
        <Text key={`pb-${i}`}> </Text>
      ))}
    </>
  );
};
