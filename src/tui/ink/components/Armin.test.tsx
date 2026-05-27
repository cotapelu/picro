/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Armin } from './Armin';
import { ThemeProvider } from '../hooks/useTheme.js';

describe('Armin', () => {
  it('renders without crashing', () => {
    const instance = render(
      <ThemeProvider initialMode="dark">
        <Armin />
      </ThemeProvider>
    );
    expect(instance.stdin).toBeDefined();
  });

  it('renders with size prop without crashing', () => {
    const instance = render(
      <ThemeProvider initialMode="dark">
        <Armin size={2} />
      </ThemeProvider>
    );
    expect(instance.stdin).toBeDefined();
  });
});
