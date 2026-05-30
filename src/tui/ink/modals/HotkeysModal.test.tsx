/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { HotkeysModal } from './HotkeysModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink's useInput before component imports it
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

import * as ink from 'ink';

describe('HotkeysModal', () => {
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;
  let onClose: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    // Capture the useInput handler
    (ink.useInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
  });

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  async function pressKey(input?: string, key: any = {}) {
    await act(async () => {
      capturedHandler?.(input, key);
    });
  }

  it('renders without crashing', () => {
    const { stdin } = render(
      <ThemeProvider initialMode="dark">
        <HotkeysModal onClose={() => {}} />
      </ThemeProvider>
    );
    expect(stdin).toBeDefined();
  });

  describe('keyboard interactions', () => {
    it('calls onClose when Escape is pressed', async () => {
      render(
        <ThemeProvider initialMode="dark">
          <HotkeysModal onClose={onClose} />
        </ThemeProvider>
      );
      await pressKey(undefined, { escape: true });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose for Enter key', async () => {
      render(
        <ThemeProvider initialMode="dark">
          <HotkeysModal onClose={onClose} />
        </ThemeProvider>
      );
      await pressKey(undefined, { return: true });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose for regular character input', async () => {
      render(
        <ThemeProvider initialMode="dark">
          <HotkeysModal onClose={onClose} />
        </ThemeProvider>
      );
      await pressKey('a');
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
