// StatusIndicator - chỉ báo trạng thái có spinner quay
// Bắt chước nguyên tắc pi-mono components/status-indicator.ts:
//   - WorkingStatusIndicator: đang chạy
//   - RetryStatusIndicator: thử lại kèm đếm ngược, Esc để hủy
//   - CompactionStatusIndicator: đang nén ngữ cảnh
//   - BranchSummaryStatusIndicator: đang tóm tắt nhánh
//   - renderInBorder: rút gọn để hiện trong viền editor
// Port sang Ink TSX, khon copy code truc iep.

import React, { useEffect, useState } from "react";
import { Text } from "ink";
import { getTheme } from "../theme/theme.js";
import { truncateToWidth } from "../../../tui/ink/core/index.js";

export type StatusIndicatorKind = "working" | "retry" | "compaction" | "branchSummary";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;

export interface StatusIndicatorProps {
  kind: StatusIndicatorKind;
  message: string;
  /** Thời lượng đếm ngược (ms) cho retry. */
  countdownMs?: number;
  /** Tính năng hiện trong viền editor thay vì dòng riêng. */
  embedded?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  kind,
  message,
  countdownMs,
  embedded = false,
}) => {
  const t = getTheme();
  const [frame, setFrame] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => (countdownMs ? Math.ceil(countdownMs / 1000) : 0));

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), FRAME_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!countdownMs) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdownMs]);

  const spinner = SPINNER_FRAMES[frame] ?? "";
  const label =
    kind === "retry" && secondsLeft > 0 ? `Thử lại sau ${secondsLeft}s...` : message;
  const line = `${t.fg("accent", `${spinner} `)}${t.fg("muted", label)}`;

  if (embedded) {
    // Dùng trong viền editor: cắt theo chiều rộng khả dụng.
    return <Text>{truncateToWidth(line, 40, "")}</Text>;
  }
  return <Text>{line}</Text>;
};

export const WorkingStatusIndicator: React.FC<{ message?: string }> = ({
  message = "Đang làm việc",
}) => <StatusIndicator kind="working" message={message} />;

export const RetryStatusIndicator: React.FC<{
  attempt: number;
  maxAttempts: number;
  delayMs: number;
}> = ({ attempt, maxAttempts, delayMs }) => (
  <StatusIndicator
    kind="retry"
    message={`Thử lại (${attempt}/${maxAttempts})`}
    countdownMs={delayMs}
  />
);

export const CompactionStatusIndicator: React.FC<{ reason?: string }> = ({ reason }) => (
  <StatusIndicator
    kind="compaction"
    message={reason === "manual" ? "Đang nén ngữ cảnh... (Esc để hủy)" : "Tự động nén... (Esc để hủy)"}
  />
);

export const BranchSummaryStatusIndicator: React.FC = () => (
  <StatusIndicator kind="branchSummary" message="Đang tóm tắt nhánh... (Esc để hủy)" />
);

/** Chỉ báo rỗng: hai dòng khoảng trắng. */
export const IdleStatus: React.FC = () => (
  <Text>
    {"\n\n"}
  </Text>
);
