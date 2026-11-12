// SPDX-License-Identifier: Apache-2.0
/**
 * Status bar layout.
 *
 * Extracted from StatusBar so the column arithmetic is testable without Ink's
 * renderer, and to fix the defect the inline code had: the right-hand budget was
 * computed from `left.length` - which counts ANSI escape bytes - while the gap
 * used the visible width. The model/thinking info was therefore truncated about
 * nine columns too early on every render.
 */

const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** Chiều rộng hiển thị (bỏ qua escape màu). */
export function visibleTextWidth(text: string): number {
  return text.replace(ANSI_RE, "").length;
}

/** Cắt chuỗi đã tô màu theo số cột hiển thị, nuốt trọn escape. */
export function truncateVisual(text: string, width: number, ellipsis = "…"): string {
  if (width <= 0) return "";
  if (visibleTextWidth(text) <= width) return text;
  const keep = width > 1 ? width - 1 : 0;
  let taken = 0;
  let out = "";
  for (let i = 0; i < text.length && taken < keep; i++) {
    out += text[i];
    if (text[i] === "\x1b") {
      // Nuốt phần còn lại của escape sequence.
      while (i < text.length && text[i] !== "m") {
        i++;
        out += text[i] ?? "";
      }
      continue;
    }
    taken++;
  }
  return out + ellipsis;
}

export interface StatusBarLineParts {
  /** Nửa trái (có thể chứa escape). */
  left: string;
  /** Các đoạn nửa phải, ghép bằng " · ". */
  rightParts: string[];
  /** Tổng số cột của terminal. */
  columns: number;
}

export interface StatusBarLine {
  left: string;
  right: string;
  gap: number;
}

/**
 * Ghép hai nửa thành một dòng: cột phải được cắt theo phần còn lại của dòng,
 * khoảng trống lấp đầy. Một cột dự phòng ở cuối tránh tràn khi terminal co.
 */
export function composeStatusBarLine({ left, rightParts, columns }: StatusBarLineParts): StatusBarLine {
  const total = columns > 0 ? columns : 80;
  const leftWidth = visibleTextWidth(left);
  const available = Math.max(0, total - leftWidth - 3);
  const right = truncateVisual(rightParts.join(" · "), available);
  const rightWidth = visibleTextWidth(right);
  const gap = Math.max(2, total - leftWidth - rightWidth);
  return { left, right, gap };
}
