// TextInput - ô nhập một dòng kiểu pi-tui Input
// Bắt chước nguyên tắc pi-tui components/input.ts:
//   - Giá trị + vị trí con trỏ, hiển thị con trỏ giả khi được focus
//   - Cửa sổ cuộn ngang: giữ con trỏ trong khung, căn nửa khung
//   - Con trỏ dịch theo grapheme (xử lý emoji/kết hợp)
//   - Hỗ trợ placeholder khi rỗng
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme, fg, bg } from "../theme/index.js";

export interface TextInputProps {
  value?: string;
  placeholder?: string;
  prompt?: string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  onEscape?: () => void;
  disabled?: boolean;
  /** Cho phép lớp ngoài can thiệp phím điều hướng (vd cuộn transcript). */
  onKey?: (data: string, isUp: boolean, isDown: boolean) => void;
  /** Chiều rộng khung nhìn (chỉ để tương thích API). */
  width?: number;
}

/** Tách chuỗi theo grapheme để con trỏ không cắt giữa ký tự. */
function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(text)].map((s) => s.segment);
  }
  return [...text];
}

/**
 * Remove one grapheme from `text`, either side of `cursor`.
 *
 * Backward removal (Backspace) deletes the grapheme ending at the cursor;
 * forward removal (Delete) deletes the grapheme starting at the cursor. Ink
 * reports both keys, and treating `key.delete` as a second Backspace made the
 * Delete key erase the character before the cursor instead of after it.
 */
export function removeGrapheme(
  text: string,
  cursor: number,
  direction: "backward" | "forward",
): { text: string; cursor: number } {
  if (direction === "backward") {
    if (cursor <= 0) return { text, cursor };
    const remove = toGraphemes(text.slice(0, cursor)).at(-1)?.length ?? 1;
    const start = Math.max(0, cursor - remove);
    return { text: text.slice(0, start) + text.slice(cursor), cursor: start };
  }
  if (cursor >= text.length) return { text, cursor };
  const remove = toGraphemes(text.slice(cursor))[0]?.length ?? 1;
  return { text: text.slice(0, cursor) + text.slice(cursor + remove), cursor };
}

export const TextInput: React.FC<TextInputProps> = ({
  value = "",
  placeholder = "",
  prompt = "> ",
  onSubmit,
  onChange,
  onEscape,
  disabled = false,
  onKey,
}) => {
  const [text, setText] = useState(value);
  const [cursor, setCursor] = useState(text.length);
  const ref = useRef({ text, cursor });

  useEffect(() => {
    if (value !== ref.current.text) {
      ref.current = { text: value, cursor: Math.min(value.length, cursor) };
      setText(value);
      setCursor(ref.current.cursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    onChange?.(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const apply = useCallback((nextText: string, nextCursor: number) => {
    ref.current = { text: nextText, cursor: nextCursor };
    setText(nextText);
    setCursor(nextCursor);
  }, []);

  useInput((input, key) => {
    if (disabled) return;
    if (key.ctrl && input === "\u0003") return;

    if (key.return) {
      onSubmit?.(ref.current.text);
      apply("", 0);
      return;
    }

    if (input === "\u001b" && !key.ctrl && !key.meta) {
      onEscape?.();
      return;
    }

    // Dịch con trỏ theo grapheme.
    if (key.upArrow || key.downArrow) {
      onKey?.(input, key.upArrow === true, key.downArrow === true);
      return;
    }
    if (key.leftArrow) {
      const g = toGraphemes(ref.current.text.slice(0, ref.current.cursor));
      setCursor(Math.max(0, ref.current.cursor - (g.at(-1)?.length ?? 1)));
      return;
    }
    if (key.rightArrow) {
      const g = toGraphemes(ref.current.text.slice(ref.current.cursor));
      setCursor(Math.min(ref.current.text.length, ref.current.cursor + (g[0]?.length ?? 1)));
      return;
    }

    if (key.backspace || key.delete) {
      // Backspace deletes before the cursor, Delete deletes after it. Both used
      // to run the same backward-deletion code.
      const next = removeGrapheme(ref.current.text, ref.current.cursor, key.delete ? "forward" : "backward");
      apply(next.text, next.cursor);
      return;
    }

    if (key.ctrl && input === "u") {
      apply(ref.current.text.slice(ref.current.cursor), 0);
      return;
    }
    if (key.ctrl && input === "k") {
      apply(ref.current.text.slice(0, ref.current.cursor), ref.current.cursor);
      return;
    }
    if (key.ctrl && input === "a") {
      setCursor(0);
      return;
    }
    if (key.ctrl && input === "e") {
      setCursor(ref.current.text.length);
      return;
    }

    if (input && input.length >= 1 && input.charCodeAt(0) >= 32) {
      const before = ref.current.text.slice(0, ref.current.cursor);
      const after = ref.current.text.slice(ref.current.cursor);
      apply(before + input + after, before.length + input.length);
    }
  });

  // Cửa sổ cuộn ngang: hiển thị tối đa 60 cột, giữ con trỏ ở giữa.
  const AVAILABLE = 60;
  const total = text.length;
  let visibleText = text;
  let start = 0;
  let cursorCol = cursor;

  if (total > AVAILABLE) {
    const scrollWidth = cursor === total ? AVAILABLE - 1 : AVAILABLE;
    const half = Math.floor(scrollWidth / 2);
    if (cursor < half) {
      start = 0;
    } else if (cursor > total - half) {
      start = Math.max(0, total - scrollWidth);
    } else {
      start = Math.max(0, cursor - half);
    }
    visibleText = text.slice(start, start + scrollWidth);
    cursorCol = cursor - start;
  }

  const g = toGraphemes(visibleText.slice(cursorCol));
  const atCursor = g[0] ?? " ";
  const rest = visibleText.slice(cursorCol + atCursor.length);
  const before = visibleText.slice(0, cursorCol);

  return (
    <Box flexDirection="row">
      <Text>{prompt}</Text>
      {text.length === 0 && placeholder ? (
        <Text>{fg("dim", placeholder)}</Text>
      ) : (
        <Text>{`${before}${theme.inverse(atCursor)}${rest}`}</Text>
      )}
    </Box>
  );
};
