// AltScreenFlash - thông báo tạm ở lớp trên cùng
// Bắt chước nguyên tắc pi-tui components/alt-screen-flash.ts:
//   - Thông điệp hiển thị video ngược, tự gỡ sau thời lượng cố định
//   - flash() thêm mục, dispose() dọn sạch timer
// Port sang Ink TSX, khon copy code truc iep.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "../theme/index.js";
import { visibleWidth } from "../core/TerminalText.js";
import { requestRenderBus } from "../core/RenderBus.js";

const DEFAULT_DURATION_MS = 1000;

interface FlashEntry {
  id: number;
  message: string;
}

export interface AltScreenFlashProps {
  /** Chiều rộng khung nhìn. */
  width?: number;
}

/** Hiển thị thông báo tạm; dùng cùng requestRenderBus để cập nhật. */
export const AltScreenFlash: React.FC<AltScreenFlashProps> = ({ width = 80 }) => {
  const [entries, setEntries] = useState<FlashEntry[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());

  const flash = useCallback((...args: unknown[]) => {
    const message = String(args[0] ?? "");
    const durationMs = typeof args[1] === "number" ? (args[1] as number) : DEFAULT_DURATION_MS;
    const id = nextId.current++;
    setEntries((prev) => [...prev, { id, message }]);
    const timer = setTimeout(() => {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      timers.current.delete(timer);
      requestRenderBus.publish();
    }, Math.max(0, durationMs));
    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const token = requestRenderBus.subscribe(flash);
    const currentTimers = timers.current;
    return () => {
      requestRenderBus.unsubscribe(token);
      for (const timer of currentTimers) clearTimeout(timer);
      currentTimers.clear();
    };
  }, [flash]);

  return (
    <Box flexDirection="column" position="absolute" flexShrink={0}>
      {entries.map((entry) => {
        const message = entry.message;
        const truncated = visibleWidth(message) > width - 2 ? `${message.slice(0, Math.max(0, width - 3))}…` : message;
        return <Text key={entry.id}>{theme.inverse(` ${truncated} `)}</Text>;
      })}
    </Box>
  );
};
