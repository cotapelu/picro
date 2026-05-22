/** @jsxImportSource react */
import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface ModelInfo {
  id: string;
  provider: string;
  name?: string;
  reasoning?: boolean;
}

interface ModelSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
  onSelect?: () => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({ runtime, onClose, onSelect }) => {
  const { theme } = useTheme();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadModels = useCallback(async () => {
    try {
      // Access modelRegistry via runtime.services.modelRegistry
      const extRuntime = runtime as any;
      const modelRegistry = extRuntime.services?.modelRegistry;
      if (modelRegistry) {
        // Refresh to get latest
        await modelRegistry.refresh?.();
        const available = await modelRegistry.getAvailable?.();
        if (Array.isArray(available)) {
          const modelInfos: ModelInfo[] = available.map((m: any) => ({
            id: m.id,
            provider: m.provider,
            name: m.name,
            reasoning: m.reasoning,
          }));
          // Sort by provider then id
          modelInfos.sort((a, b) => a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id));
          setModels(modelInfos);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
    setModels([]);
  }, [runtime]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      await loadModels();
      if (mounted) setLoading(false);
    };
    fetch();
    return () => { mounted = false; };
  }, [loadModels]);

  // Filter by search
  const filteredModels = models.filter(m =>
    `${m.provider}/${m.id}`.toLowerCase().includes(search.toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(search.toLowerCase()))
  );

  const [error, setError] = useState<string | null>(null);

  const handleKey = async (input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      const selected = filteredModels[selectedIndex];
      if (!selected) return;
      try {
        setError(null);
        // Call runtime.session.setModel with the selected model
        const extRuntime = runtime as any;
        await extRuntime.session?.setModel?.(selected);
        // Notify parent of model change
        onSelect?.();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to set model');
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(filteredModels.length - 1, prev + 1));
      return;
    }

    // Basic type-to-search: accumulate characters (ink's useInput gives each char)
    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setSearch(prev => prev + input);
      setSelectedIndex(0);
    }
    if (key.backspace) {
      setSearch(prev => prev.slice(0, -1));
      setSelectedIndex(0);
    }
  };
  useInput(handleKey);

  if (loading) {
    return (
      <Modal onClose={onClose}>
        <Box>
          <Text color="yellow">Loading models...</Text>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} padding={1} width={80}>
        <Text bold color={theme.accent}>Select Model</Text>
        {search && (
          <Text dim>Filter: {search}</Text>
        )}
        {error && (
          <Text color="red" dim>{error}</Text>
        )}
        <Box flexDirection="column" marginTop={1}>
          {filteredModels.length === 0 ? (
            <Text color="dim">No models match "{search}"</Text>
          ) : (
            filteredModels.map((model, idx) => (
              <Box key={`${model.provider}/${model.id}`}>
                <Text color={idx === selectedIndex ? (theme.selectedForeground || 'white') : theme.foreground}>
                  {idx === selectedIndex ? '> ' : '  '}
                  {model.name || model.id}
                </Text>
                <Text dim> ({model.provider})
                  {model.reasoning && ' [thinking]'}
                </Text>
              </Box>
            ))
          )}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ to navigate, Enter to select, type to filter, Esc to cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
