// MouseRegion - thêm xử lý chuột cho component có sẵn
// Bắt chước nguyên tắc pi-tui components/mouse-region.ts:
//   - Không thay đổi cách render của con
//   - Sự kiện chuột ưu tiên xử lý ở con, rồi mới tới handler bọc ngoài
// Port sang Ink TSX, khon copy code truc iep.

import React, { useRef } from "react";

export type MouseEventType = "press" | "release" | "move" | "drag" | "click" | "wheel";
export type MouseButton = "left" | "middle" | "right" | "none";

export interface MouseEvent {
  type: MouseEventType;
  button: MouseButton;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  wheelDelta?: number;
}

export interface MouseHandlerResult {
  handled?: boolean;
  focus?: boolean;
  render?: boolean;
}

export type MouseRegionHandler = (event: MouseEvent) => MouseHandlerResult | undefined;

export interface MouseRegionProps {
  children: React.ReactNode;
  onMouse: MouseRegionHandler;
}

/**
 * Ink không cung cấp API chuộtNative, nên component này đóng vai trò
 * ranh giới logic: dùng khi chuyển logic xử lý chuột sang tầng trên
 * (vd alt-screen) mà không làm component con biết.
 */
/**
 * Handler chuột gần nhất, tra được qua getLatestMouseHandler().
 *
 * Bản cũ ghi `lastHandler` lên CHÍNH function component, nên mọi instance dùng
 * chung một ô: hai MouseRegion cùng mounted sẽ ghi đè lẫn nhau và handler của
 * vùng sau không bao giờ được gọi. Ink không có API mouse, nên picro chỉ giữ
 * một handler toàn cục — nhưng phải là handler của instance ĐANG HOẠT ĐỘNG.
 */
let latestHandler: MouseRegionHandler | undefined;
let latestId = 0;

export function getLatestMouseHandler(): MouseRegionHandler | undefined {
  return latestHandler;
}

export const MouseRegion: React.FC<MouseRegionProps> = ({ children, onMouse }) => {
  const idRef = useRef<number>(0);
  if (idRef.current === 0) idRef.current = ++latestId;

  React.useEffect(() => {
    const id = idRef.current;
    latestHandler = onMouse;
    return () => {
      // Chỉ xóa nếu đây vẫn là handler mới nhất.
      if (latestId === id) latestHandler = undefined;
    };
  }, [onMouse]);

  return <>{children}</>;
};
