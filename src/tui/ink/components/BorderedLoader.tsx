// BorderedLoader - loader bọc viền cho giao diện extension
// Bắt chước nguyên tắc pi-mono components/bordered-loader.ts:
//   - Viền động hai đầu, loader ở giữa, gợi ý hủy nếu cancellable
//   - cancellable: có AbortSignal, Escape gọi onAbort
//   - Không cancellable: vẫn giữ AbortController riêng cho tương thích API
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useRef, useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { CancellableLoader } from "./CancellableLoader.js";
import { matchesKey } from "../core/Keys.js";

export interface BorderedLoaderProps {
  message: string;
  /** Cho phép hủy bằng Escape (mặc định bật). */
  cancellable?: boolean;
  onAbort?: () => void;
  /** Khung hình spinner; mảng rỗng = ẩn. */
  frames?: string[];
  width?: number;
}

export const BorderedLoader: React.FC<BorderedLoaderProps> = ({
  message,
  cancellable = true,
  onAbort,
  frames,
  width = 80,
}) => {
  const t = getTheme();
  const controllerRef = useRef(new AbortController());

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder color={(text) => t.fg("border", text)} />
      <CancellableLoader message={message} frames={frames} onAbort={cancellable ? onAbort : undefined} />
      {cancellable ? (
        <>
          <Text> </Text>
          <Text>{t.fg("dim", "Esc để hủy")}</Text>
        </>
      ) : null}
      <Text> </Text>
      <DynamicBorder color={(text) => t.fg("border", text)} />
    </Box>
  );
};

// isCancelKey giờ nằm ở CancellableLoader (gần controller hủy), export lại để
// giữ nguyên API công khai cũ của BorderedLoader.
export { isCancelKey } from "./CancellableLoader.js";

/** Tiện ích cho cha: tạo controller và hủy khi cần. */
export function createLoaderAbort(): { signal: AbortSignal; abort: () => void } {
  const controller = new AbortController();
  return { signal: controller.signal, abort: () => controller.abort() };
}
