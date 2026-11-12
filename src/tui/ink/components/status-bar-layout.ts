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

/**
 * Độ dài escape sequence bắt đầu tại `pos`, hoặc -1 nếu không phải escape.
 * Nhận SGR, OSC 8 (hyperlink) và APC — không chỉ SGR — vì một chuỗi đã tô màu
 * có thể chứa hyperlink không hề có ký tự "m" kết thúc.
 */
function escapeLengthAt(text: string, pos: number): number {
  if (text[pos] !== "\x1b") return -1;
  const next = text[pos + 1];
  if (next === "[") {
    for (let j = pos + 2; j < text.length; j++) {
      const c = text[j];
      if (c === "m" || c === "G" || c === "K" || c === "H" || c === "J") return j + 1 - pos;
    }
    return -1;
  }
  if (next === "]" || next === "_") {
    for (let j = pos + 2; j < text.length; j++) {
      if (text[j] === "\x07") return j + 1 - pos;
      if (text[j] === "\x1b" && text[j + 1] === "\\") return j + 2 - pos;
    }
    return -1;
  }
  return -1;
}

/** Cắt chuỗi đã tô màu theo số cột hiển thị, nuốt trọn escape. */
export function truncateVisual(text: string, width: number, ellipsis = "…"): string {
  if (width <= 0) return "";
  if (visibleTextWidth(text) <= width) return text;
  const keep = width > 1 ? width - 1 : 0;
  let taken = 0;
  let out = "";
  let i = 0;
  while (i < text.length && taken < keep) {
    const escapeLen = escapeLengthAt(text, i);
    if (escapeLen > 0) {
      // Nuốt trọn escape sequence, không tính vào độ rộng.
      out += text.slice(i, i + escapeLen);
      i += escapeLen;
      continue;
    }
    out += text[i];
    taken++;
    i++;
  }
  // Giữ lại phần đuôi escape (reset) nếu đã cắt giữa đoạn có màu.
  while (i < text.length) {
    const escapeLen = escapeLengthAt(text, i);
    if (escapeLen <= 0) break;
    out += text.slice(i, i + escapeLen);
    i += escapeLen;
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
