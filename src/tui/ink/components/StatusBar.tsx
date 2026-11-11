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

interface StatusBarProps {
  model?: string;
  tokens?: string;
  contextPercent?: string;
  cwd?: string;
  sessionName?: string;
  isProcessing?: boolean;
  thinkingLevel?: string;
}

/** Cắt chuỗi đã tô màu theo số cột hiển thị. */
function truncateVisual(text: string, width: number): string {
  if (width <= 0) return "";
  // ANSI không chiếm cột, nên đo bằng cách lược bỏ chuỗi escape.
  const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
  if (plain.length <= width) return text;
  const keep = width > 1 ? width - 1 : 0;
  let taken = 0;
  let out = "";
  for (let i = 0; i < text.length && taken < keep; i++) {
    out += text[i];
    if (text[i] === "\x1b") {
      // Nuốt phần còn lại của escape sequence.
      while (i < text.length && text[i] !== "m") {
        i++;
        out += text[i] ?? "";
      }
      continue;
    }
    taken++;
  }
  return out + fg("dim", "…");
}

export const StatusBar: React.FC<StatusBarProps> = ({
  model,
  tokens,
  contextPercent,
  cwd,
  sessionName,
  isProcessing,
  thinkingLevel,
}) => {
  const { columns } = useWindowSize();

  // Dòng 1: pwd (+ nhánh/phiên nếu có)
  const home = process.env.HOME || process.env.USERPROFILE;
  let pwd = cwd ? formatCwdForFooter(cwd, home) : ".";
  if (sessionName) pwd = `${pwd} • ${sessionName}`;

  // Dòng 2: bên trái token + context, bên phải model + thinking
  const statusText = isProcessing ? fg("warning", "⏳ Working") : fg("success", "● Ready");
  const tokenTotal = tokens ?? "0";
  const contextInfo = contextPercent ? `${contextPercent}` : "";
  const leftParts = [statusText, `↑↓ ${formatTokens(Number(tokenTotal) || 0)}`];
  if (contextInfo) leftParts.push(contextInfo);

  const modelName = model ?? "no-model";
  const rightParts = [modelName];
  if (thinkingLevel && thinkingLevel !== "off") rightParts.push(`think ${thinkingLevel}`);

  const left = leftParts.join("  ");
  const right = truncateVisual(rightParts.join(" · "), Math.max(0, columns - left.length - 3));
  const gap = Math.max(2, (columns || 80) - left.replace(/\x1b\[[0-9;]*m/g, "").length - right.replace(/\x1b\[[0-9;]*m/g, "").length);

  return (
    <Box flexDirection="column" flexShrink={0}>
      <Text>{truncateVisual(fg("dim", pwd), columns || 80)}</Text>
      <Text>
        {`${left}${" ".repeat(gap)}${right}`}
      </Text>
    </Box>
  );
};
