/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { ThemeProvider } from '../hooks/useTheme.js';
import { CommandPalette } from './CommandPalette';

// Mock ink's useInput to capture the handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

let inputHandler: ((input?: string, key: any) => void) | null = null;

describe('CommandPalette', () => {
  const wrap = (ui: React.ReactElement) => render(
    <ThemeProvider initialMode="dark">{ui}</ThemeProvider>
  );

  const onSelect = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    inputHandler = null;
    onSelect.mockClear();
    onClose.mockClear();
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((handler: any) => {
      inputHandler = handler;
    });
  });

  async function pressKey(key: any) {
    if (!inputHandler) throw new Error('Input handler not captured');
    await act(async () => {
      inputHandler(undefined, key);
    });
  }

  async function typeChar(char: string) {
    if (!inputHandler) throw new Error('Input handler not captured');
    await act(async () => {
      inputHandler(char, {});
    });
  }

  it('renders without crashing', () => {
    const commands = [{ id: 'test', label: '/test', description: 'Test command' }];
    const instance = wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });

  it('displays commands and descriptions', () => {
    const commands = [
      { id: 'model', label: '/model', description: 'Change model' },
      { id: 'custom', label: '/custom', description: 'Custom command' },
    ];
    const { lastFrame } = wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    expect(lastFrame()).toContain('/model');
    expect(lastFrame()).toContain('/custom');
    expect(lastFrame()).toContain('Change model');
  });

  it('filters commands based on initialFilter', () => {
    const commands = [
      { id: 'settings', label: '/settings', description: 'Open settings' },
      { id: 'session', label: '/session', description: 'Session info' },
      { id: 'model', label: '/model', description: 'Change model' },
    ];
    const { lastFrame } = wrap(
      <CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} initialFilter="set" />
    );
    expect(lastFrame()).toContain('/settings');
    expect(lastFrame()).not.toContain('/session');
    expect(lastFrame()).not.toContain('/model');
  });

  it('shows empty message when no commands match filter', () => {
    const commands = [{ id: 'settings', label: '/settings', description: 'Open settings' }];
    const { lastFrame } = wrap(
      <CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} initialFilter="xyz" />
    );
    expect(lastFrame()).toContain('No commands match');
  });

  it('calls onClose when Escape is pressed', async () => {
    const commands = [{ id: 'test', label: '/test', description: 'Test' }];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ escape: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with first command when Enter is pressed', async () => {
    const commands = [
      { id: 'first', label: '/first', description: 'First' },
      { id: 'second', label: '/second', description: 'Second' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('first');
  });

  it('navigates down with downArrow', async () => {
    const commands = [
      { id: 'a', label: '/a' },
      { id: 'b', label: '/b' },
      { id: 'c', label: '/c' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ downArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('navigates up with upArrow', async () => {
    const commands = [
      { id: 'a', label: '/a' },
      { id: 'b', label: '/b' },
      { id: 'c', label: '/c' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    await pressKey({ upArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('does not select beyond last item', async () => {
    const commands = [
      { id: 'a', label: '/a' },
      { id: 'b', label: '/b' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('does not go below first item', async () => {
    const commands = [{ id: 'a', label: '/a' }];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await pressKey({ upArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('filters commands as user types', async () => {
    const commands = [
      { id: 'settings', label: '/settings', description: 'Open settings' },
      { id: 'session', label: '/session', description: 'Session info' },
      { id: 'model', label: '/model', description: 'Change model' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    // Type 's' filters to both settings and session
    await typeChar('s');
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('settings');
    // Continue typing to narrow to settings only
    await typeChar('e');
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('settings');
  });

  it('resets selection to first item when filter changes', async () => {
    const commands = [
      { id: 'a', label: '/a' },
      { id: 'b', label: '/b' },
      { id: 'c', label: '/c' },
    ];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    // Move selection down to index 2
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    // Type a filter character that matches all commands (e.g., '/')
    await typeChar('/');
    // Selection should be reset to 0 (first item)
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('does not call onSelect when filteredCommands is empty and Enter is pressed', async () => {
    const commands = [{ id: 'a', label: '/a' }];
    await wrap(<CommandPalette commands={commands} onSelect={onSelect} onClose={onClose} />);
    await typeChar('z'); // filter 'z' yields no matches
    await pressKey({ return: true });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

