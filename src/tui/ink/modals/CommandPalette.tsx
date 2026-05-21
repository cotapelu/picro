/** @jsxImportSource react */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

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
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filteredCommands.length - 1, prev + 1));
      return;
    }

    if (input.length === 1 && !key.ctrl && !key.meta) {
      setFilter((prev) => prev + input);
    }
  });

  // Close on blur? Not really applicable, but Escape handles close.

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text color="cyan">Command Palette</Text>
      <Box>
        <Text color="gray">Filter: </Text>
        <Text>{filter}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {filteredCommands.length === 0 ? (
          <Text color="gray">No commands match "{filter}"</Text>
        ) : (
          filteredCommands.map((cmd, idx) => (
            <Box key={cmd.id}>
              <Text
                color={idx === selectedIndex ? 'white' : 'gray'}
                backgroundColor={idx === selectedIndex ? 'blue' : undefined}
              >
                {idx === selectedIndex ? '> ' : '  '}
                {cmd.label}
              </Text>
              {cmd.shortcut && (
                <Text color="gray">
                  {' '}[{cmd.shortcut}]
                </Text>
              )}
              {cmd.description && (
                <Text color="gray">
                  {' '}- {cmd.description}
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
      <Box marginTop={1}>
        <Text>
          Use ↑↓ to navigate, Enter to select, Esc to close
        </Text>
      </Box>
    </Box>
  );
};
