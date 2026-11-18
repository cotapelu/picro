// ScrollView - virtual scrolling với follow mode
// Bắt chước nguyên tắc pi-tui scroll-view.ts:
//   - Virtual rendering: chỉ render visible lines
//   - follow: "end" | "start" | "none"
//   - overscroll: "chain" | "hidden" | "clamp"
//   - Scrollbar: auto/always/hidden
// Port sang TSX riêng, không copy code trực tiếp.

import { Component, ScrollViewOptions, ScrollViewScrollbar, TuiMouseEvent, TuiMouseEventResult, LayoutRect } from "./TuiTypes.js";

interface LineInfo {
  content: string;
  component: Component;
  componentIndex: number;
  lineIndex: number;
}

export class ScrollView implements Component {
  private content: Component;
  private options: Required<ScrollViewOptions>;
  private scrollOffset = 0;
  private lastWidth = 0;
  private lastHeight = 0;
  private lineCache: LineInfo[] = [];
  private lastRenderedLines: string[] = [];
  private viewportHeight = 0;
  private contentHeight = 0;
  private scrollbarDragging = false;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private onScrollCallback?: (offset: number) => void;
  private overscrollOffset = 0;
  private followPending = false;

  constructor(content: Component, options: ScrollViewOptions = {}) {
    this.content = content;
    this.options = {
      follow: options.follow ?? "end",
      primary: options.primary ?? true,
      overscroll: options.overscroll ?? "chain",
      scrollbar: options.scrollbar ?? "auto",
      scrollbarTrackStyle: options.scrollbarTrackStyle ?? ((t) => t),
      scrollbarThumbStyle: options.scrollbarThumbStyle ?? ((t) => t),
    };
  }

  setContent(content: Component): void {
    this.content = content;
    this.invalidate();
  }

  setOnScroll(callback: (offset: number) => void): void {
    this.onScrollCallback = callback;
  }

  invalidate(): void {
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.lineCache = [];
    this.lastRenderedLines = [];
    this.content.invalidate();
  }

  render(width: number, height?: number): string[] {
    const viewportHeight = height ?? this.viewportHeight;
    if (viewportHeight <= 0) return [];

    // Build line cache if needed
    if (this.lineCache.length === 0 || width !== this.lastWidth) {
      this.rebuildLineCache(width);
    }

    this.lastWidth = width;
    this.viewportHeight = viewportHeight;
    this.contentHeight = this.lineCache.length;

    // Auto-follow to end
    if (this.options.follow === "end" && !this.scrollbarDragging) {
      this.scrollOffset = Math.max(0, this.contentHeight - viewportHeight);
    }

    // Clamp scroll offset
    const maxOffset = Math.max(0, this.contentHeight - viewportHeight);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + this.overscrollOffset, maxOffset));
    this.overscrollOffset = 0;

    // Get visible lines
    const start = Math.floor(this.scrollOffset);
    const end = Math.min(start + viewportHeight, this.contentHeight);
    const visibleLines = this.lineCache.slice(start, end).map((l) => l.content);

    // Build scrollbar
    const showScrollbar = this.shouldShowScrollbar(viewportHeight);
    const lines: string[] = [];

    if (showScrollbar) {
      const trackStyle = this.options.scrollbarTrackStyle;
      const thumbStyle = this.options.scrollbarThumbStyle;
      const scrollbarWidth = 1;
      const contentWidth = width - scrollbarWidth;

      for (let i = 0; i < viewportHeight; i++) {
        const lineIdx = start + i;
        const contentLine = i < visibleLines.length ? visibleLines[i] : "";
        const padded = this.padToWidth(contentLine, contentWidth);

        // Scrollbar track/thumb
        let scrollbarChar = " ";
        if (this.contentHeight > viewportHeight) {
          const thumbHeight = Math.max(1, Math.floor((viewportHeight * viewportHeight) / this.contentHeight));
          const thumbTop = Math.floor((this.scrollOffset / (this.contentHeight - viewportHeight)) * (viewportHeight - thumbHeight));
          if (i >= thumbTop && i < thumbTop + thumbHeight) {
            scrollbarChar = thumbStyle("█");
          } else {
            scrollbarChar = trackStyle("│");
          }
        }

        lines.push(padded + scrollbarChar);
      }
    } else {
      for (const line of visibleLines) {
        lines.push(this.padToWidth(line, width));
      }
    }

    this.lastRenderedLines = lines;
    return lines;
  }

  private rebuildLineCache(width: number): void {
    this.lineCache = [];
    const contentLines = this.content.render(width);
    for (let i = 0; i < contentLines.length; i++) {
      this.lineCache.push({
        content: contentLines[i],
        component: this.content,
        componentIndex: 0,
        lineIndex: i,
      });
    }
  }

  private shouldShowScrollbar(viewportHeight: number): boolean {
    if (this.options.scrollbar === "always") return true;
    if (this.options.scrollbar === "hidden") return false;
    return this.contentHeight > viewportHeight; // auto
  }

  private padToWidth(text: string, width: number): string {
    const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
    if (plain.length >= width) return text;
    return text + " ".repeat(width - plain.length);
  }

  handleInput(data: string): void {
    // Handle scroll keys
    const lines = data.split("");
    if (data === "\x1b[5~") { // PageUp
      this.scrollBy(-this.viewportHeight);
    } else if (data === "\x1b[6~") { // PageDown
      this.scrollBy(this.viewportHeight);
    } else if (data === "\x1b[1;5A") { // Ctrl+Up
      this.scrollBy(-5);
    } else if (data === "\x1b[1;5B") { // Ctrl+Down
      this.scrollBy(5);
    } else if (data === "\x1b[1;2A") { // Shift+Up
      this.scrollBy(-1);
    } else if (data === "\x1b[1;2B") { // Shift+Down
      this.scrollBy(1);
    } else if (data === "\x1b[H" || data === "\x1b[1~") { // Home
      this.scrollTo(0);
    } else if (data === "\x1b[F" || data === "\x1b[4~") { // End
      this.scrollTo(this.contentHeight);
    } else {
      // Forward to content
      this.content.handleInput?.(data);
    }
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    const showScrollbar = this.shouldShowScrollbar(this.viewportHeight);
    const scrollbarWidth = showScrollbar ? 1 : 0;
    const contentWidth = event.width - scrollbarWidth;

    // Check if clicking/dragging scrollbar
    if (showScrollbar && event.x >= contentWidth) {
      if (event.type === "press" && event.button === "left") {
        this.scrollbarDragging = true;
        this.dragStartY = event.y;
        this.dragStartOffset = this.scrollOffset;
        return { handled: true, focus: true };
      }
      if (event.type === "drag" && this.scrollbarDragging) {
        const trackHeight = this.viewportHeight;
        const thumbHeight = Math.max(1, Math.floor((trackHeight * trackHeight) / this.contentHeight));
        const maxThumbTop = trackHeight - thumbHeight;
        const dragDelta = event.y - this.dragStartY;
        const scrollDelta = (dragDelta / Math.max(1, maxThumbTop)) * (this.contentHeight - this.viewportHeight);
        this.scrollOffset = Math.max(0, Math.min(this.dragStartOffset + scrollDelta, this.contentHeight - this.viewportHeight));
        this.onScrollCallback?.(this.scrollOffset);
        return { handled: true };
      }
      if (event.type === "release" && this.scrollbarDragging) {
        this.scrollbarDragging = false;
        return { handled: true };
      }
    }

    // Wheel scroll
    if (event.type === "wheel") {
      const delta = event.button === "wheel-up" ? -3 : 3;
      this.scrollBy(delta);
      return { handled: true };
    }

    // Forward to content
    const adjustedEvent: TuiMouseEvent = {
      ...event,
      x: Math.min(event.x, contentWidth - 1),
      width: contentWidth,
    };
    return this.content.handleMouse?.(adjustedEvent);
  }

  scrollBy(delta: number): void {
    const maxOffset = Math.max(0, this.contentHeight - this.viewportHeight);
    const newOffset = this.scrollOffset + delta;
    if (newOffset <= 0) {
      if (this.options.overscroll === "chain" && delta < 0) {
        this.overscrollOffset = newOffset; // Negative overscroll for chaining
      }
      this.scrollOffset = 0;
    } else if (newOffset >= maxOffset) {
      if (this.options.overscroll === "chain" && delta > 0) {
        this.overscrollOffset = newOffset - maxOffset; // Positive overscroll for chaining
      }
      this.scrollOffset = maxOffset;
    } else {
      this.scrollOffset = newOffset;
    }
    this.onScrollCallback?.(this.scrollOffset);
  }

  scrollTo(offset: number): void {
    const maxOffset = Math.max(0, this.contentHeight - this.viewportHeight);
    this.scrollOffset = Math.max(0, Math.min(offset, maxOffset));
    this.onScrollCallback?.(this.scrollOffset);
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  getMaxScrollOffset(): number {
    return Math.max(0, this.contentHeight - this.viewportHeight);
  }

  getViewportHeight(): number {
    return this.viewportHeight;
  }

  destroy(): void {
    this.content.destroy?.();
  }
}