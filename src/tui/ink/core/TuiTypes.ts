// TuiTypes - định nghĩa kiểu cốt lõi cho TUI
// Bắt chước nguyên tắc pi-tui tui.ts:
//   - Component interface: render(width), invalidate(), handleInput(), handleMouse()
//   - Focusable interface: focused, capturesViewportInput
// Port sang TSX riêng, không copy code trực tiếp.

import { ProgramStatus } from "./ProgramStatus.js";
import { Terminal } from "./Terminal.js";

/** Sự kiện chuột SGR (1006/1015). */
export interface TuiMouseEvent {
  type: "press" | "release" | "drag" | "wheel" | "move";
  button: "left" | "right" | "middle" | "wheel-up" | "wheel-down";
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  modifiers: {
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
    super: boolean;
  };
}

/** Kết quả xử lý chuột. */
export interface TuiMouseEventResult {
  handled: boolean;
  focus?: boolean;
  consume?: boolean;
}

/** Kiểu con trỏ chuột. */
export type CursorShape = "block" | "underline" | "bar";

/** Vùng chọn (selection) trong màn hình. */
export interface SelectionRange {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/** Interface cơ bản cho mọi component. */
export interface Component {
  /** Render component thành mảng string (mỗi phần tử = một dòng). */
  render(width: number): string[];

  /** Yêu cầu render lại (component state đã thay đổi). */
  invalidate(): void;

  /** Xử lý đầu vào bàn phím. Trả về undefined nếu không xử lý. */
  handleInput?(data: string): void;

  /** Xử lý sự kiện chuột. Trả về undefined nếu không xử lý. */
  handleMouse?(event: TuiMouseEvent): TuiMouseEventResult | undefined;

  /** Dọn dẹp tài nguyên khi component bị hủy. */
  destroy?(): void;
}

/** Component có thể nhận focus. */
export interface Focusable {
  /** Component hiện đang được focus. */
  focused: boolean;

  /** Component này có "chiếm" input viewport không (ví dụ autocomplete dropdown). */
  capturesViewportInput: boolean;
}

/** Props cho flexbox layout. */
export interface FlexProps {
  /** Kích thước cơ sở (pixel hoặc "auto"). */
  basis?: number | "auto";
  /** Hệ số co giãn (grow). */
  grow?: number;
  /** Hệ số thu nhỏ (shrink). */
  shrink?: number;
  /** Kích thước tối thiểu (pixel). */
  minSize?: number;
  /** Kích thước tối đa (pixel). */
  maxSize?: number;
}

/** Kết quả layout tính toán được. */
export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scrollbar configuration. */
export type ScrollViewScrollbar = "auto" | "always" | "hidden";

/** Scrollbar styles. */
export interface ScrollbarStyles {
  track?: (text: string) => string;
  thumb?: (text: string) => string;
}

/** Viewport follow mode. */
export type FollowMode = "end" | "start" | "none";

/** Overscroll behavior. */
export type OverscrollMode = "chain" | "hidden" | "clamp";

/** Scroll view options. */
export interface ScrollViewOptions {
  follow?: FollowMode;
  primary?: boolean;
  overscroll?: OverscrollMode;
  scrollbar?: ScrollViewScrollbar;
  scrollbarTrackStyle?: (text: string) => string;
  scrollbarThumbStyle?: (text: string) => string;
}

/** Render state cho main screen. */
export interface TuiMainScreenRenderState {
  cursor: { x: number; y: number; shape: CursorShape; visible: boolean };
  selection: SelectionRange | null;
  scrollPositions: Map<Component, number>;
}

/** Interface cho TUI. */
export interface TUI {
  /** Thêm component con. */
  addChild(child: Component): void;

  /** Xóa tất cả component con. */
  clear(): void;

  /** Bắt đầu vòng lặp render. */
  start(): void;

  /** Dừng vòng lặp render. */
  stop(options?: { preserveScreen?: boolean }): void;

  /** Render ngay lập tức (bỏ qua debounce). */
  renderNow(): void;

  /** Yêu cầu render ở frame tiếp theo. */
  requestRender(): void;

  /** Component đang focus. */
  getFocusedComponent(): Component | null;

  /** Đặt focus. */
  setFocus(component: Component | null): void;

  /** Chiều rộng terminal. */
  readonly columns: number;

  /** Chiều cao terminal. */
  readonly rows: number;

  /** Terminal instance. */
  readonly terminal: Terminal;

  /** Callback khi có event debug. */
  onDebug?: (event: unknown) => void;

  /** Đăng ký cleanup. */
  onExit?: (callback: () => void) => void;
}

/** Hằng số cho cursor marker (zero-width). */
export const CURSOR_MARKER = "\u200B";

/** Render fake cursor (inverted space hoặc character). */
export function renderFakeCursor(char: string): string {
  return `\x1b[7m${char}\x1b[27m`;
}