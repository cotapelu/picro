/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { LoginModal } from './LoginModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink's useInput to capture the handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

describe('LoginModal', () => {
  let onLogin: vi.Mock;
  let onClose: vi.Mock;
  let result: { lastFrame: () => string; stdin: any; unmount: () => void };
  let capturedHandler: ((input?: string, key: any) => void) | null = null;

  const renderModal = (loginMock: vi.Mock, closeMock: vi.Mock) => {
    capturedHandler = null;
    // Clear previous mock calls and set up implementation to capture the handler
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
    result = render(
      <ThemeProvider initialMode="dark">
        <LoginModal onLogin={loginMock} onClose={closeMock} />
      </ThemeProvider>
    );
  };

  async function pressKey(input?: string, key: any = {}) {
    if (!capturedHandler) {
      throw new Error('No captured input handler. Component may not have rendered properly.');
    }
    await act(async () => {
      capturedHandler(input, key);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    onLogin = vi.fn().mockResolvedValue(undefined);
    onClose = vi.fn();
    renderModal(onLogin, onClose);
    // Ensure the handler was captured
    expect(capturedHandler).not.toBeNull();
  });

  afterEach(() => {
    result.unmount();
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    expect(result.stdin).toBeDefined();
  });

  it('shows initial prompt and empty API key field', () => {
    const output = result.lastFrame() || '';
    expect(output).toContain('Enter API Key');
    expect(output).toContain('API Key:');
    expect(output).toContain('Press Enter to submit, Esc to cancel');
  });

  describe('keyboard interactions', () => {
    it('types characters into API key', async () => {
      await pressKey('a');
      await act(async () => {});
      let output = result.lastFrame() || '';
      expect(output).toContain('a');
      await pressKey('b');
      await act(async () => {});
      output = result.lastFrame() || '';
      expect(output).toContain('ab');
    });

    it('removes character on backspace', async () => {
      await pressKey('a');
      await pressKey('b');
      await act(async () => {});
      let output = result.lastFrame() || '';
      expect(output).toContain('ab');
      await pressKey(undefined, { backspace: true });
      await act(async () => {});
      output = result.lastFrame() || '';
      expect(output).toContain('a');
    });

    it('handles backspace when input is empty without error', async () => {
      await pressKey(undefined, { backspace: true });
      // Should still show the initial prompt
      const output = result.lastFrame() || '';
      expect(output).toContain('Enter API Key');
    });

    it('calls onClose when Escape is pressed', async () => {
      await pressKey(undefined, { escape: true });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onLogin).not.toHaveBeenCalled();
    });

    it('shows error when trying to submit empty API key', async () => {
      await pressKey(undefined, { return: true });
      expect(onLogin).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      await act(async () => {});
      const output = result.lastFrame() || '';
      expect(output).toContain('API key cannot be empty');
    });

    it('submits and calls onLogin with trimmed key on Enter', async () => {
      await pressKey(' ');
      await pressKey('k');
      await pressKey('e');
      await pressKey('y');
      await pressKey(' ');
      await act(async () => {});
      await pressKey(undefined, { return: true });
      expect(onLogin).toHaveBeenCalledWith('key');
      expect(onClose).toHaveBeenCalled();
    });

    it('displays error message when onLogin rejects', async () => {
      const rejectingLogin = vi.fn().mockRejectedValue(new Error('Invalid key'));
      result.unmount();
      onLogin = rejectingLogin;
      onClose = vi.fn();
      renderModal(rejectingLogin, onClose);
      const chars = 'badkey';
      for (const ch of chars) {
        await pressKey(ch);
      }
      await pressKey(undefined, { return: true });
      await act(async () => {});
      const output = result.lastFrame() || '';
      expect(output).toContain('Invalid key');
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
