// SettingsSelector - port ý tưởng từ pi-mono settings-selector.ts
// Cài đặt: theme, disabled tools, provider, model, thinking level
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

interface SettingsSelectorProps {
  runtime: AgentSessionRuntimeInterface;
  onSelect: (setting: string, value: string) => void;
  onCancel: () => void;
}

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({ runtime, onSelect, onCancel }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const settings = [
    { key: 'theme', label: 'Theme', value: 'dark' },
    { key: 'disabledTools', label: 'Disabled tools', value: 'none' },
    { key: 'defaultProvider', label: 'Default provider', value: 'unknown' },
    { key: 'defaultModel', label: 'Default model', value: 'none' },
    { key: 'defaultThinkingLevel', label: 'Default thinking', value: 'off' },
  ];

  useInput((inputString, key) => {
    if (key.ctrl && inputString === '\u0003') {
      onCancel();
      return;
    }
    if (key.return) {
      const setting = settings[selectedIndex];
      if (setting) {
        onSelect(setting.key, setting.value);
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(settings.length - 1, i + 1));
      return;
    }
    if (inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      // Tìm setting theo ký tự đầu tiên
      const found = settings.find((s) => s.label.toLowerCase().startsWith(inputString.toLowerCase()));
      if (found) {
        const idx = settings.indexOf(found);
        setSelectedIndex(idx);
      }
    }
  });

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold>Settings Selector</Text>
      <Box flexDirection="column">
        {settings.map((s, i) => (
          <Box key={s.key} flexDirection="row" justifyContent="space-between">
            <Text color={i === selectedIndex ? 'cyan' : 'white'}>{s.label}</Text>
            <Text dimColor>{s.value}</Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>↑/↓: select, Enter: confirm, Ctrl+C: cancel</Text>
    </Box>
  );
};
