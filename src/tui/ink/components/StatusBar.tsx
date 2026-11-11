// StatusBar - thanh trạng thái dưới cùng
// Bắt chước nguyên tắc pi-mono FooterComponent:
//   - Dòng trên: pwd (dim), session name
//   - Dòng dưới: model, tokens, context %, trạng thái xử lý
// Màu sắc phân cấp: dim cho thông tin phụ, màu nhạt cho thông tin chính

import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  model?: string;
  tokens?: string;
  cwd?: string;
  isProcessing?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ model, tokens, cwd, isProcessing }) => {
  const statusText = isProcessing ? "⏳ Processing..." : "● Ready";
  const pwd = cwd || ".";
  const modelInfo = model || "unknown";
  const tokenInfo = tokens || "0/0";

  return (
    <Box padding={1} flexDirection="column">
      <Text dimColor>{pwd}</Text>
      <Text>
        {statusText} | Model: {modelInfo} | Tokens: {tokenInfo} | CWD: {pwd}
      </Text>
    </Box>
  );
}
