/** @jsxImportSource react */
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme.js';
import { sanitizeAndTruncate } from '../../utils/output-guards.js';

interface BashExecutionProps {
  command: string;
  output: string;
  exitCode?: number;
  cancelled?: boolean;
  truncated?: boolean;
}

export const BashExecution: React.FC<BashExecutionProps> = ({
  command,
  output,
  exitCode,
  cancelled = false,
  truncated = false,
}) => {
  const { theme } = useTheme();
  const [showOutput, setShowOutput] = useState(true);

  const isError = !cancelled && exitCode !== 0;

  return (
    <Box flexDirection="column" marginLeft={2}>
      <Box>
        <Text
          bold
          color={isError ? theme.error : theme.accent}
          onPress={() => setShowOutput(!showOutput)}
        >
          {showOutput ? '▼' : '▶'} !{command}
        </Text>
        {cancelled && <Text color={theme.warning}> (cancelled)</Text>}
        {!cancelled && exitCode !== undefined && (
          <Text color={isError ? theme.error : theme.dim}> (exit {exitCode})</Text>
        )}
        {truncated && <Text color={theme.warning}> [truncated]</Text>}
      </Box>
      {showOutput && output && (
        <Box marginLeft={2} flexDirection="column">
          <Text color={theme.dim}>{sanitizeAndTruncate(output)}</Text>
        </Box>
      )}
    </Box>
  );
};

