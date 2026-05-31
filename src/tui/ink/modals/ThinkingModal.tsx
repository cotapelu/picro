/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

interface ThinkingModalProps {
  currentLevel: string;
  onChange: (level: string) => void;
}

const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];

export const ThinkingModal: React.FC<ThinkingModalProps> = ({
  currentLevel,
  onChange,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    THINKING_LEVELS.indexOf(currentLevel)
  );
  // Auto-focus this modal
  const { focus } = useFocus();
  useEffect(() => { focus(); }, [focus]);

  useInput((input, key) => {
    if (key.escape) {
      onChange(currentLevel); // No change
      return;
    }

    if (key.return) {
      onChange(THINKING_LEVELS[selectedIndex]);
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(THINKING_LEVELS.length - 1, prev + 1));
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" padding={1}>
      <Text color="yellow" bold>
        Select Thinking Level
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {THINKING_LEVELS.map((level, idx) => (
          <Box key={level}>
            <Text
              color={idx === selectedIndex ? 'white' : 'gray'}
              backgroundColor={idx === selectedIndex ? 'yellow' : undefined}
            >
              {idx === selectedIndex ? '> ' : '  '}
              {level}
            </Text>
            {idx === selectedIndex && (
              <Text color="black" backgroundColor="yellow">
                {' '}(current: {currentLevel})
              </Text>
            )}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text>
          ↑↓ to navigate, Enter to select, Esc to cancel
        </Text>
      </Box>
    </Box>
  );
};
