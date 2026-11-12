// StatusBar - thanh trạng thái dưới cùng
// Bắt chước nguyên tắc pi-mono FooterComponent:
//   - Bên trái: thư mục làm việc (mờ) + tên phiên
//   - Bên phải: model, token, phần trăm context, trạng thái xử lý
//   - Dòng quá dài bị cắt theo đúng chiều rộng terminal
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box, Text, useWindowSize } from "ink";
import { formatTokens } from "./FormatTokens.js";
import { theme, fg, bg } from "../theme/index.js";
import { formatCwdForFooter } from "./FormatCwd.js";
import { composeStatusBarLine, truncateVisual, visibleTextWidth } from "./status-bar-layout.js";

interface StatusBarProps {
  model?: string;
  tokens?: string;
  contextPercent?: string;
  cwd?: string;
  sessionName?: string;
  isProcessing?: boolean;
  thinkingLevel?: string;
  /** Tool output đang mở rộng (Ctrl+T). */
  toolsExpanded?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  model,
  tokens,
  contextPercent,
  cwd,
  sessionName,
  isProcessing,
  thinkingLevel,
  toolsExpanded = false,
}) => {
  const { columns } = useWindowSize();

  // Dòng 1: pwd (+ nhánh/phiên nếu có)
  const home = process.env.HOME || process.env.USERPROFILE;
  let pwd = cwd ? formatCwdForFooter(cwd, home) : ".";
  if (sessionName) pwd = `${pwd} • ${sessionName}`;

  // Dòng 2: bên trái token + context, bên phải model + thinking
  const statusText = isProcessing ? fg("warning", "⏳ Working") : fg("success", "● Ready");
  // `tokens` có thể là "12345" (số token ngữ cảnh) — bản cũ luôn gọi
  // formatTokens(Number("0/0")) = formatTokens(NaN) = 0 nên footer hiển thị
  // "↑↓ 0" dù ngữ cảnh đang có 40k token. Chấp nhận cả dạng "a/b" để tương thích.
  const contextTokens = Number.parseInt(String(tokens ?? "0").split("/")[0] ?? "0", 10);
  const contextInfo = contextPercent && contextPercent !== "0%" ? contextPercent : "";
  const leftParts = [statusText, `↑↓ ${formatTokens(Number.isFinite(contextTokens) ? contextTokens : 0)}`];
  if (contextInfo) leftParts.push(contextInfo);

  const modelName = model ?? "no-model";
  const rightParts = [modelName];
  if (toolsExpanded) rightParts.push("tools:expanded");
  if (thinkingLevel && thinkingLevel !== "off") rightParts.push(`think ${thinkingLevel}`);

  // The right column's budget comes from the VISIBLE width of the left side:
  // using left.length (escape bytes included) truncated the model/thinking info
  // about nine columns too early on every render.
  const { left: leftText, right, gap } = composeStatusBarLine({
    left: leftParts.join("  "),
    rightParts,
    columns: columns || 80,
  });
  const pwdLine = truncateVisual(fg("dim", pwd), columns || 80);

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text>{pwdLine}</Text>
      <Text>
        {`${leftText}${" ".repeat(gap)}${right}`}
      </Text>
    </Box>
  );
};
