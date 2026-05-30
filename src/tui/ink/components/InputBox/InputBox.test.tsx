import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { InputBox } from './InputBox';
import { ThemeProvider } from '../../hooks/useTheme.js';
import React from 'react';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

// ---------------------------------------------------------------------
// Simple rendering tests
// ---------------------------------------------------------------------
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

  it('renders [CMD] indicator when value starts with /', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value="/cmd" />
    );
    expect(lastFrame()).toContain('[CMD]');
  });

  it('renders multiline hint when value contains newline', () => {
    const { lastFrame } = renderWithTheme(
      <InputBox {...defaultProps} value={"a\nb"} />
    );
    expect(lastFrame()).toContain('Multiline mode');
  });
});

describe('getCommonPrefix (utility)', () => {
  function getCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    const first = strings[0];
    for (let i = 0; i < first.length; i++) {
      const char = first[i];
      for (let j = 1; j < strings.length; j++) {
        if (strings[j][i] !== char) {
          return first.slice(0, i);
        }
      }
    }
    return first;
  }

  it('finds common prefix', () => {
    expect(getCommonPrefix(['flower', 'flow', 'flight'])).toBe('fl');
  });

  it('returns empty when no common prefix', () => {
    expect(getCommonPrefix(['dog', 'racecar'])).toBe('');
  });

  it('returns full string when all identical', () => {
    expect(getCommonPrefix(['abc', 'abc', 'abc'])).toBe('abc');
  });

  it('handles empty array', () => {
    expect(getCommonPrefix([])).toBe('');
  });

  it('handles single string', () => {
    expect(getCommonPrefix(['solo'])).toBe('solo');
  });
});

// ---------------------------------------------------------------------
// Interaction tests
// ---------------------------------------------------------------------
describe('InputBox interactions', () => {
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;
  let value: string;
  let onChange: vi.Mock;
  let onSubmit: vi.Mock;
  let onSlashCommand: vi.Mock;
  let onTab: vi.Mock;
  let onPathComplete: vi.Mock;
  let onAutocomplete: vi.Mock;
  let onExternalEdit: vi.Mock;
  let rerender: (ui: React.ReactElement) => void;
  let exitSpy: vi.Mock;

  const baseProps = {
    multiline: true,
    disabled: false,
    placeholder: '',
  };

  function getElement(overrides: any = {}) {
    const props = {
      ...baseProps,
      ...overrides,
      value,
      onChange,
      onSubmit,
    };
    return (
      <ThemeProvider initialMode="dark">
        <InputBox {...props} />
      </ThemeProvider>
    );
  }

  function renderInputBox(overrides: any = {}) {
    const { rerender: r } = render(getElement(overrides));
    rerender = r;
  }

  async function pressKey(input: string | undefined, key: any = {}) {
    await act(async () => {
      if (capturedHandler) {
        await capturedHandler(input, key);
      }
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    (inkUseInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
    onChange = vi.fn((newValue: string) => { value = newValue; });
    onSubmit = vi.fn();
    onSlashCommand = vi.fn();
    onTab = vi.fn();
    onPathComplete = vi.fn().mockResolvedValue([]);
    onAutocomplete = vi.fn().mockResolvedValue([]);
    onExternalEdit = vi.fn().mockResolvedValue('');
    value = '';
  });

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  describe('submission', () => {
    it('calls onSubmit with value on Enter', async () => {
      value = 'Hello';
      renderInputBox();
      await pressKey(undefined, { return: true });
      expect(onSubmit).toHaveBeenCalledWith('Hello');
    });

    it('does not submit empty or whitespace-only value', async () => {
      value = '   ';
      renderInputBox();
      await pressKey(undefined, { return: true });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Shift+Enter inserts newline in multiline mode', async () => {
      value = 'line1';
      renderInputBox({ multiline: true });
      await pressKey(undefined, { return: true, shift: true });
      expect(onChange).toHaveBeenCalledWith('line1\n');
    });

    it('Shift+Enter submits when multiline false', async () => {
      value = 'line1';
      renderInputBox({ multiline: false });
      await pressKey(undefined, { return: true, shift: true });
      expect(onSubmit).toHaveBeenCalledWith('line1');
    });
  });

  describe('Ctrl+C', () => {
    it('calls process.exit(0)', async () => {
      renderInputBox();
      await pressKey('c', { ctrl: true });
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('backspace', () => {
    it('deletes last character', async () => {
      value = 'ab';
      renderInputBox();
      await pressKey(undefined, { backspace: true });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('does nothing at start with empty value', async () => {
      value = '';
      renderInputBox();
      await pressKey(undefined, { backspace: true });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('deletes before cursor after moving left', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { backspace: true });
      expect(onChange).toHaveBeenCalledWith('ac');
    });
  });

  describe('delete', () => {
    it('deletes character at cursor after moving left', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { delete: true });
      expect(onChange).toHaveBeenCalledWith('ab');
    });

    it('does nothing at end', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { delete: true });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('cursor movement', () => {
    it('leftArrow then type inserts before last char', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey('X', {});
      expect(onChange).toHaveBeenCalledWith('abXc');
    });

    it('rightArrow after left restores cursor', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { rightArrow: true });
      await pressKey('X', {});
      expect(onChange).toHaveBeenCalledWith('abcX');
    });

    it('Ctrl+A moves to beginning', async () => {
      value = 'bc';
      renderInputBox();
      await pressKey('a', { ctrl: true });
      await pressKey('a', {});
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('Ctrl+E moves to end', async () => {
      value = 'ab';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey('e', { ctrl: true });
      await pressKey('c', {});
      expect(onChange).toHaveBeenCalledWith('abc');
    });
  });

  describe('kill ring', () => {
    it('Ctrl+K kills to end of line', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey(undefined, { leftArrow: true });
      await pressKey('k', { ctrl: true });
      expect(onChange).toHaveBeenCalledWith('ab');
    });

    it('Ctrl+Y yanks killed text', async () => {
      value = 'abc';
      renderInputBox();
      // Kill 'bc': move left twice, Ctrl+K
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { leftArrow: true });
      await pressKey('k', { ctrl: true });
      // Sync value after kill
      value = 'a';
      rerender(getElement());
      // Yank
      await pressKey('y', { ctrl: true });
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('Ctrl+K at end calls onChange with same value', async () => {
      value = 'abc';
      renderInputBox();
      await pressKey('k', { ctrl: true });
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('Ctrl+Y inserts at beginning after moving there', async () => {
      value = 'abc';
      renderInputBox();
      // Kill 'bc'
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { leftArrow: true });
      await pressKey('k', { ctrl: true });
      value = 'a';
      rerender(getElement());
      // Move to beginning
      await pressKey('a', { ctrl: true });
      await pressKey('y', { ctrl: true });
      expect(onChange).toHaveBeenCalledWith('bca');
    });
  });

  describe('history navigation', () => {
    it('recalls previous submissions with up arrow', async () => {
      onSubmit = vi.fn((submitted: string) => { value = ''; });
      // First submission
      value = 'first';
      renderInputBox();
      await pressKey(undefined, { return: true });
      expect(onSubmit).toHaveBeenCalledWith('first');
      value = '';
      rerender(getElement());

      // Second submission
      value = 'second';
      rerender(getElement());
      await pressKey(undefined, { return: true });
      expect(onSubmit).toHaveBeenCalledWith('second');
      value = '';
      rerender(getElement());

      // Up arrow -> second
      await pressKey(undefined, { upArrow: true });
      expect(onChange).toHaveBeenCalledWith('second');
      value = 'second';
      rerender(getElement());

      // Up arrow -> first
      await pressKey(undefined, { upArrow: true });
      expect(onChange).toHaveBeenCalledWith('first');
    });

    it('down arrow navigates forward', async () => {
      onSubmit = vi.fn((submitted: string) => { value = ''; });
      // Two submissions
      value = 'first';
      renderInputBox();
      await pressKey(undefined, { return: true });
      value = '';
      rerender(getElement());

      value = 'second';
      rerender(getElement());
      await pressKey(undefined, { return: true });
      value = '';
      rerender(getElement());

      // Up to second, then up to first
      await pressKey(undefined, { upArrow: true });
      value = 'second';
      rerender(getElement());
      await pressKey(undefined, { upArrow: true });
      value = 'first';
      rerender(getElement());

      // Down -> second
      await pressKey(undefined, { downArrow: true });
      expect(onChange).toHaveBeenCalledWith('second');
    });
  });

  describe('slash command detection', () => {
    it('calls onSlashCommand when / typed at start', async () => {
      onSlashCommand = vi.fn();
      renderInputBox({ onSlashCommand });
      await pressKey('/', {});
      expect(onSlashCommand).toHaveBeenCalledWith('/');
    });

    it('calls onSlashCommand on subsequent changes while slash mode', async () => {
      onSlashCommand = vi.fn();
      value = '/';
      renderInputBox({ onSlashCommand });
      await pressKey('s', {});
      expect(onSlashCommand).toHaveBeenCalledWith('/s');
    });

    it('does not call onSlashCommand for non-slash input', async () => {
      onSlashCommand = vi.fn();
      value = 'a';
      renderInputBox({ onSlashCommand });
      await pressKey('b', {});
      expect(onSlashCommand).not.toHaveBeenCalled();
    });
  });

  describe('tab autocomplete', () => {
    it('completes path with single match', async () => {
      value = '/usr/bi';
      onPathComplete = vi.fn().mockResolvedValue(['/usr/bin']);
      renderInputBox({ onPathComplete });
      await pressKey(undefined, { tab: true });
      expect(onPathComplete).toHaveBeenCalledWith('/usr/bi');
      expect(onChange).toHaveBeenCalledWith('/usr/bin');
    });

    it('completes path with common prefix for multiple matches', async () => {
      value = '/us';
      onPathComplete = vi.fn().mockResolvedValue(['/usr/bin', '/usr/local']);
      renderInputBox({ onPathComplete });
      await pressKey(undefined, { tab: true });
      expect(onChange).toHaveBeenCalledWith('/usr/');
    });

    it('falls back to onAutocomplete when onPathComplete returns empty', async () => {
      value = '/usr/bi';
      onPathComplete = vi.fn().mockResolvedValue([]);
      onAutocomplete = vi.fn().mockResolvedValue(['/usr/binary']);
      renderInputBox({ onPathComplete, onAutocomplete });
      await pressKey(undefined, { tab: true });
      expect(onAutocomplete).toHaveBeenCalledWith('/usr/bi');
      expect(onChange).toHaveBeenCalledWith('/usr/binary');
    });

    it('falls back to onAutocomplete for non-path token', async () => {
      value = 'abc';
      onAutocomplete = vi.fn().mockResolvedValue(['abcd']);
      renderInputBox({ onAutocomplete });
      await pressKey(undefined, { tab: true });
      expect(onAutocomplete).toHaveBeenCalledWith('abc');
      expect(onChange).toHaveBeenCalledWith('abcd');
    });

    it('calls onTab when no completions', async () => {
      onAutocomplete = vi.fn().mockResolvedValue([]);
      onTab = vi.fn();
      value = 'xyz';
      renderInputBox({ onAutocomplete, onTab });
      await pressKey(undefined, { tab: true });
      expect(onTab).toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('completes token after space using onAutocomplete', async () => {
      value = 'hello wo';
      onAutocomplete = vi.fn().mockResolvedValue(['world']);
      renderInputBox({ onAutocomplete });
      await pressKey(undefined, { tab: true });
      expect(onAutocomplete).toHaveBeenCalledWith('wo');
      expect(onChange).toHaveBeenCalledWith('hello world');
    });

    it('uses first completion when common prefix not longer than partial', async () => {
      value = 'abc';
      onAutocomplete = vi.fn().mockResolvedValue(['abcx', 'abcy']);
      renderInputBox({ onAutocomplete });
      await pressKey(undefined, { tab: true });
      expect(onChange).toHaveBeenCalledWith('abcx');
    });
  });

  describe('disabled state', () => {
    it('ignores all input when disabled', async () => {
      onChange = vi.fn();
      value = 'test';
      renderInputBox({ disabled: true });
      await pressKey('a', {});
      expect(onChange).not.toHaveBeenCalled();
      await pressKey(undefined, { return: true });
      expect(onSubmit).not.toHaveBeenCalled();
      await pressKey(undefined, { backspace: true });
      expect(onChange).not.toHaveBeenCalled();
      await pressKey(undefined, { leftArrow: true });
      expect(onChange).not.toHaveBeenCalled();
      await pressKey('k', { ctrl: true });
      expect(onChange).not.toHaveBeenCalled();
      await pressKey('y', { ctrl: true });
      expect(onChange).not.toHaveBeenCalled();
      await pressKey(undefined, { tab: true });
      expect(onChange).not.toHaveBeenCalled();
      expect(onTab).not.toHaveBeenCalled();
      await pressKey('e', { ctrl: true, alt: true });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('unicode handling', () => {
    it('accepts unicode characters (single code unit)', async () => {
      value = 'hello';
      renderInputBox();
      await pressKey('é', {});
      expect(onChange).toHaveBeenCalledWith('helloé');
    });
  });
});
