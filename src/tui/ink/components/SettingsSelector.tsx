// SettingsSelector - port ý tưởng từ pi-mono settings-selector.ts
// Cài đặt: theme, disabled tools, provider, model, thinking level
// Viết lại bằng Ink TSX, không copy code
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { AgentSessionRuntimeInterface } from "../../../runtime/index.js";

interface SettingsSelectorProps {
  runtime: AgentSessionRuntimeInterface;
  onSelect: (setting: string, value: string) => void;
  onCancel: () => void;
}

interface SettingsState {
  theme: string;
  disabledTools: string;
  defaultProvider: string;
  defaultModel: string;
  defaultThinkingLevel: string;
}

interface SettingsItem {
  key: string;
  label: string;
  value: string;
}

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({ runtime, onSelect, onCancel }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Lấy giá trị thực từ runtime
  const [settings, setSettings] = useState<SettingsState>({
    theme: "default",
    disabledTools: "none",
    defaultProvider: "unknown",
    defaultModel: "none",
    defaultThinkingLevel: "off",
  });

  useEffect(() => {
    const settingsManager = runtime.settings as any;
    setSettings({
      theme: settingsManager.getTheme?.() || "default",
      disabledTools: settingsManager.getDisabledTools?.() || [],
      defaultProvider: settingsManager.getDefaultProvider?.() || "unknown",
      defaultModel: settingsManager.getDefaultModel?.() || "none",
      defaultThinkingLevel: settingsManager.getDefaultThinkingLevel?.() || "off",
    });
  }, [runtime]);

  // Tạo mảng items để hiển thị
  const settingsItems: SettingsItem[] = [
    { key: "theme", label: "Theme", value: settings.theme },
    { key: "disabledTools", label: "Disabled tools", value: settings.disabledTools },
    { key: "defaultProvider", label: "Default provider", value: settings.defaultProvider },
    { key: "defaultModel", label: "Default model", value: settings.defaultModel },
    { key: "defaultThinkingLevel", label: "Default thinking", value: settings.defaultThinkingLevel },
  ];

  useInput((inputString, key) => {
    if (key.ctrl && inputString === "\u0003") {
      onCancel();
      return;
    }
    if (key.return) {
      const setting = settingsItems[selectedIndex];
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
      setSelectedIndex((i) => Math.min(settingsItems.length - 1, i + 1));
      return;
    }
    if (inputString && inputString.length === 1 && inputString.charCodeAt(0) >= 32) {
      const found = settingsItems.find((s) => s.label.toLowerCase().startsWith(inputString.toLowerCase()));
      if (found) {
        const idx = settingsItems.indexOf(found);
        setSelectedIndex(idx);
      }
    }
  });

  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold>Settings Selector</Text>
      <Box flexDirection="column">
        {settingsItems.map((s, i) => (
          <Box key={s.key} flexDirection="row" justifyContent="space-between">
            <Text color={i === selectedIndex ? "cyan" : "white"}>{s.label}</Text>
            <Text dimColor>{s.value}</Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>↑/↓: select, Enter: confirm, Ctrl+C: cancel</Text>
    </Box>
  );
}
