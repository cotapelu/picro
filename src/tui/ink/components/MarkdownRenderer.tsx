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
}

/** Tách markdown thô thành các khối hiển thị. */
function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length > 0) {
      blocks.push({ lines: buffer });
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

/** Áp kiểu theo loại dòng. */
function styleLine(line: string, index: number): string {
  const trimmed = line.trimStart();
  switch (classifyMarkdownLine(trimmed)) {
    case "heading": {
      const text = trimmed.replace(/^#{1,6}\s/, "");
      return `${theme.bold(fg("heading", text))}`;
    }
    case "bullet":
      return `${fg("listBullet", "• ")}${styleInline(trimmed.replace(/^[-*+]\s/, ""))}`;
    case "ordered": {
      const m = /^(\d+)\.\s(.*)$/.exec(trimmed);
      return `${fg("listBullet", `${m?.[1] ?? index + 1}. `)}${styleInline(m?.[2] ?? "")}`;
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
      const sourceLines = transform ? transform(block.lines.join("\n"), contentWidth).split("\n") : block.lines;
      sourceLines.forEach((line, i) => {
        const styled = styleLine(line, i);
        out.push(clipMarkdownLine(italic ? italicize(styled) : styled, contentWidth));
      });
    });

    return out;
  }, [content, width, transform, paddingX, italic]);

  const left = " ".repeat(paddingX);

  return (
    <Box flexDirection="column">
      {rendered.map((line, i) => (
        <Text key={`md-${i}`}>{`${left}${color ? fg(color, line) : line}`}</Text>
      ))}
    </Box>
  );
};

/** Bọc nghiêng một dòng đã tô màu, gi nguyên mã ANSI. */
function italicize(line: string): string {
  if (line.length === 0) return line;
  return `\x1b[3m${line}\x1b[23m`;
}
