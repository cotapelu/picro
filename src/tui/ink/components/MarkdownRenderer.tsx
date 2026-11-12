// MarkdownRenderer - render markdown thành văn bản cho terminal
// Bắt chước nguyên tắc pi-mono components/markdown.ts:
//   - Tách theo khối (heading, paragraph, code, list, table, quote, hr)
//   - Cắt/đệm mỗi dòng theo đúng chiều rộng khả dụng
//   - Kiểu chữ theo theme: tiêu đề đậm, mờ cho gợi ý, xanh cho liên kết
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { classifyMarkdownLine, clipMarkdownLine, padMarkdownLine } from "./markdown-layout.js";
import { renderLatex } from "../core/Latex.js";
import { wrapTextWithAnsi } from "../core/TerminalText.js";

export interface MarkdownRendererProps {
  content: string;
  width?: number;
  /** Hàm biến đổi markdown của extension. */
  transform?: (markdown: string, availableWidth: number) => string;
  /** Đệm ngang cho nội dung. */
  paddingX?: number;
  /** In nghiêng toàn bộ khối (dùng cho thinking). */
  italic?: boolean;
  /** Token màu chữ cho cả khối. */
  color?: string;
}

/** Đệm dây đủ chiều rộng để viền khối đều nhau. */
interface Block {
  lines: string[];
  /** Khối mã có viền trên/dưới. */
  fenced?: boolean;
  /** Khối bảng đã được dựng sẵn (không cần style lại từng dòng). */
  table?: boolean;
  /** Khối danh sách: cần render theo cấp lồng nhau (pi-mono renderList). */
  list?: boolean;
}

/** Tách markdown thô thành các khối hiển thị. */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) {
      // Một khối được coi là danh sách nếu có ít nhất một dòng mục danh sách;
      // các dòng còn lại trong khối là nội dung mục hoặc dòng nối tiếp thụt vào.
      const list = buffer.some((line) => LIST_ITEM_RE.test(line));
      blocks.push({ lines: buffer, list });
      buffer = [];
    }
  };

  const lines = source.split("\n");
  let inFence = false;
  let fenceBuffer: string[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    blocks.push({ lines: renderTableBlock(tableBuffer), table: true });
    tableBuffer = [];
  };

  /** Dòng phân cách kiểu GFM: |---|---| hoặc ---|--- */
  const isDelimiterRow = (line: string): boolean =>
    /^\s*\|?[\s]*:?-{1,}:?[\s]*(\|[\s]*:?-{1,}:?[\s]*)*\|?\s*$/.test(line);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    // Dòng trống phân cách khối: đoạn văn này kết thúc tại đây.
    //
    // Bản cũ đẩy mọi dòng (kể cả trống) vào một buffer duy nhất nên một đoạn
    // văn đứng ngay trước danh sách bị coi là "dòng nối tiếp của mục danh sách"
    // và bị thụt lùi sai. Ngoài ra Ink KHÔNG render dòng trống (xem chú thích ở
    // return của component), nên phân cách đoạn phải do ranh giới khối tạo ra.
    if (raw.trim() === "" && !inFence) {
      flush();
      flushTable();
      continue;
    }
    if (/^\s*```/.test(raw)) {
      if (inFence) {
        blocks.push({ lines: [...fenceBuffer], fenced: true });
        fenceBuffer = [];
        inFence = false;
      } else {
        flush();
        flushTable();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fenceBuffer.push(fg("codeBlock", raw));
      continue;
    }
    // Bảng: dòng hiện tại chứa "|" và dòng tiếp theo là dòng phân cách. Bản cũ
    // không nhận diện bảng nên toàn bộ markdown table hiển thị như đoạn văn thô.
    const next = lines[i + 1];
    if (next !== undefined && raw.includes("|") && isDelimiterRow(next)) {
      flush();
      tableBuffer = [raw, next];
      i++;
      while (i + 1 < lines.length && (lines[i + 1] ?? "").includes("|") && (lines[i + 1] ?? "").trim() !== "") {
        tableBuffer.push(lines[i + 1]!);
        i++;
      }
      flushTable();
      continue;
    }
    buffer.push(raw);
  }
  if (inFence && fenceBuffer.length > 0) {
    blocks.push({ lines: fenceBuffer, fenced: true });
  }
  flushTable();
  flush();
  return blocks;
}

/**
 * Một dòng bắt đầu mục danh sách: `- x`, `* x`, `+ x`, `1. x`, `1) x` và
 * dạng task `- [ ] x` / `- [x] x`.
 */
const LIST_ITEM_RE = /^(\s*)(?:([-+*])|(\d{1,9})([.)]))\s+(?:\[([ xX])\]\s+)?(.*)$/;

/** Khoảng thụt của mỗi cấp danh sách lồng nhau. */
const LIST_INDENT = 2;

/** Ký hiệu bullet theo cấc độ, giống cách markdown viewer chọn bullet khác nhau. */
const LIST_BULLETS = ["•", "◦", "▪"];

interface ParsedListLine {
  /** Số cấp lồng nhau (0 = gốc). */
  depth: number;
  /** Phần đầu dòng đã tính (bullet/đánh số/task), rỗng nếu là dòng nối tiếp. */
  marker: string;
  /** Nội dung còn lại. */
  text: string;
}

/**
 * Độ sâu lồng của một dòng dựa trên stack khoảng thụt.
 *
 * Bản cũ `trimStart()` toàn bộ rồi render phẳng: danh sách lồng nhau mất hoàn
 * toàn cấu trúc (`- a / - b` dù nguồn có thụt vào). Đây là cách CommonMark
 * nhận diện: so khoảng thụt với mục gần nhất.
 */
function listDepth(indent: number, stack: number[]): number {
  while (stack.length > 1 && indent < (stack[stack.length - 1] ?? 0)) stack.pop();
  if (indent > (stack[stack.length - 1] ?? 0)) stack.push(indent);
  return stack.length - 1;
}

/** Phân tích một dòng thành (cấp, marker, nội dung); undefined nếu không phải mục. */
function parseListItem(raw: string, stack: number[], counters: number[]): ParsedListLine | undefined {
  const match = LIST_ITEM_RE.exec(raw);
  if (!match) return undefined;
  const depth = listDepth(match[1]!.length, stack);
  // Marker nằm trước nội dung: bullet/đánh số trước, cờ task theo sau (pi-mono).
  const task = match[5] !== undefined ? `[${match[5].toLowerCase() === "x" ? "x" : " "}] ` : "";
  if (match[3] !== undefined) {
    counters.length = depth + 1;
    counters[depth] = (counters[depth] ?? 0) + 1;
    return { depth, marker: `${counters[depth]}${match[4]} ${task}`, text: match[6] ?? "" };
  }
  return { depth, marker: `${LIST_BULLETS[depth % LIST_BULLETS.length]!} ${task}`, text: match[6] ?? "" };
}

/**
 * Render khối danh sách: giữ cấp lồng nhau, marker riêng theo cấc độ, đánh số
 * lại ordered list (đếm trong từng danh sách), wrap nội dung và thụt lùi các
 * dòng nối tiếp cho đúng cột.
 */
function renderListBlock(lines: string[], contentWidth: number): string[] {
  const stack: number[] = [0];
  const counters: number[] = [];
  const out: string[] = [];
  for (const raw of lines) {
    if (raw.trim() === "") {
      out.push("");
      continue;
    }
    const item = parseListItem(raw, stack, counters);
    const indent = " ".repeat((item?.depth ?? 0) * LIST_INDENT);
    const text = item ? styleInline(item.text) : styleInline(raw.trim());
    // Dòng nối tiếp (không phải mục) và các dòng wrap sau đều thụt về cột nội dung.
    const hang = item === undefined ? " ".repeat(LIST_INDENT) : " ".repeat(item.marker.length);
    const marker = item ? fg("listBullet", item.marker) : "";
    const wrapped = wrapTextWithAnsi(text, Math.max(4, contentWidth - indent.length - hang.length));
    wrapped.forEach((line, index) => {
      const prefix = index === 0 && item !== undefined ? marker : hang;
      out.push(clipMarkdownLine(`${indent}${prefix}${line}`, contentWidth));
    });
  }
  return out;
}

/** Tách một dòng bảng thành các ô (bỏ dấu | hai đầu). */
function splitTableRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  return text.split("|").map((cell) => cell.trim());
}

/** Căn độ rộng cột cho bảng rồi kẻ viền, kết quả là các dòng đã định dạng. */
function renderTableBlock(rows: string[]): string[] {
  if (rows.length < 2) return rows;
  const header = splitTableRow(rows[0]!);
  const body = rows.slice(2).map(splitTableRow);
  const colCount = Math.max(header.length, ...body.map((r) => r.length));
  const widths = Array.from({ length: colCount }, (_, c) =>
    Math.max(
      3,
      (header[c] ?? "").length,
      ...body.map((r) => (r[c] ?? "").length),
    ),
  );
  const formatRow = (cells: string[], styled: (text: string) => string) => {
    const padded = Array.from({ length: colCount }, (_, c) =>
      (cells[c] ?? "").padEnd(widths[c] ?? 0, " "),
    );
    return ` ${styled(padded.join(" │ "))} `;
  };
  const border = (left: string, mid: string, right: string) =>
    `${left}${widths.map((w) => "─".repeat((w ?? 0) + 2)).join(mid)}${right}`;
  return [
    border("┌", "┬", "┐"),
    formatRow(header, (text) => theme.bold(text)),
    border("├", "┼", "┤"),
    ...body.map((cells) => formatRow(cells, (text) => text)),
    border("└", "┴", "┘"),
  ];
}

/**
 * Áp kiểu chữ nội tuyến: `code`, **bold**, *italic*, [text](url), $latex$.
 *
 * Hai thay đổi so với bản cũ:
 *  - liên kết GIỮ URL: pi-mono hiện URL trong ngoặc khi chữ khác đích (và bọc
 *    OSC 8 khi terminal hỗ trợ). Bản cũ bỏ hoàn toàn đích của link.
 *  - công thức toán `$...$` được render bằng renderLatex của tầng core thay vì
 *    hiện nguyên chuỗi "$x^2$".
 */
function styleInline(line: string): string {
  let out = line;
  out = out.replace(/`([^`]+)`/g, (_m, code) => fg("code", code));
  out = out.replace(/\$([^$]+)\$/g, (_m, formula) => {
    const rendered = renderLatex(formula);
    return rendered !== undefined ? fg("mdCode", rendered) : `$${formula}$`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, text) => theme.bold(text));
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_m, pre, text) => `${pre}${theme.italic(text)}`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) =>
    text === url ? fg("link", text) : `${fg("link", text)}${fg("mdLinkUrl", ` (${url})`)}`,
  );
  return out;
}

/** Áp kiểu theo loại dòng. Danh sách do `renderListBlock` lo (một nơi quyết marker). */
function styleLine(line: string): string {
  const trimmed = line.trimStart();
  switch (classifyMarkdownLine(trimmed)) {
    case "heading": {
      const text = trimmed.replace(/^#{1,6}\s/, "");
      return `${theme.bold(fg("heading", text))}`;
    }
    case "quote":
      return `${fg("quote", "│ ")}${styleInline(trimmed.replace(/^>\s?/, ""))}`;
    case "hr":
      return fg("hr", "─".repeat(40));
    default:
      return styleInline(line);
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, width = 80, transform, paddingX = 0, italic = false, color }) => {
  const rendered = useMemo(() => {
    const contentWidth = Math.max(20, width - paddingX * 2);
    const blocks = parseBlocks(content);
    const out: string[] = [];

    blocks.forEach((block, blockIndex) => {
      if (blockIndex > 0) out.push("");
      if (block.fenced) {
        out.push(fg("codeBlockBorder", "```"));
        for (const line of block.lines) {
          out.push(padMarkdownLine(`  ${clipMarkdownLine(line, contentWidth - 2)}`, contentWidth));
        }
        out.push(fg("codeBlockBorder", "```"));
        return;
      }
      if (block.table) {
        for (const line of block.lines) {
          out.push(clipMarkdownLine(line, contentWidth));
        }
        return;
      }
      if (block.list) {
        out.push(...renderListBlock(block.lines, contentWidth));
        return;
      }
      const sourceLines = transform ? transform(block.lines.join("\n"), contentWidth).split("\n") : block.lines;
      sourceLines.forEach((line, i) => {
        const styled = styleLine(line);
        out.push(clipMarkdownLine(italic ? italicize(styled) : styled, contentWidth));
      });
    });

    return out;
  }, [content, width, transform, paddingX, italic]);

  const left = " ".repeat(paddingX);

  return (
    <Box flexDirection="column">
      {rendered.map((line, i) => (
        // Ink bỏ hoàn toàn <Text></Text> nên dòng trống phải là một dấu cách,
        // nếu không mọi đoạn văn liền mạch không có phân cách.
        <Text key={`md-${i}`}>{line === "" ? " " : `${left}${color ? fg(color, line) : line}`}</Text>
      ))}
    </Box>
  );
};

/** Bọc nghiêng một dòng đã tô màu, gi nguyên mã ANSI. */
function italicize(line: string): string {
  if (line.length === 0) return line;
  return `\x1b[3m${line}\x1b[23m`;
}
