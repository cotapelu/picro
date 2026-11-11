// CountdownTimer - đếm ngược và báo hết hạn
// Bắt chước nguyên tắc pi-mono components/countdown-timer.ts:
//   - Mỗi giây cập nhật nhãn hiển thị
//   - Hết hạn thì gọi onTimeout (thường để hủy hộp thoại)
// Port sang Ink TSX, khong copy code truc tiep.

import React, { useEffect, useRef, useState } from "react";
import { Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";

export interface CountdownTimerProps {
  /** Thời lượng đếm ngược (ms). */
  durationMs: number;
  /** Gọi mỗi giây với số giây còn lại (làm tròn lên). */
  onTick?: (secondsLeft: number) => void;
  /** Gọi khi hết thời gian. */
  onTimeout?: () => void;
  /** Tiền tố hiển thị. */
  label?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  durationMs,
  onTick,
  onTimeout,
  label = "còn",
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.ceil(durationMs / 1000));
  const doneRef = useRef(false);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - started;
      const left = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setSecondsLeft(left);
      onTick?.(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(timer);
        onTimeout?.();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  if (secondsLeft <= 0) return null;
  return <Text>{fg("muted", `${label} ${secondsLeft}s`)}</Text>;
};
