/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider, useTheme } from './useTheme';
import { Text } from 'ink';

function TestConsumer() {
  const { isDark } = useTheme();
  return <Text>{isDark ? 'dark' : 'light'}</Text>;
}

describe('useTheme', () => {
  it('defaults to dark mode', () => {
    const { lastFrame } = render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('dark');
  });

  it('supports light mode initial', () => {
    const { lastFrame } = render(
      <ThemeProvider initialMode="light">
        <TestConsumer />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('light');
  });
});
