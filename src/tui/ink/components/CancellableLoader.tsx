// CancellableLoader - loader hủy được bằng Escape
// Bắt chước nguyên tắc pi-tui components/cancellable-loader.ts:
//   - Kế thừa Loader, thêm AbortController
//   - Escape gọi onAbort và abort signal
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Loader } from "./Loader.js";
import { matchesKey } from "../core/Keys.js";

export interface CancellableLoaderProps {
  message?: string;
  frames?: string[];
  intervalMs?: number;
  onAbort?: () => void;
}

/** Handle để cha bấm Escape / hủy loader. */
export interface CancellableLoaderHandle {
  cancel(): void;
  readonly aborted: boolean;
}

export const CancellableLoader = React.forwardRef<
  CancellableLoaderHandle,
  CancellableLoaderProps
>(({ message, frames, intervalMs, onAbort }, ref) => {
  const controller = useRef(new AbortController());

  // Hủy signal khi unmount để không để lại promise treo.
  useEffect(
    () => () => {
      controller.current.abort();
    },
    [],
  );

  const cancel = useCallback(() => {
    if (controller.current.signal.aborted) return;
    controller.current.abort();
    onAbort?.();
  }, [onAbort]);

  useImperativeHandle(ref, () => ({ cancel, get aborted() { return controller.current.signal.aborted; } }), [cancel]);

  return <Loader message={message} frames={frames} intervalMs={intervalMs} />;
});

CancellableLoader.displayName = "CancellableLoader";

/** Escape có được bấm không (dùng cho loader hủy được). */
export function isCancelKey(data: string): boolean {
  return matchesKey(data, "escape");
}
