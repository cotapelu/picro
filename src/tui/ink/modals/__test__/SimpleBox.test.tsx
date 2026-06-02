/** @jsxImportSource react */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import { ThemeProvider } from '../../hooks/useTheme.js';

describe('SimpleBox', () => {
  it('renders text', () => {
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Box>
          <Text>Hello</Text>
        </Box>
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('Hello');
  });
});
