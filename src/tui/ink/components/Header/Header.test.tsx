/** @jsxImportSource react */
/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './Header';
import { ThemeProvider } from '../../hooks/useTheme.js';

describe('Header', () => {
  it('renders title, model, and status', () => {
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Header title="Picro" status="Ready" thinkingLevel="medium" model="gpt-4" />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('Picro');
    expect(lastFrame()).toContain('gpt-4');
    expect(lastFrame()).toContain('Ready');
  });

  it('displays thinking level', () => {
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Header title="Test" status="Ready" thinkingLevel="high" model="claude" />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('high');
  });

  it('shows resource counts when provided', () => {
    const { lastFrame } = render(
      <ThemeProvider initialMode="dark">
        <Header
          title="Test"
          status="Ready"
          thinkingLevel="medium"
          model="model"
          resourceCounts={{ extensions: 5, skills: 3, prompts: 2, themes: 1 }}
        />
      </ThemeProvider>
    );
    expect(lastFrame()).toContain('E:5');
    expect(lastFrame()).toContain('S:3');
    expect(lastFrame()).toContain('P:2');
    expect(lastFrame()).toContain('T:1');
  });
});
