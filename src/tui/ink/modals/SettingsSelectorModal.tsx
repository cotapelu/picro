/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../types/agent-session';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface SettingsSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

interface SettingItem {
  key: string;
  label: string;
  value: string;
  toggle?: boolean;
}

export const SettingsSelectorModal: React.FC<SettingsSelectorModalProps> = ({ runtime, onClose }) => {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<SettingItem[]>([]);

  useEffect(() => {
    // Load settings from runtime.settings
    const settingsManager = runtime.settings;
    if (!settingsManager) {
      setSettings([]);
      return;
    }

    const items: SettingItem[] = [
      {
        key: 'theme',
        label: 'Theme',
        value: settingsManager.get?.('theme') || (isDark ? 'dark' : 'light'),
      },
      {
        key: 'defaultThinkingLevel',
        label: 'Default Thinking Level',
        value: settingsManager.get?.('defaultThinkingLevel') || 'medium',
      },
      {
        key: 'autoCompaction',
        label: 'Auto Compaction',
        value: settingsManager.get?.('compaction')?.enabled !== false ? 'enabled' : 'disabled',
      },
      // Add more settings as needed
    ];

    setSettings(items);
  }, [runtime, isDark]);

  const handleToggle = (index: number) => {
    setSettings(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (item.key === 'theme') {
        const newTheme = item.value === 'dark' ? 'light' : 'dark';
        return { ...item, value: newTheme };
      }
      if (item.key === 'autoCompaction') {
        const newValue = item.value === 'enabled' ? 'disabled' : 'enabled';
        return { ...item, value: newValue };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    const settingsManager = runtime.settings;
    if (!settingsManager) return;

    try {
      for (const item of settings) {
        if (item.key === 'theme') {
          settingsManager.set('theme', item.value);
          // Apply theme immediately
          try {
            // Assuming runtime has a method to toggle theme, or use theme provider
            // For now, just save
            await settingsManager.save?.();
          } catch {
            // ignore
          }
        } else if (item.key === 'defaultThinkingLevel') {
          settingsManager.set('defaultThinkingLevel', item.value);
        } else if (item.key === 'autoCompaction') {
          const enabled = item.value === 'enabled';
          settingsManager.set('compaction', { ...settingsManager.get?.('compaction'), enabled });
        }
      }
      await settingsManager.save?.();
      onClose();
    } catch (err) {
      // Could show error toast; for now just close
      onClose();
    }
  };

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">Settings</Text>
        <Box flexDirection="column" marginTop={1}>
          {settings.map((item, index) => (
            <Box key={item.key}>
              <Text>{item.label}: </Text>
              <Text color={item.value === 'enabled' || item.value === 'dark' ? 'green' : 'red'}>
                {item.value}
              </Text>
              <Text> (press Space to toggle)</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ to select, Space to toggle, Enter to save, Esc to cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
