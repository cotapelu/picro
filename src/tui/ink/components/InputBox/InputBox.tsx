/** @jsxImportSource react */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme';

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  autoFocus?: boolean;
  onSlashCommand?: (prefix: string) => void;
  onTab?: () => void;
}

export const InputBox: React.FC<InputBoxProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  disabled = false,
  multiline = true,
  autoFocus = true,
  onSlashCommand,
  onTab,
}) => {
  const { theme } = useTheme();
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const inputRef = useRef<string>(value);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const killRingRef = useRef<string>('');

  // Keep ref in sync
  useEffect(() => {
    inputRef.current = value;
    setCursorPosition(value.length);
    // Notify slash command changes
    if (onSlashCommand && value.startsWith('/')) {
      onSlashCommand(value);
    }
  }, [value, onSlashCommand]);

  // Command history navigation
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    const history = historyRef.current;
    if (history.length === 0) return;

    if (direction === 'up') {
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current++;
        const newValue = history[history.length - 1 - historyIndexRef.current];
        onChange(newValue);
      }
    } else {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        const newValue = history[history.length - 1 - historyIndexRef.current];
        onChange(newValue);
      } else if (historyIndexRef.current === 0) {
        historyIndexRef.current = -1;
        onChange('');
      }
    }
  }, [onChange]);

  // Handle input
  useInput((input, key) => {
    if (disabled) return;

    // Submit with Enter
    if (key.return && (!multiline || !key.shift)) {
      if (value.trim()) {
        // Add to history if not empty and different from last
        const history = historyRef.current;
        if (history.length === 0 || history[history.length - 1] !== value) {
          historyRef.current = [...history, value];
        }
        historyIndexRef.current = -1;
        onSubmit(value);
      }
      return;
    }

    // Newline with Shift+Enter in multiline mode
    if (key.return && multiline && key.shift) {
      onChange(value + '\n');
      return;
    }

    // Cancel with Ctrl+C
    if (key.ctrl && input === 'c') {
      process.exit(0);
      return;
    }

    // History navigation
    if (key.upArrow) {
      navigateHistory('up');
      return;
    }
    if (key.downArrow) {
      navigateHistory('down');
      return;
    }

    // Kill ring: Ctrl+K (kill to end of line), Ctrl+Y (yank)
    if (key.ctrl && input === 'k') {
      // Kill from cursor to end
      const before = value.slice(0, cursorPosition);
      const killed = value.slice(cursorPosition);
      // Store in kill ring
      killRingRef.current = killed;
      onChange(before);
      setCursorPosition(before.length);
      return;
    }
    if (key.ctrl && input === 'y') {
      const killRing = killRingRef.current;
      const newValue = value.slice(0, cursorPosition) + killRing + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(cursorPosition + killRing.length);
      return;
    }

    // Backspace
    if (key.backspace || input === '\x7f') {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }

    // Delete
    if (key.delete) {
      if (cursorPosition < value.length) {
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
        onChange(newValue);
      }
      return;
    }

    // Move cursor left/right
    if (key.leftArrow) {
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }
    if (key.rightArrow) {
      if (cursorPosition < value.length) {
        setCursorPosition(cursorPosition + 1);
      }
      return;
    }

    // Move to beginning/end
    if (key.ctrl && input === 'a') {
      setCursorPosition(0);
      return;
    }
    if (key.ctrl && input === 'e') {
      setCursorPosition(value.length);
      return;
    }

    // Tab - autocomplete
    if (key.tab) {
      onTab?.();
      return;
    }

    // Printable characters
    if (input.length === 1 && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(cursorPosition + 1);
      // Detect slash command at start of input
      if (input === '/' && cursorPosition === 0) {
        onSlashCommand?.('/');
      } else if (onSlashCommand && value.slice(0, cursorPosition).startsWith('/')) {
        // Update slash filter as user types
        const newPrefix = newValue.slice(0, cursorPosition + 1);
        if (newPrefix.startsWith('/')) {
          onSlashCommand(newPrefix);
        }
      }
    }
  });

  // Render input line with cursor
  const renderInputLine = () => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const isSlashMode = value.startsWith('/');

    return (
      <Box>
        <Text color="cyan">&gt; </Text>
        {isSlashMode && (
          <Text bold color={theme.accent}>[CMD] </Text>
        )}
        <Text>{beforeCursor}</Text>
        <Text inverse>{afterCursor.charAt(0) || ' '}</Text>
        <Text>{afterCursor.slice(1)}</Text>
        {value.length === 0 && cursorPosition === 0 && (
          <Text color={theme.dim}>{placeholder}</Text>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {renderInputLine()}
      {multiline && value.includes('\n') && (
        <Box marginTop={1}>
          <Text color="gray">(Multiline mode: Shift+Enter for new line, Enter to submit)</Text>
        </Box>
      )}
    </Box>
  );
};
