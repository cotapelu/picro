/** @jsxImportSource react */
import React from 'react';
import { Box, Text } from 'ink';
import { Armin } from '../Armin';

interface HeaderProps {
  title: string;
  status: string;
  thinkingLevel: string;
  model: string;
  theme?: string;
  showArmin?: boolean;
  resourceCounts?: { extensions: number; skills: number; prompts: number; themes: number };
}

export const Header: React.FC<HeaderProps> = ({ title, status, thinkingLevel, model, theme, showArmin = false, resourceCounts }) => {
  return (
    <Box borderStyle="single" borderBottom paddingX={1} justifyContent="space-between">
      <Box gap={1}>
        {showArmin && <Armin size={1} />}
        <Text bold color="cyan">
          {title}
        </Text>
      </Box>
      <Box gap={1}>
        <Text color="gray">Model: {model}</Text>
        <Text color="green">Thinking: {thinkingLevel}</Text>
        {theme && <Text color="cyan">Theme: {theme}</Text>}
        <Text color={status.startsWith('Error') ? 'red' : 'green'}>[{status}]</Text>
        {resourceCounts && (
          <Box gap={1}>
            <Text dim>E:{resourceCounts.extensions}</Text>
            <Text dim>S:{resourceCounts.skills}</Text>
            <Text dim>P:{resourceCounts.prompts}</Text>
            <Text dim>T:{resourceCounts.themes}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
