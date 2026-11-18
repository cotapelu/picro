// ScrollView - virtual scrolling with follow-end, overscroll chain, and scrollbar
// Port of pi-mono packages/tui/src/components/scroll-view.ts to Ink TSX
// Không copy code trực tiếp.

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme, fg } from "../theme/index.js";

export type ScrollViewScrollbar = "hidden" | "auto" | "always";

export interface ScrollViewOptions {
  axis?: "vertical";
  follow?: "none" | "end";
  primary?: boolean;
  overscroll?: "chain" | "contain";
  scrollbar?: ScrollViewScrollbar;
  scrollbarTrackStyle?: (text: string) => string;
  scrollbarThumbStyle?: (text: string) => string;
  scrollbarHideDelayMs?: number;
}

export interface ScrollViewScrollToOptions {
  /** Keep follow-end disabled even when the target is the current content end. */
  disableFollow?: boolean;
}

interface ScrollViewState {
  contentHeight: number;
  viewportHeight: number;
  scrollTop: number;
  followingEnd: boolean;
  followSuppressedAtEnd: boolean;
}

const MIN_RENDER_INTERVAL_MS = 16;

/**
 * ScrollView component that wraps a child component and provides:
 * - Vertical scrolling with follow-end behavior
 * - Overscroll chaining
 * - Scrollbar with auto/hidden/always modes
 * - Transient scrollbar that appears on activity
 */
interface ScrollViewProps {
  children: React.ReactNode;
  options?: ScrollViewOptions;
  width?: number;
  onRender?: () => void;
}

export const ScrollView: React.FC<ScrollViewProps> = ({
  children,
  options = {},
  width = 80,
  onRender,
}) => {
  const followEnd = (options.follow ?? "none") === "end";
  const primary = options.primary ?? false;
  const overscroll = options.overscroll ?? "chain";
  const scrollbar = options.scrollbar ?? "hidden";
  const scrollbarTrackStyle = options.scrollbarTrackStyle ?? ((text: string) => `\x1b[90m${text}\x1b[39m`);
  const scrollbarThumbStyle = options.scrollbarThumbStyle ?? ((text: string) => `\x1b[37m${text}\x1b[39m`);
  const scrollbarHideDelayMs = Math.max(0, Math.floor(options.scrollbarHideDelayMs ?? 1000));

  const [state, setState] = useState<ScrollViewState>({
    contentHeight: 0,
    viewportHeight: 0,
    scrollTop: 0,
    followingEnd: followEnd,
    followSuppressedAtEnd: false,
  });

  const requestRenderRef = useRef<(() => void) | undefined>(onRender);
  requestRenderRef.current = onRender;

  const scrollbarHideTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const transientScrollbarVisibleRef = useRef(false);
  const scrollbarActiveRef = useRef(false);

  const requestRenderCallback = useCallback(() => {
    requestRenderRef.current?.();
  }, []);

  const markScrollbarActivity = useCallback(() => {
    if (scrollbar !== "auto" || state.contentHeight <= state.viewportHeight) return;
    transientScrollbarVisibleRef.current = true;
    if (scrollbarHideTimerRef.current) {
      clearTimeout(scrollbarHideTimerRef.current);
      scrollbarHideTimerRef.current = undefined;
    }
    if (scrollbarActiveRef.current) return;
    scrollbarHideTimerRef.current = setTimeout(() => {
      scrollbarHideTimerRef.current = undefined;
      transientScrollbarVisibleRef.current = false;
      requestRenderCallback();
    }, scrollbarHideDelayMs);
    if (scrollbarHideTimerRef.current) {
      scrollbarHideTimerRef.current.unref?.();
    }
  }, [scrollbar, state.contentHeight, state.viewportHeight, scrollbarHideDelayMs, requestRenderCallback]);

  const hideTransientScrollbar = useCallback(() => {
    transientScrollbarVisibleRef.current = false;
    if (!scrollbarHideTimerRef.current) return;
    clearTimeout(scrollbarHideTimerRef.current);
    scrollbarHideTimerRef.current = undefined;
  }, []);

  const setScrollbarActive = useCallback((active: boolean) => {
    if (active === scrollbarActiveRef.current) return;
    scrollbarActiveRef.current = active;
    markScrollbarActivity();
    requestRenderCallback();
  }, [markScrollbarActivity, requestRenderCallback]);

  const getContentWidth = useCallback((w: number) => {
    return scrollbar === "always" && w > 1 ? w - 1 : w;
  }, [scrollbar]);

  const scrollTo = useCallback((scrollTop: number, options_: ScrollViewScrollToOptions = {}) => {
    setState((prev) => {
      const requested = Number.isFinite(scrollTop) ? Math.trunc(scrollTop) : prev.scrollTop;
      const maxScrollTop = Math.max(0, prev.contentHeight - prev.viewportHeight);
      const next = Math.max(0, Math.min(maxScrollTop, requested));
      const nextFollowSuppressedAtEnd = options_.disableFollow === true && next === maxScrollTop;
      const nextFollowingEnd = !nextFollowSuppressedAtEnd && followEnd && next === maxScrollTop;
      if (
        next === prev.scrollTop &&
        nextFollowingEnd === prev.followingEnd &&
        nextFollowSuppressedAtEnd === prev.followSuppressedAtEnd
      ) {
        return prev;
      }
      const moved = next !== prev.scrollTop;
      if (moved) {
        setTimeout(() => markScrollbarActivity(), 0);
      }
      return {
        ...prev,
        scrollTop: next,
        followingEnd: nextFollowingEnd,
        followSuppressedAtEnd: nextFollowSuppressedAtEnd,
      };
    });
  }, [followEnd, markScrollbarActivity]);

  const scrollBy = useCallback((lines: number): number => {
    const requested = Number.isFinite(lines) ? Math.trunc(lines) : 0;
    if (requested === 0) return 0;
    let result = 0;
    setState((prev) => {
      const maxScrollTop = Math.max(0, prev.contentHeight - prev.viewportHeight);
      const start = prev.followingEnd ? maxScrollTop : prev.scrollTop;
      const next = Math.max(0, Math.min(maxScrollTop, start + requested));
      const moved = next - start;
      const wasFollowingEnd = prev.followingEnd;
      result = requested - moved;
      if (moved !== 0) {
        setTimeout(() => markScrollbarActivity(), 0);
      }
      if (moved !== 0 || (followEnd && next === maxScrollTop) !== wasFollowingEnd) {
        requestRenderCallback();
      }
      return {
        ...prev,
        scrollTop: next,
        followingEnd: followEnd && next === maxScrollTop,
        followSuppressedAtEnd: false,
      };
    });
    return result;
  }, [followEnd, markScrollbarActivity, requestRenderCallback]);

  const scrollToStart = useCallback(() => {
    setState((prev) => {
      const maxScrollTop = Math.max(0, prev.contentHeight - prev.viewportHeight);
      const changed =
        prev.scrollTop !== 0 ||
        prev.followingEnd !== (followEnd && prev.contentHeight <= prev.viewportHeight);
      if (changed) {
        setTimeout(() => markScrollbarActivity(), 0);
        requestRenderCallback();
      }
      return {
        ...prev,
        scrollTop: 0,
        followingEnd: followEnd && prev.contentHeight <= prev.viewportHeight,
        followSuppressedAtEnd: false,
      };
    });
  }, [followEnd, markScrollbarActivity, requestRenderCallback]);

  const scrollToEnd = useCallback(() => {
    setState((prev) => {
      const next = Math.max(0, prev.contentHeight - prev.viewportHeight);
      const changed = prev.scrollTop !== next || prev.followingEnd !== followEnd;
      if (changed) {
        setTimeout(() => markScrollbarActivity(), 0);
        requestRenderCallback();
      }
      return {
        ...prev,
        scrollTop: next,
        followingEnd: followEnd,
        followSuppressedAtEnd: false,
      };
    });
  }, [followEnd, markScrollbarActivity, requestRenderCallback]);

  const updateLayout = useCallback((contentHeight: number, viewportHeight: number, requestRender: () => void) => {
    requestRenderRef.current = requestRender;
    const newContentHeight = Math.max(0, Math.floor(contentHeight));
    const newViewportHeight = Math.max(0, Math.floor(viewportHeight));
    const maxScrollTop = Math.max(0, newContentHeight - newViewportHeight);
    setState((prev) => {
      let newScrollTop = prev.scrollTop;
      let newFollowingEnd = prev.followingEnd;
      let newFollowSuppressedAtEnd = prev.followSuppressedAtEnd;

      if (prev.followingEnd) newScrollTop = maxScrollTop;
      else newScrollTop = Math.max(0, Math.min(prev.scrollTop, maxScrollTop));
      if (newScrollTop < maxScrollTop) newFollowSuppressedAtEnd = false;
      if (followEnd && newScrollTop === maxScrollTop && !newFollowSuppressedAtEnd) {
        newFollowingEnd = true;
      }
      if (newContentHeight <= newViewportHeight) {
        transientScrollbarVisibleRef.current = false;
      }

      return {
        contentHeight: newContentHeight,
        viewportHeight: newViewportHeight,
        scrollTop: newScrollTop,
        followingEnd: newFollowingEnd,
        followSuppressedAtEnd: newFollowSuppressedAtEnd,
      };
    });
  }, [followEnd]);

  const isScrollbarVisible = useMemo(() => {
    if (scrollbar === "always") return state.viewportHeight > 0;
    return scrollbar === "auto" && state.contentHeight > state.viewportHeight && transientScrollbarVisibleRef.current;
  }, [scrollbar, state.contentHeight, state.viewportHeight]);

  const contentWidth = getContentWidth(width);

  // Render scrollbar if needed
  const scrollbarElement = isScrollbarVisible && state.contentHeight > state.viewportHeight && state.viewportHeight > 0 ? (
    <Scrollbar
      trackStyle={scrollbarTrackStyle}
      thumbStyle={scrollbarThumbStyle}
      scrollTop={state.scrollTop}
      viewportHeight={state.viewportHeight}
      contentHeight={state.contentHeight}
      width={1}
    />
  ) : null;

  return (
    <Box flexDirection="column" width={width}>
      <Box flexDirection="column" width={contentWidth}>
        {children}
      </Box>
      {scrollbarElement}
    </Box>
  );
};

/**
 * Scrollbar component - renders a vertical scrollbar
 */
interface ScrollbarProps {
  trackStyle: (text: string) => string;
  thumbStyle: (text: string) => string;
  scrollTop: number;
  viewportHeight: number;
  contentHeight: number;
  width: number;
}

const Scrollbar: React.FC<ScrollbarProps> = ({
  trackStyle,
  thumbStyle,
  scrollTop,
  viewportHeight,
  contentHeight,
  width,
}) => {
  if (contentHeight <= viewportHeight) return null;

  const maxScrollTop = contentHeight - viewportHeight;
  const thumbHeight = Math.max(1, Math.floor((viewportHeight / contentHeight) * viewportHeight));
  const trackHeight = viewportHeight;
  const thumbTop = maxScrollTop > 0 ? Math.floor((scrollTop / maxScrollTop) * (trackHeight - thumbHeight)) : 0;

  const lines = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < trackHeight; i++) {
      if (i >= thumbTop && i < thumbTop + thumbHeight) {
        result.push(thumbStyle("█"));
      } else {
        result.push(trackStyle("│"));
      }
    }
    return result;
  }, [trackHeight, thumbTop, thumbHeight, trackStyle, thumbStyle]);

  return (
    <Box flexDirection="column" width={width}>
      {lines.map((line, i) => (
        <Text key={`sb-${i}`}>{line}</Text>
      ))}
    </Box>
  );
};

export default ScrollView;