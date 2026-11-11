// ThemeSelector - port ý tưởng từ pi-mono theme-selector.ts
// Chọn theme: dark, light, matrix
// Viết lại bằng Ink TSX, không copy code
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { AgentSessionRuntimeInterface } from "../../../runtime/index.js";

interface ThemeSelectorProps {
  runtime: AgentSessionRuntimeInterface;
  onSelect: (theme: string) => void;
  onCancel: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ runtime, onSelect, onCancel }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const themes = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "matrix", label: "Matrix" },
  ];

  useInput((inputString, key) => {
    if (key.ctrl && inputString === "\u0003") {
      onCancel();
      return;
    }
    if (key.return) {
      const theme = themes[currentIndex];
      if (theme) {
        onSelect(theme.id);
      }
      return;
    }
    if (key.upArrow) {
      setCurrentIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setCurrentIndex((i) => Math.min(themes.length - 1, i + 1));
      return;
    }
    if (inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      const found = themes.find((t) => t.label.toLowerCase().startsWith(inputString.toLowerCase()));
      if (found) {
        setCurrentIndex(themes.indexOf(found));
      }
    }
  });

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold>Theme Selector</Text>
      <Box flexDirection="column">
        {themes.map((t, i) => (
          <Box key={t.id} flexDirection="row" justifyContent="space-between">
            <Text color={i === currentIndex ? "cyan" : "white"}>{t.label}</Text>
            {i === currentIndex && <Text dimColor>(current)</Text>}
          </Box>
        ))}
      </Box>
      <Text dimColor>↑/↓: select, Enter: confirm, Ctrl+C: cancel</Text>
    </Box>
  );
}
