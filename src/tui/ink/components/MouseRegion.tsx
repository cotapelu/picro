// MouseRegion - thêm xử lý chuột cho component có sẵn
// Bắt chước nguyên tắc pi-tui components/mouse-region.ts:
//   - Không thay đổi cách render của con
//   - Sự kiện chuột ưu tiên xử lý ở con, rồi mới tới handler bọc ngoài
// Port sang Ink TSX, khon copy code truc iep.

import React from "react";

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
export const MouseRegion: React.FC<MouseRegionProps> = ({ children, onMouse }) => {
  // Ghi lại handler để tầng renderer có thể gọi khi mice sự kiện đến.
  React.useEffect(() => {
    (MouseRegion as unknown as { lastHandler?: MouseRegionHandler }).lastHandler = onMouse;
    return () => {
      if ((MouseRegion as unknown as { lastHandler?: MouseRegionHandler }).lastHandler === onMouse) {
        delete (MouseRegion as unknown as { lastHandler?: MouseRegionHandler }).lastHandler;
      }
    };
  }, [onMouse]);

  return <>{children}</>;
};
