// WordNavigation - di chuyển con trỏ theo từ
// Bắt chước nguyên tắc pi-tui word-navigation.ts:
//   - Bỏ qua khoảng trắng, dừng ở ranh giới từ/dấu câu kế tiếp
//   - Tôn trọng ranh giới dấu câu ASCII bên trong từ
// Port sang TSX riêng, khon copy code truc iep.

import { isWhitespaceChar, PUNCTUATION_REGEX } from "./TextPredicates.js";

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function findWordBackward(text: string, cursor: number): number {
  if (cursor <= 0) return 0;

  const before = text.slice(0, cursor);
  const segments = [...wordSegmenter.segment(before)];
  let newCursor = cursor;

  while (
    segments.length > 0 &&
    isWhitespaceChar(segments[segments.length - 1]?.segment ?? "")
  ) {
    newCursor -= segments.pop()?.segment.length ?? 0;
  }
  if (segments.length === 0) return newCursor;

  const last = segments[segments.length - 1]!;
  if (last.isWordLike) {
    const matches = [...last.segment.matchAll(new RegExp(PUNCTUATION_REGEX, "g"))];
    if (matches.length <= 0) {
      newCursor -= last.segment.length;
    } else {
      const lastMatch = matches[matches.length - 1]!;
      newCursor -= last.segment.length - (lastMatch.index + lastMatch[0].length);
    }
  } else {
    while (
      segments.length > 0 &&
      !segments[segments.length - 1]?.isWordLike &&
      !isWhitespaceChar(segments[segments.length - 1]?.segment ?? "")
    ) {
      newCursor -= segments.pop()?.segment.length ?? 0;
    }
  }
  return newCursor;
}

export function findWordForward(text: string, cursor: number): number {
  if (cursor >= text.length) return text.length;

  const after = text.slice(cursor);
  const iterator = wordSegmenter.segment(after)[Symbol.iterator]();
  let next = iterator.next();
  let newCursor = cursor;

  while (!next.done && isWhitespaceChar(next.value.segment)) {
    newCursor += next.value.segment.length;
    next = iterator.next();
  }
  if (next.done) return newCursor;

  if (next.value.isWordLike) {
    newCursor += new RegExp(PUNCTUATION_REGEX).exec(next.value.segment)?.index ?? next.value.segment.length;
  } else {
    while (!next.done && !next.value.isWordLike && !isWhitespaceChar(next.value.segment)) {
      newCursor += next.value.segment.length;
      next = iterator.next();
    }
  }
  return newCursor;
}
