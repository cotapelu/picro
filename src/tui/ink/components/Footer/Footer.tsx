/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import type { FooterDataProvider, FooterData } from './FooterDataProvider.js';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function getThinkingLevelDisplay(level: string): string {
  switch (level) {
    case 'off': return '';
    case 'minimal': return 'min';
    case 'low': return 'low';
    case 'medium': return 'med';
    case 'high': return 'high';
    case 'xhigh': return 'xhigh';
    default: return level;
  }
}

interface FooterProps {
  provider: FooterDataProvider;
  hints?: string[];
}

export const Footer: React.FC<FooterProps> = ({ provider, hints = [] }) => {
  const { theme } = useTheme();
  const [data, setData] = useState<FooterData>(provider.getData());

  useEffect(() => {
    return provider.onChange((newData) => setData(newData));
  }, [provider]);

  const {
    cwdBasename,
    sessionName,
    model,
    thinkingLevel,
    tokens,
    cost,
    autoCompactEnabled,
    extensionStatuses,
    performance,
  } = data;

  const leftParts: string[] = [cwdBasename];
  if (sessionName) leftParts.push(sessionName);
  if (autoCompactEnabled) leftParts.push('(auto)');

  const centerParts: string[] = [model];
  const thinkingDisplay = getThinkingLevelDisplay(thinkingLevel);
  if (thinkingDisplay) centerParts.push(`(${thinkingDisplay})`);

  const rightParts: string[] = [];
  if (tokens.input > 0 || tokens.output > 0 || tokens.cacheRead > 0 || tokens.cacheWrite > 0) {
    if (tokens.cacheRead > 0 || tokens.cacheWrite > 0) {
      rightParts.push(`cache: +${formatNumber(tokens.cacheWrite)} -${formatNumber(tokens.cacheRead)}`);
    }
    rightParts.push(`in:${formatNumber(tokens.input)} out:${formatNumber(tokens.output)}`);
    if (cost > 0) rightParts.push(`$${cost.toFixed(4)}`);
    if (hints.length > 0) rightParts.push('·');
  }
  if (performance) {
    if (tokens.input > 0 || tokens.output > 0) rightParts.push('·');
    rightParts.push(`CPU:${performance.avgCpuUserMS.toFixed(1)}ms`);
    rightParts.push(`RSS:${performance.avgRSSMB.toFixed(1)}MB`);
  }
  if (hints.length > 0) {
    rightParts.push(hints.join(' | '));
  }
  // Extension statuses (show if any)
  if (extensionStatuses.length > 0) {
    const extText = extensionStatuses.map(ext => ext.status || ext.name).join(', ');
    rightParts.push(`· ${extText}`);
  }

  return (
    <Box borderStyle="single" borderTop borderColor={theme.border} paddingX={1} justifyContent="space-between" flexShrink={0}>
      <Text dim>
        {leftParts.join(' / ') || ' '}
      </Text>
      <Text bold>
        {centerParts.join(' ') || 'Picro'}
      </Text>
      <Text dim>
        {rightParts.join(' ') || ''}
      </Text>
    </Box>
  );
};

