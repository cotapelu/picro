/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentSessionRuntimeInterface } from '../../../runtime';
import { useTheme } from '../hooks/useTheme';
import { Modal } from './Modal';

interface ModelInfo {
  id: string;
  provider: string;
  name?: string;
}

interface ModelSelectorModalProps {
  runtime: AgentSessionRuntimeInterface;
  onClose: () => void;
  onSelect?: (model: ModelInfo) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({ runtime, onClose, onSelect }) => {
  const { theme } = useTheme();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load scoped models if available, otherwise show empty
    try {
      const scoped = (runtime.session as any)?.scopedModels || [];
      const modelInfos: ModelInfo[] = scoped.map((s: any) => ({
        id: s.model?.id || s.id,
        provider: s.model?.provider || s.provider,
        name: s.model?.name || s.name,
      }));
      setModels(modelInfos);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.return) {
      if (models[selectedIndex]) {
        onSelect?.(models[selectedIndex]);
        onClose();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(models.length - 1, prev + 1));
      return;
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
      <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} padding={1}>
        <Text bold color={theme.accent}>Select Model</Text>
        <Box flexDirection="column" marginTop={1}>
          {models.length === 0 ? (
            <Text color="dim">No models available</Text>
          ) : (
            models.map((model, idx) => (
              <Box key={`${model.provider}/${model.id}`}>
                <Text color={idx === selectedIndex ? theme.selectedForeground || 'white' : theme.foreground}>
                  {idx === selectedIndex ? '> ' : '  '}
                  {model.name || model.id}
                </Text>
                <Text dim> ({model.provider})</Text>
              </Box>
            ))
          )}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ to navigate, Enter to select, Esc to cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};
