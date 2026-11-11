// Header - hiển thị tiêu đề ứng dụng
import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  title?: string;
  cwd?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'picro', cwd }) => {
  return (
    <Box borderStyle="round" borderColor="cyan" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{title}</Text>
        <Text>{cwd || '.'}</Text>
      </Box>
    </Box>
  );
};
