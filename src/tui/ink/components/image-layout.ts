// SPDX-License-Identifier: Apache-2.0
/**
 * Image block layout.
 *
 * Image.tsx emitted the escape sequence FIRST and then the blank rows for both
 * protocols. Upstream renders `rows` lines in a protocol-specific order:
 *   - Kitty: the sequence on the FIRST row, then (rows-1) blank rows.
 *   - iTerm2: (rows-1) blank rows first, then the sequence on the LAST row
 *     (after moving the cursor back up by rows-1).
 * Drawing the iTerm2 image before its padding put it one row too high and made
 * the block rows+1 lines tall, so following content was overwritten.
 */

import { visibleWidth } from "../core/index.js";

export type ImageProtocol = "kitty" | "iterm2";

export interface ImageBlockInput {
  protocol: ImageProtocol;
  /** Escape sequence that draws the image. */
  sequence: string;
  /** Number of terminal rows the image occupies. */
  rows: number;
}

export interface ImageLine {
  /** Rendered text for this row. */
  text: string;
  /** True for the row that carries the image escape. */
  isImageRow: boolean;
}

/**
 * Lay out `rows` lines for an inline image: padding plus the image row, in the
 * order the protocol expects. Always returns exactly `rows` entries.
 */
export function layoutImageBlock({ protocol, sequence, rows }: ImageBlockInput): ImageLine[] {
  const total = Math.max(1, Math.floor(rows));
  const blankRows = Math.max(0, total - 1);

  if (protocol === "iterm2") {
    const moveUp = blankRows > 0 ? `\x1b[${blankRows}A` : "";
    const lines: ImageLine[] = [];
    for (let i = 0; i < blankRows; i++) lines.push({ text: " ", isImageRow: false });
    lines.push({ text: `${moveUp}${sequence}`, isImageRow: true });
    return lines;
  }

  const lines: ImageLine[] = [{ text: sequence, isImageRow: true }];
  for (let i = 0; i < blankRows; i++) lines.push({ text: " ", isImageRow: false });
  return lines;
}

/** True when the escape appears before any padding on the FIRST line. */
export function isKittySequenceFirst(lines: ImageLine[]): boolean {
  return lines.length > 0 && lines[0]!.isImageRow;
}

/** True when the escape appears on the LAST line, after all padding. */
export function isITerm2SequenceLast(lines: ImageLine[]): boolean {
  return lines.length > 0 && lines[lines.length - 1]!.isImageRow;
}

/** Rows that carry no image (pure padding). */
export function blankRowCount(lines: ImageLine[]): number {
  return lines.filter((l) => !l.isImageRow).length;
}

/** Chiều rộng hiển thị của một dòng ảnh (bỏ qua escape). */
export function imageLineWidth(line: ImageLine): number {
  return visibleWidth(line.text);
}
