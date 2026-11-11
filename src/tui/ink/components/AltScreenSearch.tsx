// AltScreenSearch - hộp tìm kiếm trên vùng xem chính
// Bắt chước nguyên tắc pi-tui alt-screen-search.ts:
//   - Xây dựng chỉ mục tìm kiếm từ các dòng nội dung
//   - Ưu tiên chuỗi ASCII in được, không cần segment từng ô
//   - Trả về danh sách kết quả kèm vùng cột khớp
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { stripTerminalSequences, visibleWidth } from "../core/TerminalText.js";

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export interface SearchMatchSegment {
  row: number;
  startCol: number;
  endCol: number;
}

export interface SearchMatch {
  segments: SearchMatchSegment[];
}

interface SourceSpan {
  textStart: number;
  textEnd: number;
  row: number;
  startCol: number;
  endCol: number;
  linearColumns: boolean;
}

interface Corpus {
  text: string;
  spans: SourceSpan[];
}

const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

/** Dựng chỉ mục tìm kiếm từ các dòng đã có escape bị lược bỏ. */
function buildCorpus(lines: readonly string[]): Corpus {
  const chunks: string[] = [];
  const spans: SourceSpan[] = [];
  let textLength = 0;
  let pendingSeparator = false;

  const appendSeparator = () => {
    if (!pendingSeparator) return;
    chunks.push(" ");
    textLength += 1;
    pendingSeparator = false;
  };

  for (let row = 0; row < lines.length; row++) {
    const line = stripTerminalSequences(lines[row] ?? "");
    let column = 0;

    if (PRINTABLE_ASCII.test(line)) {
      let index = 0;
      while (index < line.length) {
        if (line.charCodeAt(index) === 0x20) {
          if (textLength > 0) pendingSeparator = true;
          column += 1;
          index += 1;
          continue;
        }
        let end = index + 1;
        while (end < line.length && line.charCodeAt(end) !== 0x20) end++;
        appendSeparator();
        const text = line.slice(index, end);
        chunks.push(text);
        spans.push({
          textStart: textLength,
          textEnd: textLength + text.length,
          row,
          startCol: column,
          endCol: column + text.length,
          linearColumns: true,
        });
        textLength += text.length;
        column += text.length;
        index = end;
      }
    } else {
      for (const grapheme of graphemeSegmenter.segment(line)) {
        const text = grapheme.segment;
        const width = visibleWidth(text);
        if (/^\s+$/u.test(text)) {
          if (textLength > 0) pendingSeparator = true;
          column += width;
          continue;
        }
        appendSeparator();
        chunks.push(text);
        spans.push({
          textStart: textLength,
          textEnd: textLength + text.length,
          row,
          startCol: column,
          endCol: column + width,
          linearColumns: false,
        });
        textLength += text.length;
        column += width;
      }
    }
  }
  return { text: chunks.join(""), spans };
}

/** Tìm truy vấn trong chỉ mục, trả về vùng cột khớp trên từng dòng. */
export function searchCorpus(corpus: Corpus, query: string): SearchMatch[] {
  if (!query) return [];
  const matches: SearchMatch[] = [];
  const lowerText = corpus.text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let start = lowerText.indexOf(lowerQuery);
  while (start !== -1) {
    const end = start + lowerQuery.length;
    const segments: SearchMatchSegment[] = [];
    for (const span of corpus.spans) {
      const overlapStart = Math.max(span.textStart, start);
      const overlapEnd = Math.min(span.textEnd, end);
      if (overlapStart >= overlapEnd) continue;
      if (span.linearColumns) {
        segments.push({
          row: span.row,
          startCol: span.startCol + (overlapStart - span.textStart),
          endCol: span.startCol + (overlapEnd - span.textStart),
        });
      } else {
        segments.push({ row: span.row, startCol: span.startCol, endCol: span.endCol });
      }
    }
    if (segments.length > 0) matches.push({ segments });
    start = lowerText.indexOf(lowerQuery, start + 1);
  }
  return matches;
}

export interface AltScreenSearchProps {
  /** Các dòng nội dung để tìm. */
  lines: readonly string[];
  /** Truy vấn hiện tại. */
  query: string;
  /** Chỉ báo kết quả: "i/n". */
  resultLabel?: string;
  /** Chiều rộng khung nhìn. */
  width?: number;
}

/** Hộp nhập truy vấn + tóm tắt số kết quả. */
export const AltScreenSearch: React.FC<AltScreenSearchProps> = ({
  lines,
  query,
  resultLabel,
  width = 80,
}) => {
  const matches = useMemo(() => searchCorpus(buildCorpus(lines), query), [lines, query]);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text>
        {fg("muted", "Tìm: ")}
        {fg("text", query)}
      </Text>
      <Text>{fg("dim", resultLabel ?? `${matches.length} kết quả`)}</Text>
    </Box>
  );
};
