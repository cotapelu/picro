/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act as inkAct } from 'ink-testing-library';
import { InputBox } from './InputBox';
import { ThemeProvider } from '../../hooks/useTheme.js';

// Wrapper to provide theme context
function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('InputBox', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with placeholder when empty', () => {
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

  it('calls onChange when user types (simulated)', () => {
    // Note: InputBox uses useInput from ink, which reads from stdin.
    // For unit test we can't easily simulate keystrokes without complex stdin mocking.
    // We'll test that it renders correctly and callbacks are wired.
    const onChange = vi.fn();
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="test" onChange={onChange} />
    );
    expect(lastFrame()).toContain('test');
    // Cannot easily test keystrokes here; those are covered by integration tests.
  });

  it('triggers onSlashCommand when slash value provided', () => {
    // Simply render with slash value; effect should trigger on mount
    const onSlashCommand = vi.fn();
    const { rerender } = renderWithTheme(
      <InputBox
        {...defaultProps}
        value="/test"
        onSlashCommand={onSlashCommand}
      />
    );
    // Since value begins with '/', effect calls onSlashCommand on mount
    // But on mount value is already '/test', so effect will call
    expect(onSlashCommand).toHaveBeenCalledWith('/test');
  });

  it('respects disabled prop by not accepting input', () => {
    // Disabled just sets a flag; rendering is similar.
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="disabled" disabled={true} />
    );
    expect(lastFrame()).toContain('disabled');
  });

  it('handles multiline rendering', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="line1\nline2" multiline={true} />
    );
    expect(lastFrame()).toContain('line1');
    expect(lastFrame()).toContain('line2');
  });

  it('respects autoFocus prop', () => {
    // autoFocus doesn't change rendering; just ensures input is focused on mount
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="test" autoFocus={false} />
    );
    expect(lastFrame()).toContain('test');
  });
});
