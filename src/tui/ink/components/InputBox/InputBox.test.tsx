/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { InputBox } from './InputBox';
import { ThemeProvider } from '../../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('InputBox', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  it('renders placeholder when empty', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} placeholder="Type a message..." />
    );
    expect(lastFrame()).toContain('Type a message...');
  });

  it('renders the current value', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="Hello world" />
    );
    expect(lastFrame()).toContain('Hello world');
  });

  it('renders prompt prefix ">"', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="test" />
    );
    expect(lastFrame()).toContain('>');
  });

  it('handles unicode characters', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="你好" />
    );
    expect(lastFrame()).toContain('你好');
  });
});
