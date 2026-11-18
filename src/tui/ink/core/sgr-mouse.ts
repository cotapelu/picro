// SGR Mouse - phân tích chuỗi chuột SGR (1006) và X10 (1000)
//
// Đây là phần thuần túy của tầng alt-screen của pi-mono: Ink 7 KHÔNG expose
// mouse event qua useInput, nên muốn chọn text/kéo scrollbar bằng chuột thì phải
// tự parse sequence từ stdin. Module này chỉ parse — không render, không IO —
// nên test được trọn vẹn và tái sửng cho bất kỳ renderer nào.
//
// Định dạng SGR: ESC [ < button ; x ; y (M|m)
//   - "M" = press/drag/wheel, "m" = release
//   - button bit 0-1: 0=left, 1=middle, 2=right, 3=none (move)
//   - bit 2 (4) = shift, bit 3 (8) = alt/meta, bit 4 (16) = ctrl
//   - bit 5 (32) = motion (drag/move), bit 6 (64) = wheel
//   - wheel: button 64=up, 65=down, 66=left, 67=right
//
// Định dạng X10 (1000, không phải 1006): ESC [ M button x y (các byte +32)
//
// Port từ nguyên tắc pi-mono, không copy code.

/** Nút chuột đã chuẩn hóa. */
export type MouseButton = "left" | "middle" | "right" | "none";

/** Loại sự kiện chuột đã chuẩn hóa. */
export type MouseEventType = "press" | "release" | "drag" | "move" | "wheel";

/** Hướng bánh xe chuột. */
export type WheelDirection = "up" | "down" | "left" | "right";

/** Sự kiện chuột đã phân tích, toạ độ 0-based. */
export interface MouseEvent {
  type: MouseEventType;
  button: MouseButton;
  x: number;
  y: number;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  /** Chỉ có khi type === "wheel". */
  wheel?: WheelDirection;
  /** Số nháy liên tiếp (1 = click đơn). */
  clickCount?: number;
}

/** Byte điều khiển bắt đầu một chuỗi escape. */
const ESC = 0x1b;

/** Chuỗi có phải là sequence chuột SGR không. */
export function isSgrMouseSequence(data: string): boolean {
  return /^\x1b\[<[\d;]+[Mm]$/.test(data);
}

/** Chuỗi có phải là sequence chuột X10 không. */
export function isX10MouseSequence(data: string): boolean {
  return data.length === 6 && data.charCodeAt(0) === ESC && data[1] === "[" && data[2] === "M";
}

/**
 * Phân tích chuỗi chuột. Trả về undefined nếu `data` không phải chuỗi chuột —
 * caller không cần try/catch, chỉ cần kiểm tra undefined.
 */
export function parseMouseEvent(data: string): MouseEvent | undefined {
  const sgr = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/.exec(data);
  if (sgr) {
    return fromSgrParts(
      Number.parseInt(sgr[1]!, 10),
      Number.parseInt(sgr[2]!, 10),
      Number.parseInt(sgr[3]!, 10),
      sgr[4] === "M",
    );
  }

  const x10 = /^\x1b\[M([\s\S])([\s\S])([\s\S])$/.exec(data);
  if (x10) {
    // X10 mã hóa mỗi toạ độ thành một byte có giá trị 32 + toạ độ.
    const button = x10[1]!.charCodeAt(0) - 32;
    const x = x10[2]!.charCodeAt(0) - 32;
    const y = x10[3]!.charCodeAt(0) - 32;
    if (button < 0 || x < 0 || y < 0) return undefined;
    // X10 chỉ báo press (không phân biệt release/motion).
    return fromSgrParts(button, x, y, true);
  }

  return undefined;
}

/** Dựng event từ các thành phần button/x/y. */
function fromSgrParts(button: number, x: number, y: number, press: boolean): MouseEvent {
  const isWheel = (button & 64) !== 0;
  const isMotion = (button & 32) !== 0;
  const shift = (button & 4) !== 0;
  const alt = (button & 8) !== 0;
  const ctrl = (button & 16) !== 0;
  const low = button & 3;

  const base: MouseEvent = {
    type: "press",
    button: "none",
    // SGR dùng toạ độ 1-based; chuẩn hóa về 0-based cho khớp mảng dòng/cột.
    x: Math.max(0, x - 1),
    y: Math.max(0, y - 1),
    shift,
    alt,
    ctrl,
  };

  if (isWheel) {
    const wheel: WheelDirection =
      low === 0 ? "up" : low === 1 ? "down" : low === 2 ? "left" : "right";
    return { ...base, type: "wheel", wheel };
  }

  base.button = low === 0 ? "left" : low === 1 ? "middle" : low === 2 ? "right" : "none";
  if (press) {
    base.type = isMotion ? (base.button === "none" ? "move" : "drag") : "press";
  } else {
    base.type = "release";
  }
  return base;
}

/** Sequence bật chế độ báo chuột (1000 click + 1002 drag + 1004 focus + 1006 SGR). */
export function enableMouseSequence(): string {
  return "\x1b[?1000h\x1b[?1002h\x1b[?1004h\x1b[?1006h";
}

/** Sequence tắt chế độ báo chuột (tắt theo thứ tự ngược lại). */
export function disableMouseSequence(): string {
  return "\x1b[?1006l\x1b[?1004l\x1b[?1002l\x1b[?1000l";
}

/**
 * Tăng số nháy liên tiếp. Nhấn cùng một vị trí trong cửa sổ
 * `intervalMs` thì tăng lên tối đa 3, sau đó quay về 1 (pi-mono).
 */
export function nextClickCount(
  previous: { timestamp: number; count: number; x: number; y: number } | undefined,
  now: number,
  x: number,
  y: number,
  intervalMs = 500,
): number {
  if (!previous) return 1;
  if (now - previous.timestamp > intervalMs) return 1;
  if (previous.x !== x || previous.y !== y) return 1;
  return (previous.count % 3) + 1;
}