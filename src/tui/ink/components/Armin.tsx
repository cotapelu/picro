/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

export const Armin: React.FC<{ size?: number }> = ({ size = 1 }) => {
  const { theme } = useTheme();
  // Simple ASCII logo for now
  const logo = [
    '   _    ',
    '  /|\\   ',
    ' / | \\  ',
    '/__|__\\ ',
    '   |    ',
    '   |    ',
  ];

  return (
    <Box flexDirection="column">
      {logo.map((line, i) => (
        <Text key={i} color={theme.accent}>{line}</Text>
      ))}
    </Box>
  );
};

