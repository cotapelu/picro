// StatusBar - thanh trạng thái hiển thị thông tin nhanh
// Port ý tưởng từ pi-mono footer.ts
// Viết lại bằng Ink TSX, không copy code
import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  model?: string;
  tokens?: string;
  cwd?: string;
  isProcessing?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ model, tokens, cwd, isProcessing }) => {
  const statusText = `${isProcessing ? "⏳ Processing..." : "● Ready"} | Model: ${model || "unknown"} | Tokens: ${tokens || "0/0"} | CWD: ${cwd || "."}`;
  return (
    <Box padding={1}>
      <Text key="status">{statusText}</Text>
    </Box>
  );
}
