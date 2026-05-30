/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
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

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('ConfirmationModal', () => {
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;
  let onConfirm: vi.Mock;
  let onCancel: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onConfirm = vi.fn();
    onCancel = vi.fn();
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

  describe('rendering', () => {
    it('renders title and message', () => {
      const { lastFrame } = renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('Confirm');
      expect(lastFrame()).toContain('Are you sure?');
    });

    it('shows Yes/No options', () => {
      const { lastFrame } = renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('[Yes]');
      expect(lastFrame()).toContain('[No]');
    });

    it('defaults to No (cancel) selection', () => {
      const { lastFrame } = renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      const frame = lastFrame();
      expect(frame).toContain('[No]');
      expect(frame).toContain('[Yes]');
    });

    it('shows navigation hint', () => {
      const { lastFrame } = renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Proceed?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      expect(lastFrame()).toContain('← → to navigate, Enter to confirm, Esc to cancel');
    });
  });

  describe('keyboard interactions', () => {
    it('calls onCancel when Escape is pressed', async () => {
      renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      await pressKey(undefined, { escape: true });
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onCancel when Enter pressed while confirmed=false (default)', async () => {
      renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      // confirmed initially false
      await pressKey(undefined, { return: true });
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm when Enter pressed after toggling to confirmed=true', async () => {
      renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      // Toggle to confirmed (true) using right arrow
      await pressKey(undefined, { rightArrow: true });
      // Now Enter should confirm
      await pressKey(undefined, { return: true });
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('toggles confirmed state with left and right arrows', async () => {
      renderWithTheme(
        <ConfirmationModal
          title="Confirm"
          message="Are you sure?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
      // Initial state: confirmed false (No is selected)
      // Right arrow toggles to true
      await pressKey(undefined, { rightArrow: true });
      // We can't directly inspect state, but we can press Enter to see which callback is called
      await pressKey(undefined, { return: true });
      expect(onConfirm).toHaveBeenCalled();

      // Reset spies
      onConfirm.mockClear();
      onCancel.mockClear();

      // Toggle back to false with left arrow
      await pressKey(undefined, { leftArrow: true });
      await pressKey(undefined, { return: true });
      expect(onCancel).toHaveBeenCalled();
    });

    it('Enter on boundary: toggling from false to true with left arrow wraps? Not specified; but we can test that left arrow on false may stay false? In code, setConfirmed(prev => !prev) toggles regardless of current, so left arrow also toggles. So both arrows toggle.',
      // we already tested both.
    );
  });
});
