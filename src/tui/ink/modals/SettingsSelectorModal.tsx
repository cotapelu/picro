/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';

interface SettingDef {
  label: string;
  type: 'toggle' | 'select' | 'number';
  get: () => any;
  set: (value: any) => void;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
}

interface SettingsSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

export const SettingsSelectorModal: React.FC<SettingsSelectorModalProps> = ({ runtime, onClose }) => {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<SettingDef[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sm = runtime.settings;
    if (!sm) return;

    const defs: SettingDef[] = [];

    // Helper to add a setting only if required methods exist
    const add = (label: string, getter: () => any, setter: (v: any) => void, type: SettingDef['type'], extra?: Partial<SettingDef>) => {
      if (getter && setter) {
        defs.push({ label, type, get: getter, set: setter, ...extra });
      }
    };

    // Theme
    add('Theme', () => sm.getTheme?.() ?? (isDark ? 'dark' : 'light'), (v) => sm.setTheme?.(v), 'select', {
      options: [
        { label: 'Dark', value: 'dark' },
        { label: 'Light', value: 'light' },
      ]
    });

    // Default Thinking Level
    add('Default Thinking', () => sm.getDefaultThinkingLevel?.() ?? 'medium', (v) => sm.setDefaultThinkingLevel?.(v as any), 'select', {
      options: [
        { label: 'Off', value: 'off' },
        { label: 'Minimal', value: 'minimal' },
        { label: 'Low', value: 'low' },
        { label: 'Medium', value: 'medium' },
        { label: 'High', value: 'high' },
        { label: 'X-High', value: 'xhigh' },
      ]
    });

    // Transport
    add('Transport', () => sm.getTransport?.() ?? 'sse', (v) => sm.setTransport?.(v as any), 'select', {
      options: [
        { label: 'SSE', value: 'sse' },
        { label: 'WebSocket', value: 'websocket' },
        { label: 'Polling', value: 'polling' },
      ]
    });

    // Auto Compaction
    add('Auto Compaction', () => sm.getCompactionEnabled?.() ?? true, (v) => sm.setCompactionEnabled?.(v), 'toggle');

    // Hide Thinking Block
    add('Hide Thinking Blocks', () => sm.getHideThinkingBlock?.() ?? false, (v) => sm.setHideThinkingBlock?.(v), 'toggle');

    // Show Images
    add('Show Images', () => sm.getShowImages?.() ?? true, (v) => sm.setShowImages?.(v), 'toggle');

    // Image Width Cells
    add('Image Width (cells)', () => sm.getImageWidthCells?.() ?? 60, (v) => sm.setImageWidthCells?.(v), 'number', { min: 10, max: 200, step: 5 });

    setSettings(defs);

    const initVals: Record<string, any> = {};
    for (const def of defs) {
      initVals[def.label] = def.get();
    }
    setValues(initVals);
  }, [runtime, isDark]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      for (const def of settings) {
        def.set(values[def.label]);
      }
      await runtime.settings?.save?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [runtime, settings, values, onClose]);

  const handleToggle = useCallback((label: string) => {
    setValues(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const handleNumberChange = useCallback((label: string, delta: number) => {
    setValues(prev => {
      const def = settings.find(s => s.label === label);
      if (!def || def.type !== 'number') return prev;
      const newVal = Math.max(def.min ?? 0, Math.min(def.max ?? Infinity, prev[label] + delta));
      return { ...prev, [label]: newVal };
    });
  }, [settings]);

  const handleSelect = useCallback((label: string, value: any) => {
    setValues(prev => ({ ...prev, [label]: value }));
  }, []);

  useInput((input, key) => {
    if (saving) return;
    if (key.escape) { onClose(); return; }
    if (key.return) { handleSave(); return; }

    if (key.upArrow) { setSelectedIndex(i => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSelectedIndex(i => Math.min(settings.length - 1, i + 1)); return; }

    if (selectedIndex >= settings.length) return;
    const def = settings[selectedIndex];
    if (!def) return;

    if (def.type === 'toggle' && (input === ' ' || key.return)) {
      handleToggle(def.label);
      return;
    }

    if (def.type === 'number') {
      if (key.leftArrow || key.backspace) {
        handleNumberChange(def.label, -(def.step || 1));
        return;
      }
      if (key.rightArrow) {
        handleNumberChange(def.label, def.step || 1);
        return;
      }
    }

    if (def.type === 'select') {
      if (key.leftArrow) {
        const idx = def.options?.findIndex(o => o.value === values[def.label]) ?? -1;
        if (idx > 0) {
          handleSelect(def.label, def.options![idx - 1].value);
        } else if (def.options && def.options.length > 0) {
          handleSelect(def.label, def.options[def.options.length - 1].value);
        }
        return;
      }
      if (key.rightArrow) {
        const idx = def.options?.findIndex(o => o.value === values[def.label]) ?? -1;
        if (idx < (def.options?.length ?? 0) - 1) {
          handleSelect(def.label, def.options![idx + 1].value);
        } else if (def.options && def.options.length > 0) {
          handleSelect(def.label, def.options[0].value);
        }
        return;
      }
    }
  });

  const renderValue = (def: SettingDef, value: any) => {
    switch (def.type) {
      case 'toggle': return value ? 'On' : 'Off';
      case 'number': return `${value}`;
      case 'select':
        const opt = def.options?.find(o => o.value === value);
        return opt?.label || String(value);
      default: return String(value);
    }
  };

  if (saving) {
    return (
      <Modal onClose={onClose}>
        <Box borderStyle="round" borderColor="yellow" padding={1}>
          <Text color="yellow">Saving...</Text>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} width={60}>
        <Text bold color="cyan">Settings</Text>
        {error && <Text color="red">Error: {error}</Text>}
        <Box flexDirection="column" marginTop={1}>
          {settings.map((def, idx) => {
            const isSel = idx === selectedIndex;
            const val = values[def.label];
            return (
              <Box key={def.label}>
                <Text color={isSel ? 'cyan' : 'white'} bold={isSel}>
                  {isSel ? '▶ ' : '  '}{def.label}
                </Text>
                {def.type !== 'toggle' && <Text>: </Text>}
                {def.type === 'toggle' && <Text> [</Text>}
                <Text color={isSel ? 'yellow' : 'green'}>
                  {renderValue(def, val)}
                </Text>
                {def.type === 'toggle' && <Text>]</Text>}
                {def.type === 'number' && isSel && <Text dim> (←→)</Text>}
                {def.type === 'toggle' && isSel && <Text dim> (Space)</Text>}
                {def.type === 'select' && isSel && <Text dim> (←→)</Text>}
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ select, Enter save, Esc cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};

