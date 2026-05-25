/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Modal } from './Modal.js';
import { useTheme } from '../hooks/useTheme.js';

interface SelectModalProps {
  title: string;
  options: readonly string[];
  onSelect: (option: string) => void;
  onCancel: () => void;
}

export const SelectModal: React.FC<SelectModalProps> = ({ title, options, onSelect, onCancel }) => {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [options]);

  const handleKey = (input: string, key: any) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      onSelect(options[selectedIndex]);
      return;
    }
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(options.length - 1, prev + 1));
      return;
    }
  };

  useInput(handleKey);

  return (
    <Modal onClose={onCancel}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">{title}</Text>
        <Box flexDirection="column" marginTop={1}>
          {options.map((opt, idx) => (
            <Box key={opt}>
              <Text
                color={idx === selectedIndex ? theme.selectedForeground || 'green' : theme.foreground}
                backgroundColor={idx === selectedIndex ? theme.selectedBackground || undefined : undefined}
              >
                {idx === selectedIndex ? '> ' : '  '}{opt}
              </Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text dim>↑↓ navigate, Enter select, Esc cancel</Text>
        </Box>
      </Box>
    </Modal>
  );
};

