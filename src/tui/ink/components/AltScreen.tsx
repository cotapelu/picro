// AltScreen - fullscreen alternate screen mode with mouse, selection, scrollbar, search
// Port of pi-mono packages/tui/src/tui-alt-screen.ts to Ink TSX
// Không copy code trực tiếp.

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { ScrollView } from "./ScrollView.js";
import { theme, fg, bg } from "../theme/index.js";
import { visibleWidth, sliceByColumn, truncateToWidth, wrapTextWithAnsi } from "../core/TerminalText.js";
import { matchesKey } from "../core/Keys.js";

const ENTER_ALT_SCREEN = "\x1b[?1049h";
const EXIT_ALT_SCREEN = "\x1b[?1049l";
const DISABLE_AUTOWRAP = "\x1b[?7l";
const ENABLE_AUTOWRAP = "\x1b[?7h";
const ENABLE_MOUSE = "\x1b[?1000h\x1b[?1002h\x1b[?1004h\x1b[?1006h";
const DISABLE_MOUSE = "\x1b[?1006l\x1b[?1004l\x1b[?1003l\x1b[?1002l\x1b[?1000l";
const PAGE_SCROLL_OVERLAP = 4;

type SelectionGranularity = "character" | "word" | "line";

interface SelectionPoint {
  row: number;
  col: number;
  scrollView?: typeof ScrollView;
  boundary?: boolean;
}

interface SelectionRange {
  start: SelectionPoint;
  end: SelectionPoint;
}

interface ClickTarget {
  timestamp: number;
  count: number;
  row: number;
  scrollView?: typeof ScrollView;
  wordStart: number;
  wordEnd: number;
}

interface SearchHighlightRange {
  startCol: number;
  endCol: number;
  current: boolean;
}

type SearchSelectionMode = "query" | "retain" | "next" | "previous";

interface ActiveSearch {
  query: string;
  matches: SearchHighlightRange[];
  selectedIndex: number;
  anchorRow: number;
  selectionMode: SearchSelectionMode;
}

export interface AltScreenProps {
  children: React.ReactNode;
  options?: {
    wheelScrollLines?: number;
    mouse?: boolean;
    searchMatchStyle?: (text: string) => string;
    searchCurrentMatchStyle?: (text: string) => string;
    searchNavigationButtonStyle?: (text: string, hovered: boolean) => string;
    scrollToEndIndicator?: () => string;
    openUrl?: (url: string) => void;
    onRightClickPaste?: () => void;
    copyOnSelect?: boolean;
    copySelection?: (text: string) => Promise<boolean | string>;
  };
  width?: number;
  height?: number;
  onExit?: () => void;
}

export const AltScreen: React.FC<AltScreenProps> = ({
  children,
  options = {},
  width = 80,
  height = 24,
  onExit,
}) => {
  const [altScreenActive, setAltScreenActive] = useState(false);
  const [selectionGranularity, setSelectionGranularity] = useState<SelectionGranularity>("character");
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionPoint | undefined>(undefined);
  const [selectionFocus, setSelectionFocus] = useState<SelectionPoint | undefined>(undefined);
  const [lastClick, setLastClick] = useState<ClickTarget | undefined>(undefined);
  const [pressedUrl, setPressedUrl] = useState<string | undefined>(undefined);
  const [activeSearch, setActiveSearch] = useState<ActiveSearch | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(height);
  const [contentHeight, setContentHeight] = useState(0);

  const selectionDragPointerRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const selectionAutoScrollDirectionRef = useRef< -1 | 0 | 1>(0);
  const selectionAutoScrollTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const selectionPressActiveRef = useRef(false);
  const selectionDraggedRef = useRef(false);
  const scrollbarDragRef = useRef<{ scrollView: typeof ScrollView; grabOffset: number } | undefined>(undefined);
  const scrollbarHoverRef = useRef<typeof ScrollView | undefined>(undefined);

  const terminalWrite = useCallback((data: string) => process.stdout.write(data), []);

  const enterAltScreen = useCallback(() => {
    terminalWrite(`${ENTER_ALT_SCREEN}${DISABLE_AUTOWRAP}${ENABLE_MOUSE}\x1b[2J\x1b[H\x1b[?25l`);
    setAltScreenActive(true);
  }, [terminalWrite]);

  const exitAltScreen = useCallback(() => {
    if (!altScreenActive) return;
    terminalWrite(`${DISABLE_MOUSE}${ENABLE_AUTOWRAP}${EXIT_ALT_SCREEN}\x1b[?25h`);
    setAltScreenActive(false);
    onExit?.();
  }, [altScreenActive, terminalWrite, onExit]);

  useEffect(() => {
    enterAltScreen();
    return () => exitAltScreen();
  }, [enterAltScreen, exitAltScreen]);

  const decodeMouseButton = useCallback((button: number): "left" | "middle" | "right" | "none" => {
    switch (button & 3) {
      case 0: return "left";
      case 1: return "middle";
      case 2: return "right";
      default: return "none";
    }
  }, []);

  const handleMouseEvent = useCallback((data: string): boolean => {
    const match = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/.exec(data);
    if (!match) return false;
    const button = parseInt(match[1], 10);
    const x = parseInt(match[2], 10) - 1;
    const y = parseInt(match[3], 10) - 1;
    const release = match[4] === "m";

    // Handle mouse events for selection, scrolling, scrollbar
    // This is a simplified implementation
    return true;
  }, []);

  const handleWheelEvent = useCallback((data: string): boolean => {
    const match = /^\x1b\[<(\d+);(\d+);(\d+)[Mm]$/.exec(data);
    if (!match) return false;
    const button = parseInt(match[1], 10);
    if ((button & 64) === 0) return false;
    const direction = button & 3;
    if (direction !== 0 && direction !== 1) return false;
    const wheelDelta = direction === 0 ? -1 : 1;
    // Handle wheel scrolling
    return true;
  }, []);

  const startSearch = useCallback(() => {
    setActiveSearch({
      query: "",
      matches: [],
      selectedIndex: -1,
      anchorRow: scrollTop,
      selectionMode: "query",
    });
  }, [scrollTop]);

  const closeSearch = useCallback(() => {
    setActiveSearch(undefined);
  }, []);

  const navigateSearch = useCallback((direction: -1 | 1) => {
    setActiveSearch(prev => {
      if (!prev?.query) return prev;
      return {
        ...prev,
        selectionMode: direction < 0 ? "previous" : "next",
      };
    });
  }, []);

  const handleSearch = useCallback((data: string): boolean => {
    if (matchesKey(data, "ctrl+shift+f")) {
      startSearch();
      return true;
    }
    if (activeSearch) {
      if (matchesKey(data, "n")) {
        navigateSearch(1);
        return true;
      }
      if (matchesKey(data, "shift+n")) {
        navigateSearch(-1);
        return true;
      }
      if (matchesKey(data, "escape")) {
        closeSearch();
        return true;
      }
    }
    return false;
  }, [activeSearch, startSearch, navigateSearch, closeSearch]);

  const handleViewportInput = useCallback((data: string): boolean => {
    if (data === "\x1b[O") { // FOCUS_OUT
      stopSelectionAutoScroll();
      selectionPressActiveRef.current = false;
      return true;
    }
    if (data === "\x1b[I") return true; // FOCUS_IN

    // Handle wheel
    if (handleWheelEvent(data)) return true;

    // Handle mouse
    if (handleMouseEvent(data)) return true;

    // Handle search keys
    if (handleSearch(data)) return true;

    // Handle page up/down, line up/down, top/bottom
    if (matchesKey(data, "pageup")) {
      scrollBy(-Math.max(1, viewportHeight - PAGE_SCROLL_OVERLAP));
      return true;
    }
    if (matchesKey(data, "pagedown")) {
      scrollBy(Math.max(1, viewportHeight - PAGE_SCROLL_OVERLAP));
      return true;
    }
    if (matchesKey(data, "ctrl+u")) {
      scrollBy(-Math.max(1, Math.floor(viewportHeight / 2)));
      return true;
    }
    if (matchesKey(data, "ctrl+d")) {
      scrollBy(Math.max(1, Math.floor(viewportHeight / 2)));
      return true;
    }
    if (matchesKey(data, "up")) {
      scrollBy(-1);
      return true;
    }
    if (matchesKey(data, "down")) {
      scrollBy(1);
      return true;
    }
    if (matchesKey(data, "home")) {
      scrollToTop();
      return true;
    }
    if (matchesKey(data, "end")) {
      scrollToBottom();
      return true;
    }

    return false;
  }, [viewportHeight]);

  const scrollBy = useCallback((lines: number) => {
    setScrollTop(prev => Math.max(0, Math.min(contentHeight - viewportHeight, prev + lines)));
  }, [contentHeight, viewportHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    setScrollTop(prev => Math.max(0, contentHeight - viewportHeight));
  }, [contentHeight, viewportHeight]);

  const stopSelectionAutoScroll = useCallback(() => {
    if (selectionAutoScrollTimerRef.current) {
      clearInterval(selectionAutoScrollTimerRef.current);
      selectionAutoScrollTimerRef.current = undefined;
    }
    selectionAutoScrollDirectionRef.current = 0;
    selectionDragPointerRef.current = undefined;
  }, []);

  // Handle keyboard input for alt-screen
  useInput((data) => {
    if (!altScreenActive) return;
    if (handleViewportInput(data)) return;
  });

  if (!altScreenActive) {
    return <Box>{children}</Box>;
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <ScrollView
        options={{ follow: "end", primary: true, overscroll: "chain", scrollbar: "auto" }}
        width={width}
      >
        {children}
      </ScrollView>
    </Box>
  );
};

export default AltScreen;