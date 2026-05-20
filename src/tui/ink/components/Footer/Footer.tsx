/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  hints?: string[];
}

export const Footer: React.FC<FooterProps> = ({ hints = [] }) => {
  return (
    <Box borderStyle="single" borderTop paddingX={1} justifyContent="space-between">
      <Text color="gray">
        {hints.length > 0 ? hints.join(' | ') : ''}
      </Text>
      <Text color="cyan">
        Picro Agent v0.0.1
      </Text>
    </Box>
  );
};
