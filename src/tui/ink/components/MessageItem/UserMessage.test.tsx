/** @jsxImportSource react */
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ThemeProvider } from '../../hooks/useTheme.js';
import { UserMessage } from './UserMessage';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('UserMessage', () => {
  it('renders user text content', () => {
    const { lastFrame } = renderWithTheme(<UserMessage text="Hello, I am a user" />);
    expect(lastFrame()).toContain('Hello, I am a user');
  });

  it('renders empty string gracefully', () => {
    const { lastFrame } = renderWithTheme(<UserMessage text="" />);
    // Should render nothing? Or empty line. It renders <Text>{text}</Text>, so empty.
    expect(lastFrame()).toBe('');
  });

  it('renders multiline content', () => {
    const { lastFrame } = renderWithTheme(<UserMessage text="Line1\nLine2" />);
    expect(lastFrame()).toContain('Line1');
    expect(lastFrame()).toContain('Line2');
  });

  it('renders special characters', () => {
    const special = '<>&"\'';
    const { lastFrame } = renderWithTheme(<UserMessage text={special} />);
    expect(lastFrame()).toContain(special);
  });
});
