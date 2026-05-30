/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { LoginModal } from './LoginModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink's useInput to capture handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});
import * as ink from 'ink';

describe('LoginModal', () => {
  let onLogin: vi.Mock;
  let onClose: vi.Mock;
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;
  let result: { lastFrame: () => string };

  const ensureCaptured = () => {
    if (!capturedHandler) {
      (ink.useInput as any).mockImplementation((handler: any) => {
        capturedHandler = handler;
      });
    }
  };

  const renderModal = (loginMock: vi.Mock, closeMock: vi.Mock) => {
    ensureCaptured();
    result = render(
      <ThemeProvider initialMode="dark">
        <LoginModal onLogin={loginMock} onClose={closeMock} />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onLogin = vi.fn().mockResolvedValue(undefined);
    onClose = vi.fn();
    renderModal(onLogin, onClose);
  });

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  async function pressKey(input?: string, key: any = {}) {
    await act(async () => {
      capturedHandler?.(input, key);
    });
    // Allow microtasks to flush (for state updates)
    await Promise.resolve();
  }

  it('renders without crashing', () => {
    expect(result.stdin).toBeDefined();
  });

  it('shows initial prompt and empty API key field', () => {
    const output = result.lastFrame();
    expect(output).toContain('Enter API Key');
    expect(output).toContain('API Key:');
    expect(output).toContain('Press Enter to submit, Esc to cancel');
  });

  describe('keyboard interactions', () => {
    it('types characters into API key', async () => {
      await pressKey('a');
      await pressKey('b');
      await pressKey('c');
      const output = result.lastFrame();
      expect(output).toContain('abc');
    });

    it('removes character on backspace', async () => {
      await pressKey('a');
      await pressKey('b');
      await pressKey('c');
      expect(result.lastFrame()).toContain('abc');
      await pressKey(undefined, { backspace: true });
      expect(result.lastFrame()).toContain('ab');
    });

    it('handles backspace when input is empty without error', async () => {
      // Initially empty, pressing backspace should do nothing and not crash
      await pressKey(undefined, { backspace: true });
      const output = result.lastFrame();
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
      const output = result.lastFrame();
      expect(output).toContain('API key cannot be empty');
    });

    it('submits and calls onLogin with trimmed key on Enter', async () => {
      // Type " key " with spaces to verify trimming
      await pressKey(' ');
      await pressKey('k');
      await pressKey('e');
      await pressKey('y');
      await pressKey(' ');
      await pressKey(undefined, { return: true });
      expect(onLogin).toHaveBeenCalledWith('key');
      expect(onClose).toHaveBeenCalled();
    });

    it('displays error message when onLogin rejects', async () => {
      // Create a new mock that rejects
      const rejectingLogin = vi.fn().mockRejectedValue(new Error('Invalid key'));
      renderModal(rejectingLogin, onClose);
      // Type 'badkey' char by char
      const chars = 'badkey';
      for (const ch of chars) {
        await pressKey(ch);
      }
      await pressKey(undefined, { return: true });
      // Allow state update from catch to render
      await act(async () => {});
      const output = result.lastFrame();
      expect(output).toContain('Invalid key');
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
