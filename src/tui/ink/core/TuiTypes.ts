// TuiTypes - kiểu dữ liệu dùng chung của tầng trình bày
// Bắt chước nguyên tắc pi-tui tui.ts:
//   - Component: render(width) -> lines, handleInput, handleMouse, invalidate
//   - TuiMouseEvent: sự kiện chuột chuẩn hóa theo ô
//   - OverlayHandle/OverlayOptions: lớp phủ định vị theo anchor/tỷ lệ
//   - TuiInputListener: chặng lọc đầu vào trước khi tới component focus
// Lưu ý: Ink đã đảm nhiệm raw mode, differential rendering và alt-screen,
// nên phần TuiBase/TuiMainScreen/TuiAltScreen được thay bằng render() của Ink.
// Port sang TSX riêng, khong copy code truc iep.

export type TuiMouseEventType = "press" | "release" | "move" | "drag" | "click" | "wheel";
export type TuiMouseButton = "left" | "middle" | "right" | "none";

/** Sự kiện chuột chuẩn hóa, toạ độ zero-based. */
export interface TuiMouseEvent {
  type: TuiMouseEventType;
  button: TuiMouseButton;
  /** Toạ độ cục bộ của component nhận. */
  x: number;
  y: number;
  /** Toạ độ tuyệt đối trên terminal. */
  screenX: number;
  screenY: number;
  /** Kích thước component. */
  width: number;
  height: number;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  /** Bội số dòng logic (âm = cuộn lên). */
  wheelDelta?: number;
  /** Số lần bấm liên tiếp. */
  clickCount?: number;
}

export interface TuiMouseEventResult {
  /** Chặn lan truyền và bỏ hành vi dự phòng của renderer. */
  handled?: boolean;
  /** Định tuyến drag/release tiếp theo tới component này. */
  capture?: boolean;
  /** Chuyển focus bàn phím sang component này. */
  focus?: boolean;
  /** Yêu cầu (hoặc chặn) render lại; mặc định theo loại sự kiện. */
  render?: boolean;
}

/** Component giao diện cơ bản. */
export interface Component {
  /** Vẽ component thành các dòng cho chiều rộng cho trước. */
  render(width: number): string[];
  /** Xử lý bàn phím khi component có focus. */
  handleInput?(data: string): void;
  /** Xử lý chuột đã chuẩn hóa. */
  handleMouse?(event: TuiMouseEvent): TuiMouseEventResult | undefined;
  /** Nhận cả sự kiện nhả phím (Kitty). */
  wantsKeyRelease?: boolean;
  /** Khi focus, phím cuộn vùng xem đi vào component này. */
  capturesViewportInput?: boolean;
  /** Hủy cache kết xuất (đổi chủ đề, thu phóng). */
  invalidate(): void;
}

/** Component nhận được focus và hiện con trỏ phần cứng. */
export interface Focusable {
  focused: boolean;
}

export type OverlayAnchor =
  | "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  | "top-center" | "bottom-center" | "left-center" | "right-center";

export interface OverlayMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** Giá trị tuyệt đối (số) hoặc tỷ lệ phần trăm ("50%"). */
export type SizeValue = number | `${number}%`;

export interface OverlayOptions {
  /** Chiều rộng cột, hoặc tỷ lệ chiều rộng terminal. */
  width?: SizeValue;
  /** Chiều rộng tối thiểu. */
  minWidth?: number;
  /** Chiều cao tối đa, hoặc tỷ lệ chiều cao terminal. */
  maxHeight?: SizeValue;
  /** Điểm neo mặc định "center". */
  anchor?: OverlayAnchor;
  /** Dịch ngang từ neo. */
  offsetX?: number;
  /** Dịch dọc từ neo. */
  offsetY?: number;
  /** Vị trí dòng tuyệt đối hoặc tỷ lệ. */
  row?: SizeValue;
  /** Vị trí cột tuyệt đối hoặc tỷ lệ. */
  col?: SizeValue;
  /** Lề từ các cạnh terminal. */
  margin?: OverlayMargin | number;
  /** Kiểm soát hiển thị theo kích thước terminal. */
  visible?: (termWidth: number, termHeight: number) => boolean;
  /** Không chiếm focus khi hiện. */
  nonCapturing?: boolean;
}

export interface OverlayBounds {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface OverlayHandle {
  /** Bỏ hẳn lớp phủ. */
  hide(): void;
  /** Ẩn/hiện tạm thời. */
  setHidden(hidden: boolean): void;
  isHidden(): boolean;
  /** Focus lớp phủ này và đưa lên trên. */
  focus(): void;
  /** Trả focus về mục tiêu trước đó. */
  unfocus(options?: { target: Component | null }): void;
  isFocused(): boolean;
  /** Khung hình đã vẽ gần nhất. */
  getBounds(): OverlayBounds | undefined;
}

export type TuiInputListenerResult = { consume?: boolean; data?: string } | undefined;
export type TuiInputListener = (data: string) => TuiInputListenerResult;

export type TuiMode = "regular" | "fullscreen";
