// StatusBar - thanh trạng thái dưới cùng (mô phỏng pi-mono FooterComponent):
//   - Dòng 1: thư mục làm việc (~) - nhánh git - tên phiên
//   - Dòng 2: thống kê token/cache/cost bên trái, model + thinking + routed bên phải
// Viết lại bằng TSX riêng, không copy code.

import React from "react";
import { Box, Text, useWindowSize } from "ink";
import { formatTokens } from "./FormatTokens.js";
import { fg } from "../theme/index.js";
import { formatCwdForFooter } from "./FormatCwd.js";
import { composeStatusBarLine, truncateVisual } from "./status-bar-layout.js";

export interface StatusBarUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
  cacheHitPercent?: number;
}

interface StatusBarProps {
  model?: string;
  /** "<dùng>/<cửa sổ>" hoặc một số token ngữ cảnh. */
  tokens?: string;
  contextPercent?: string;
  cwd?: string;
  sessionName?: string;
  gitBranch?: string;
  isProcessing?: boolean;
  thinkingLevel?: string;
  /** Model thực sự được route tới (virtual model) — "provider/id". */
  routedModel?: string;
  /** Thống kê phiên cho footer đầy đủ. */
  usage?: StatusBarUsage;
  /** Tool output đang mở rộng (Ctrl+T). */
  toolsExpanded?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  model,
  tokens,
  contextPercent,
  cwd,
  sessionName,
  gitBranch,
  isProcessing,
  thinkingLevel,
  routedModel,
  usage,
  toolsExpanded = false,
}) => {
  const { columns } = useWindowSize();
  const width = columns || 80;

  // --- Dòng 1: pwd, nhánh git, tên phiên -------------------------------------
  const home = process.env.HOME || process.env.USERPROFILE;
  let pwd = cwd ? formatCwdForFooter(cwd, home) : ".";
  if (gitBranch) pwd = `${pwd} (${gitBranch})`;
  if (sessionName) pwd = `${pwd} • ${sessionName}`;

  // --- Dòng 2: thống kê bên trái, model bên phải -----------------------------
  const statusText = isProcessing ? fg("warning", "⏳ Working") : fg("success", "● Ready");
  const leftParts: string[] = [statusText];
  if (usage) {
    if (usage.input) leftParts.push(`↑${formatTokens(usage.input)}`);
    if (usage.output) leftParts.push(`↓${formatTokens(usage.output)}`);
    if (usage.cacheRead) leftParts.push(`R${formatTokens(usage.cacheRead)}`);
    if (usage.cacheWrite) leftParts.push(`W${formatTokens(usage.cacheWrite)}`);
    if ((usage.cacheRead > 0 || usage.cacheWrite > 0) && usage.cacheHitPercent !== undefined) {
      leftParts.push(`CH${usage.cacheHitPercent.toFixed(1)}%`);
    }
    if (usage.cost > 0) leftParts.push(`$${usage.cost.toFixed(3)}`);
  }

  // `tokens` có thể là "12345/8000" hoặc một số. Bản cũ parse cả chuỗi nên
  // hiện "↑↓ 0" dù ngữ cảnh đang có hàng chục nghìn token.
  const [usedRaw, windowRaw] = String(tokens ?? "0").split("/");
  const used = Number.parseInt(usedRaw ?? "0", 10);
  if (Number.isFinite(used) && used > 0) leftParts.push(formatTokens(used));
  if (contextPercent && contextPercent !== "0%") leftParts.push(contextPercent);

  const rightParts: string[] = [];
  if (model) rightParts.push(model);
  if (thinkingLevel && thinkingLevel !== "off") rightParts.push(`think ${thinkingLevel}`);
  if (routedModel && routedModel !== model) rightParts.push(`→ ${routedModel}`);
  if (toolsExpanded) rightParts.push("tools:expanded");

  // Cột phải tính theo CHIỀU RỘNG KHẢ DỨNG của cột trái (visibleWidth), không
  // dùng độ dài chuỗi có escape — bản cũ cắt sớm ~9 cột mỗi lần render.
  const { left, right, gap } = composeStatusBarLine({
    left: leftParts.join("  "),
    rightParts,
    columns: width,
  });

  const pwdLine = truncateVisual(fg("dim", pwd), width);

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text>{pwdLine}</Text>
      <Text>{`${left}${" ".repeat(gap)}${right}`}</Text>
    </Box>
  );
};

export default StatusBar;
