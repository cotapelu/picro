// MarkdownRenderer - render markdown thành văn bản cho terminal
// Bắt chước nguyên tắc pi-mono components/markdown.ts:
//   - Tách theo khối (heading, paragraph, code, list, table, quote, hr)
//   - Cắt/đệm mỗi dòng theo đúng chiều rộng khả dụng
//   - Kiểu chữ theo theme: tiêu đề đậm, mờ cho gợi ý, xanh cho liên kết
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme.js";

interface MarkdownRendererProps {
  content: string;
  width?: number;
}

/** Cắt một dòng theo số cột hiển thị (không tính ANSI). */
function clipLine(line: string, width: number): string {
  if (width <= 0) return "";
  const plain = line.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return line;
  return line.slice(0, Math.max(0, width - 1)) + fg("dim", "…");
}

/** Đệm dây đủ chiều rộng để viền khối đều nhau. */
function padLine(line: string, width: number): string {
  const plain = line.replace(/\x1b\[[0-9;]*m/g, "");
  const missing = Math.max(0, width - plain.length);
  return line + " ".repeat(missing);
}

interface Block {
  lines: string[];
  /** Khối mã có viền trên/dưới. */
  fenced?: boolean;
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

  for (const raw of lines) {
    if (/^\s*```/.test(raw)) {
      if (inFence) {
        blocks.push({ lines: [...fenceBuffer], fenced: true });
        fenceBuffer = [];
        inFence = false;
      } else {
        flush();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fenceBuffer.push(fg("codeBlock", raw));
      continue;
    }
    buffer.push(raw);
  }
  if (inFence && fenceBuffer.length > 0) {
    blocks.push({ lines: fenceBuffer, fenced: true });
  }
  flush();
  return blocks;
}

/** Áp kiểu chữ nội tuyến: `code`, **bold**, *italic*, [link](url). */
function styleInline(line: string): string {
  let out = line;
  out = out.replace(/`([^`]+)`/g, (_m, code) => fg("code", code));
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, text) => theme.bold(text));
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_m, pre, text) => `${pre}${theme.italic(text)}`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text) => fg("link", text));
  return out;
}

/** Áp kiểu theo loại dòng. */
function styleLine(line: string, index: number): string {
  const trimmed = line.trimStart();
  if (/^#{1,6}\s/.test(trimmed)) {
    const text = trimmed.replace(/^#{1,6}\s/, "");
    return `${theme.bold(fg("heading", text))}`;
  }
  if (/^[-*+]\s/.test(trimmed)) {
    return `${fg("listBullet", "• ")}${styleInline(trimmed.replace(/^[-*+]\s/, ""))}`;
  }
  if (/^\d+\.\s/.test(trimmed)) {
    const m = /^(\d+)\.\s(.*)$/.exec(trimmed);
    return `${fg("listBullet", `${m?.[1] ?? index + 1}. `)}${styleInline(m?.[2] ?? "")}`;
  }
  if (/^>\s?/.test(trimmed)) {
    return `${fg("quote", "│ ")}${styleInline(trimmed.replace(/^>\s?/, ""))}`;
  }
  if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
    return fg("hr", "─".repeat(40));
  }
  return styleInline(line);
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, width = 80 }) => {
  const rendered = useMemo(() => {
    const contentWidth = Math.max(20, width - 4);
    const blocks = parseBlocks(content);
    const out: string[] = [];

    blocks.forEach((block, blockIndex) => {
      if (blockIndex > 0) out.push("");
      if (block.fenced) {
        out.push(fg("codeBlockBorder", "```"));
        for (const line of block.lines) {
          out.push(padLine(`  ${clipLine(line, contentWidth - 2)}`, contentWidth));
        }
        out.push(fg("codeBlockBorder", "```"));
        return;
      }
      block.lines.forEach((line, i) => out.push(clipLine(styleLine(line, i), contentWidth)));
    });

    return out;
  }, [content, width]);

  return (
    <Box flexDirection="column">
      {rendered.map((line, i) => (
        <Text key={`md-${i}`}>{line || " "}</Text>
      ))}
    </Box>
  );
};
