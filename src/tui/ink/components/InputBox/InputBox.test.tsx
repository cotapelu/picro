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
});

describe('getCommonPrefix (utility)', () => {
  it('finds common prefix', () => {
    const strings = ['flower', 'flow', 'flight'];
    const first = strings[0];
    let prefix = '';
    for (let i = 0; i < first.length; i++) {
      const char = first[i];
      if (strings.every(s => s[i] === char)) {
        prefix += char;
      } else {
        break;
      }
    }
    expect(prefix).toBe('fl');
  });

  it('returns empty when no common prefix', () => {
    const strings = ['dog', 'racecar'];
    const first = strings[0];
    let prefix = '';
    for (let i = 0; i < first.length; i++) {
      if (strings.every(s => s[i] === first[i])) {
        prefix += first[i];
      } else {
        break;
      }
    }
    expect(prefix).toBe('');
  });
});
