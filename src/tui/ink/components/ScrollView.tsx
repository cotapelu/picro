// ScrollView - vùng xem có cuộn theo dõi cuối
// Bắt chước nguyên tắc pi-tui components/scroll-view.ts:
//   - follow:"end" - luôn neo ở cuối khi nội dung dài hơn khung nhìn
//   - scrollTo / scrollBy / scrollToStart / scrollToEnd
//   - Tắt theo dõi khi cuộn lên, bật lại khi về đáy
//   - Scrollbar ẩn/hiện theo hoạt động cuộn
//   - updateLayout: cập nhật chiều cao nội dung và khung nhìn
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme.js";

export type ScrollbarMode = "hidden" | "auto" | "always";

export interface ScrollViewProps {
  /** Danh sách dòng nội dung. */
  lines: string[];
  /** Chiều cao khung nhìn (số dòng hiển thị). */
  viewportHeight: number;
  /** Bám theo cuối khi nội dung dài hơn khung nhìn. */
  follow?: boolean;
  /** Chế độ thanh cuộn. */
  scrollbar?: ScrollbarMode;
  /** Khoảng cách giữ các dòng. */
  gap?: number;
}

const SCROLLBAR_HIDE_DELAY_MS = 1000;

export const ScrollView: React.FC<ScrollViewProps> = ({
  lines,
  viewportHeight,
  follow = true,
  scrollbar = "hidden",
  gap = 0,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [followingEnd, setFollowingEnd] = useState(follow);
  const [suppressedAtEnd, setSuppressedAtEnd] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const [barActive, setBarActive] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const contentHeight = Math.max(0, lines.length);
  const maxScrollTop = Math.max(0, contentHeight - viewportHeight);
  const canScroll = contentHeight > viewportHeight;

  const markBarActivity = () => {
    if (scrollbar === "auto" && canScroll) {
      setBarVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setBarVisible(false), SCROLLBAR_HIDE_DELAY_MS);
    }
  };

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // Cập nhật bố cục: neo cuối nếu đang theo dõi.
  useEffect(() => {
    if (followingEnd && !suppressedAtEnd) {
      setScrollTop(maxScrollTop);
    } else if (scrollTop > maxScrollTop) {
      setScrollTop(maxScrollTop);
    }
    if (canScroll && scrollTop < maxScrollTop) setSuppressedAtEnd(false);
    if (follow && scrollTop === maxScrollTop && !suppressedAtEnd) setFollowingEnd(true);
    if (!canScroll) setBarVisible(false);
  }, [contentHeight, viewportHeight, maxScrollTop, followingEnd, suppressedAtEnd, scrollTop, canScroll, follow]);

  const scrollTo = (target: number, opts: { disableFollow?: boolean } = {}) => {
    const next = Math.max(0, Math.min(maxScrollTop, Number.isFinite(target) ? Math.trunc(target) : scrollTop));
    const nextSuppressed = opts.disableFollow === true && next === maxScrollTop;
    const nextFollowing = !nextSuppressed && follow && next === maxScrollTop;
    if (next === scrollTop && nextFollowing === followingEnd && nextSuppressed === suppressedAtEnd) return;
    if (next !== scrollTop) markBarActivity();
    setScrollTop(next);
    setFollowingEnd(nextFollowing);
    setSuppressedAtEnd(nextSuppressed);
  };

  const scrollBy = (delta: number): number => {
    if (!Number.isFinite(delta) || Math.trunc(delta) === 0) return 0;
    const start = followingEnd ? maxScrollTop : scrollTop;
    const next = Math.max(0, Math.min(maxScrollTop, start + Math.trunc(delta)));
    const moved = next - start;
    if (moved !== 0) markBarActivity();
    setScrollTop(next);
    setFollowingEnd(follow && next === maxScrollTop);
    setSuppressedAtEnd(false);
    return Math.trunc(delta) - moved;
  };

  const scrollToStart = () => {
    setScrollTop(0);
    setFollowingEnd(follow && contentHeight <= viewportHeight);
    setSuppressedAtEnd(false);
    markBarActivity();
  };

  const scrollToEnd = () => {
    setScrollTop(maxScrollTop);
    setFollowingEnd(follow);
    setSuppressedAtEnd(false);
    markBarActivity();
  };

  // Phím cuộn được truyền từ component duy nhất nhận useInput.
  useEffect(() => {
    // Hook dự phòng cho tương lai; App sẽ gọi scrollTo/scrollBy qua ref.
  }, []);

  const gapLines = Math.max(0, gap);
  const visible = lines.slice(scrollTop, scrollTop + viewportHeight);
  const showBar =
    scrollbar === "always" ? viewportHeight > 0 : scrollbar === "auto" && canScroll && barVisible;

  return (
    <Box flexDirection="column">
      {visible.map((line, i) => (
        <React.Fragment key={`sv-${scrollTop + i}`}>
          {i > 0 && Array.from({ length: gapLines }).map((_, g) => <Text key={`gap-${i}-${g}`}> </Text>)}
          <Text>{line.length > 0 ? line : " "}</Text>
        </React.Fragment>
      ))}
      {/* Phần đệm cho đủ khung nhìn khi nội dung ngắn. */}
      {Array.from({ length: Math.max(0, viewportHeight - visible.length) }).map((_, i) => (
        <Text key={`pad-${i}`}> </Text>
      ))}
      {showBar ? (
        <Box position="absolute" flexDirection="column">
          {Array.from({ length: viewportHeight }).map((_, row) => {
            const thumbHeight = Math.max(
              Math.min(2, viewportHeight),
              Math.min(viewportHeight, Math.round((viewportHeight * viewportHeight) / Math.max(1, contentHeight))),
            );
            const maxThumbTop = viewportHeight - thumbHeight;
            const thumbTop = maxScrollTop === 0 ? 0 : Math.round((scrollTop / maxScrollTop) * maxThumbTop);
            const isThumb = row >= thumbTop && row < thumbTop + thumbHeight;
            const glyph = isThumb ? (barActive ? "█" : "┃") : "│";
            return (
              <Text key={`bar-${row}`}>
                {isThumb ? fg("accent", glyph) : fg("dim", glyph)}
              </Text>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
};
