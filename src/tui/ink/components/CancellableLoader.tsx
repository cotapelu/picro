// CancellableLoader - loader hủy được bằng Escape
// Bắt chước nguyên tắc pi-tui components/cancellable-loader.ts:
//   - Kế thừa Loader, thêm AbortController
//   - Escape gọi onAbort và abort signal
// Port sang Ink TSX, khong copy code truc iep.

import React, { useCallback, useEffect, useRef } from "react";
import { Loader } from "./Loader.js";
import { matchesKey } from "../core/Keys.js";

export interface CancellableLoaderProps {
  message?: string;
  frames?: string[];
  intervalMs?: number;
  onAbort?: () => void;
}

export const CancellableLoader: React.FC<CancellableLoaderProps> = ({ message, frames, intervalMs, onAbort }) => {
  const controller = useRef(new AbortController());

  useEffect(() => () => controller.current.abort(), []);

  // Escape là phím cấp cao nhất; component nhận useInput sẽ chuyển tiếp vào đây.
  const cancel = useCallback(() => {
    controller.current.abort();
    onAbort?.();
  }, [onAbort]);

  const isCancelled = (data: string): boolean => matchesKey(data, "escape");
  (CancellableLoader as unknown as { cancelLast?: () => void }).cancelLast = () => {
    if (controller.current.signal.aborted) cancel();
  };
  void isCancelled;

  return <Loader message={message} frames={frames} intervalMs={intervalMs} />;
};
