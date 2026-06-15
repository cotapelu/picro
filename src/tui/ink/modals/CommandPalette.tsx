/** @jsxImportSource react */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  onSelect: (commandId: string) => void;
  onClose: () => void;
  initialFilter?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  onSelect,
  onClose,
  initialFilter = '',
}) => {
  const { theme } = useTheme();
  // Auto-focus this modal
  const { focus } = useFocus();
  useEffect(() => {
    focus();
  }, [focus]);
  const [filter, setFilter] = useState(initialFilter);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle input
  useInput((input, key) => {
    if (key.escape) {
      if (filter.length > 0) {
        setFilter('');
        setSelectedIndex(0);
        return;
      }
      onClose();
      return;
    }

    if (key.return) {
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex].id);
      }
      return;
    }

    if (key.upArrow) {
      if (filteredCommands.length === 0) return;
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      if (filteredCommands.length === 0) return;
      setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      setFilter((prev) => prev + input);
      return;
    }
    // Backspace support
    if (key.backspace) {
      setFilter((prev) => prev.slice(0, -1));
      return;
    }
  });

  // Close on blur? Not really applicable, but Escape handles close.

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} padding={1}>
      <Text bold color={theme.accent}>Command Palette</Text>
      <Box>
        <Text color={theme.dim}>Filter: </Text>
        <Text color={theme.foreground}>{filter}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {filteredCommands.length === 0 ? (
          <Text color={theme.dim}>No commands match "{filter}"</Text>
        ) : (
          filteredCommands.map((cmd, idx) => (
            <Box key={cmd.id}>
              <Text
                color={idx === selectedIndex ? theme.selectedForeground || 'white' : theme.secondary}
                backgroundColor={idx === selectedIndex ? theme.selectedBackground || 'blue' : undefined}
                bold={idx === selectedIndex}
              >
                {idx === selectedIndex ? '> ' : '  '}
                {cmd.label}
              </Text>
              {cmd.shortcut && (
                <Text color={theme.dim}>
                  {' '}[{cmd.shortcut}]
                </Text>
              )}
              {(cmd as any).source && (
                <Text color={theme.dim}>
                  {' '}({(cmd as any).source})
                </Text>
              )}
              {cmd.description && (
                <Text color={theme.dim}>
                  {' '}- {cmd.description}
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.dim}>
          Use ↑↓ to navigate, Enter to select, Esc to close
        </Text>
      </Box>
    </Box>
  );
};

