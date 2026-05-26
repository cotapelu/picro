/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { ThemeProvider, useTheme } from './useTheme';

function TestConsumer() {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <>
      <Text>{isDark ? 'dark' : 'light'}</Text>
      <Text>{theme.primary}</Text>
      <Text>{typeof toggleTheme}</Text>
    </>
  );
}

describe('useTheme', () => {
  it('provides dark theme by default', () => {
    const instance = render(
      <ThemeProvider initialMode="dark">
        <TestConsumer />
      </ThemeProvider>
    );
    expect(instance.lastFrame()).toContain('dark');
  });

  it('provides light theme when initialized light', () => {
    const instance = render(
      <ThemeProvider initialMode="light">
        <TestConsumer />
      </ThemeProvider>
    );
    expect(instance.lastFrame()).toContain('light');
  });
});
