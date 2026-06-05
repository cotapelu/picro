/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';
import { useTheme } from '../hooks/useTheme.js';
import { Modal } from './Modal.js';
import {
  type EnabledIds,
  isEnabled,
  toggle,
  enableAll,
  clearAll,
  move,
  getSortedIds,
} from './scoped-models-utils.js';

interface ModelInfo {
  fullId: string;
  provider: string;
  id: string;
  name?: string;
}

interface ScopedModelsSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
}

export const ScopedModelsSelectorModal: React.FC<ScopedModelsSelectorModalProps> = ({ runtime, onClose }) => {
  const { theme } = useTheme();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [enabledIds, setEnabledIds] = useState<EnabledIds>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Auto-focus this modal
  const { setFocus } = useFocus();
  useEffect(() => { setFocus(); }, [setFocus]);
  const [search, setSearch] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const maxVisible = 8;

  // Load models and current scopedModels setting
  useEffect(() => {
    const load = async () => {
      try {
        const extRuntime = runtime as any;
        const modelRegistry = extRuntime.services?.modelRegistry;
        if (modelRegistry) {
          await modelRegistry.refresh?.();
          const available = await modelRegistry.getAvailable?.();
          if (Array.isArray(available)) {
            const modelInfos: ModelInfo[] = available.map((m: any) => ({
              fullId: `${m.provider}/${m.id}`,
              provider: m.provider,
              id: m.id,
              name: m.name,
            }));
            modelInfos.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
            setModels(modelInfos);
          }
        }
        // Get current scopedModels setting
        const settings = runtime.settings as any;
        const scopedEnabled = settings?.get?.('scopedModelsEnabled') ?? false;
        const scopedModelIds = settings?.get?.('scopedModelIds') as string[] | null | undefined;
        if (scopedEnabled && Array.isArray(scopedModelIds)) {
          setEnabledIds(scopedModelIds);
        } else {
          setEnabledIds(null); // all enabled
        }
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    };
    load();
  }, [runtime]);

  // Filtered items based on enabled state and search
  const getFilteredItems = useCallback((): ModelInfo[] => {
    const sortedIds = getSortedIds(enabledIds, models.map(m => m.fullId));
    const items = sortedIds
      .map(id => models.find(m => m.fullId === id))
      .filter((m): m is ModelInfo => m !== undefined && (search === '' || `${m.fullId}`.toLowerCase().includes(search.toLowerCase()) || (m.name && m.name.toLowerCase().includes(search.toLowerCase()))));
    return items;
  }, [models, enabledIds, search]);

  const filteredItems = getFilteredItems();

  const handleKey = useCallback(async (input: string, key: any) => {
    // Navigation
    if (key.escape) {
      onClose();
      return;
    }
    if (key.return) {
      if (filteredItems.length === 0) return;
      const selected = filteredItems[selectedIndex];
      if (selected) {
        setEnabledIds(prev => toggle(prev, selected.fullId));
        setIsDirty(true);
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
      return;
    }
    // Reorder
    if (key.upArrow && key.shift) {
      if (enabledIds !== null) {
        const selected = filteredItems[selectedIndex];
        if (selected && isEnabled(enabledIds, selected.fullId)) {
          setEnabledIds(prev => move(prev, selected.fullId, -1));
          setIsDirty(true);
        }
      }
      return;
    }
    if (key.downArrow && key.shift) {
      if (enabledIds !== null) {
        const selected = filteredItems[selectedIndex];
        if (selected && isEnabled(enabledIds, selected.fullId)) {
          setEnabledIds(prev => move(prev, selected.fullId, 1));
          setIsDirty(true);
        }
      }
      return;
    }
    // Enable all filtered or all
    if (key.ctrl && input === 'a') {
      const targetIds = search ? filteredItems.map(i => i.fullId) : undefined;
      setEnabledIds(prev => enableAll(prev, models.map(m => m.fullId), targetIds));
      setIsDirty(true);
      return;
    }
    // Clear all filtered or all
    if (key.ctrl && input === 'x') {
      const targetIds = search ? filteredItems.map(i => i.fullId) : undefined;
      setEnabledIds(prev => clearAll(prev, models.map(m => m.fullId), targetIds));
      setIsDirty(true);
      return;
    }
    // Toggle provider
    if (key.ctrl && input === 'p') {
      const selected = filteredItems[selectedIndex];
      if (selected) {
        const provider = selected.provider;
        const providerIds = models.filter(m => m.provider === provider).map(m => m.fullId);
        const allEnabled = providerIds.every(id => isEnabled(enabledIds, id));
        setEnabledIds(prev => allEnabled ? clearAll(prev, models.map(m => m.fullId), providerIds) : enableAll(prev, models.map(m => m.fullId), providerIds));
        setIsDirty(true);
      }
      return;
    }
    // Save (persist to settings)
    if (key.ctrl && input === 's') {
      const settings = runtime.settings as any;
      if (settings) {
        settings.set('scopedModelsEnabled', true);
        settings.set('scopedModelIds', enabledIds === null ? models.map(m => m.fullId) : enabledIds);
        await settings.save?.();
        setIsDirty(false);
      }
      return;
    }
    // Backspace to clear search
    if (key.backspace) {
      setSearch(prev => prev.slice(0, -1));
      setSelectedIndex(0);
      return;
    }
    // Type to search (single character)
    if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt) {
      setSearch(prev => prev + input);
      setSelectedIndex(0);
      return;
    }
  }, [filteredItems, selectedIndex, enabledIds, models, search, onClose, runtime]);

  useInput(handleKey);

  // Calculate visible range
  const startIndex = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), filteredItems.length - maxVisible));
  const endIndex = Math.min(startIndex + maxVisible, filteredItems.length);
  const allEnabled = enabledIds === null;

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} padding={1} width={80}>
        <Text bold color={theme.accent}>Model Configuration</Text>
        <Text dim>Session-only. Ctrl+S to save to settings.</Text>
        {search && (
          <Text dim>Filter: {search}</Text>
        )}
        <Box flexDirection="column" marginTop={1}>
          {filteredItems.length === 0 ? (
            <Text color="dim">No models match "{search}"</Text>
          ) : (
            filteredItems.slice(startIndex, endIndex).map((model, idx) => {
              const globalIndex = startIndex + idx;
              const isSelected = globalIndex === selectedIndex;
              const prefix = isSelected ? theme.fg(theme.accent, '→ ') : '  ';
              const modelText = isSelected ? theme.fg(theme.accent, model.id) : model.id;
              const providerBadge = theme.fg('muted', ` [${model.provider}]`);
              const status = allEnabled ? '' : isEnabled(enabledIds, model.fullId) ? theme.fg('green', ' ✓') : theme.fg('dim', ' ✗');
              return (
                <Text key={model.fullId}>
                  {prefix}{modelText}{providerBadge}{status}
                </Text>
              );
            })
          )}
        </Box>
        {startIndex > 0 || endIndex < filteredItems.length ? (
          <Text dim> ({selectedIndex + 1}/{filteredItems.length})</Text>
        ) : null}
        <Box marginTop={1}>
          <Text dim>
            ↑↓ navigate · Enter toggle · Ctrl+A enable all · Ctrl+X clear all · Ctrl+P toggle provider · Ctrl+S save
          </Text>
        </Box>
        {isDirty && (
          <Text color="yellow">(unsaved changes)</Text>
        )}
      </Box>
    </Modal>
  );
};
