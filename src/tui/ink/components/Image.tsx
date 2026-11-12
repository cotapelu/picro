// Image - hiển thị ảnh inline trong terminal
// Bắt chước nguyên tắc pi-tui components/image.ts:
//   - Tính kích thước ô (columns, rows) từ kích thước ảnh và cell pixel
//   - Kitty: mã hóa base64 với C=1 để không dịch con trỏ; trả về rows dòng
//     rỗng phía sau để TUI tính chiều cao ảnh
//   - iTerm2: escape OSC 1337, dòng ảnh nằm cuối sau các dòng trống
//   - Không hỗ trợ hoặc lỗi: hiển thị imageFallback dạng văn bản
//   - Cache kết xuất theo chiều rộng; invalidate xóa cache
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo } from "react";
import { Text } from "ink";
import { fg, theme } from "../theme/index.js";
import {
  calculateImageCellSize,
  encodeITerm2,
  encodeKitty,
  getCapabilities,
  getCellDimensions,
  getImageDimensions,
  imageFallback,
  type ImageDimensions,
  truncateToWidthCompat,
} from "../core/TerminalImage.js";
import { layoutImageBlock } from "./image-layout.js";

export interface ImageProps {
  /** Dữ liệu ảnh đã base64. */
  base64Data: string;
  mimeType: string;
  /** Tên file để hiện ở dòng fallback. */
  filename?: string;
  /** Giới hạn chiều rộng theo số cột. */
  maxWidthCells?: number;
}

/** Component ảnh: render escape inline hoặc chữ thay thế. */
export const Image: React.FC<ImageProps> = ({
  base64Data,
  mimeType,
  filename,
  maxWidthCells = 60,
}) => {
  const dimensions: ImageDimensions | null = useMemo(
    () => getImageDimensions(base64Data, mimeType),
    [base64Data, mimeType],
  );

  const content = useMemo(() => {
    if (!dimensions) return null;
    const caps = getCapabilities();
    const cells = getCellDimensions();
    const maxWidth = Math.max(1, maxWidthCells);
    const size = calculateImageCellSize(dimensions, maxWidth, undefined, cells);

    if (caps.images === "kitty") {
      const sequence = encodeKitty(base64Data, {
        columns: size.columns,
        rows: size.rows,
        moveCursor: false,
      });
      // Các dòng rỗng sau ảnh để TUI tính đúng chiều khối.
      return { sequence, blankRows: Math.max(0, size.rows - 1) };
    }
    if (caps.images === "iterm2") {
      const sequence = encodeITerm2(base64Data, {
        width: size.columns,
        height: "auto",
        preserveAspectRatio: true,
      });
      const rowOffset = size.rows - 1;
      const moveUp = rowOffset > 0 ? `\x1b[${rowOffset}A` : "";
      return { sequence: `${moveUp}${sequence}`, blankRows: Math.max(0, size.rows - 1), iterm2: true };
    }
    return null;
  }, [base64Data, dimensions, maxWidthCells]);

  if (!content) {
    const fallback = imageFallback(mimeType, dimensions ?? undefined, filename);
    return <Text>{truncateToWidthCompat(theme.muted(fallback), 80)}</Text>;
  }

  // Layout is protocol-specific (see image-layout.ts): Kitty puts the escape on
  // the first row and pads after it; iTerm2 pads first and draws on the last row
  // after moving the cursor back up. The old code always put the escape first,
  // which drew the iTerm2 image one row too high.
  const block = layoutImageBlock({
    protocol: content.iterm2 ? "iterm2" : "kitty",
    sequence: content.sequence,
    rows: content.blankRows + 1,
  });

  return (
    <>
      {block.map((line, i) => (
        <Text key={`img-line-${i}`}>{line.text}</Text>
      ))}
    </>
  );
};
