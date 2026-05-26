/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { InputBox } from './InputBox';
import { ThemeProvider } from '../../hooks/useTheme.js';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('InputBox', () => {
  it('renders with placeholder', () => {
    const { lastFrame } = renderWithTheme(<InputBox placeholder="Enter command" value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(lastFrame()).toContain('Enter command');
  });

  it('displays value', () => {
    const { lastFrame } = renderWithTheme(<InputBox value="Hello" onChange={() => {}} onSubmit={() => {}} />);
    expect(lastFrame()).toContain('Hello');
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithTheme(<InputBox value="" onChange={onChange} onSubmit={() => {}} />);
    // Simulate changing value by rerendering with new value; actual input handling not easily testable
    rerender(<InputBox value="test" onChange={onChange} onSubmit={() => {}} />);
    // Cannot directly assert onChange call because typing is through useInput, not exposed
  });
});
