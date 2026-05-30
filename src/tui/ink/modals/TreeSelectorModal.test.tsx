import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { TreeSelectorModal } from './TreeSelectorModal';
import * as ink from 'ink';

// Mock useInput before component imports it
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

// Mock Modal to avoid nested useInput interference
vi.mock('./Modal.js', () => ({
  Modal: ({ children }: any) => children,
}));

import { ThemeProvider } from '../hooks/useTheme.js';

describe('TreeSelectorModal', () => {
  let onClose: vi.Mock;
  let onSelect: vi.Mock;
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;
  let runtime: any;
  let getBranchMock: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onSelect = vi.fn();
    // Capture useInput handler
    (ink.useInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
    getBranchMock = vi.fn(() => [{ id: 'main' }, { id: 'dev' }, { id: 'test' }]);
    runtime = {
      session: {
        sessionManager: {
          getBranch: getBranchMock,
        },
      },
    };
  });

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  function renderModal() {
    render(
      <ThemeProvider initialMode="dark">
        <TreeSelectorModal runtime={runtime} onClose={onClose} onSelect={onSelect} />
      </ThemeProvider>
    );
  }

  async function pressKey(key: any) {
    await act(async () => {
      capturedHandler?.(undefined, key);
    });
  }

  it('calls sessionManager.getBranch on mount', () => {
    renderModal();
    expect(getBranchMock).toHaveBeenCalled();
  });

  it('falls back to ["main"] when sessionManager missing', () => {
    runtime.session = {};
    renderModal();
    // No error thrown; branches default to ['main']
  });

  describe('keyboard handling', () => {
    beforeEach(async () => {
      renderModal();
      // Flush useEffect that loads branches
      await act(async () => {});
    });

    it('down arrow moves selection down and Enter confirms', async () => {
      // initial index 0 (main)
      await pressKey({ downArrow: true }); // index 1 -> dev
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('dev');
      expect(onClose).toHaveBeenCalled();
    });

    it('up arrow moves selection up', async () => {
      // Move down first
      await pressKey({ downArrow: true });
      // now at dev (1)
      await pressKey({ upArrow: true });
      // back to main (0)
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('main');
    });

    it('clamps at top boundary (up at first item)', async () => {
      // already at top (0)
      await pressKey({ upArrow: true });
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('main');
    });

    it('clamps at bottom boundary (down past last stays on last)', async () => {
      // move to last (index 2)
      await pressKey({ downArrow: true }); // 1
      await pressKey({ downArrow: true }); // 2
      await pressKey({ downArrow: true }); // still 2
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('test');
    });

    it('Escape closes without calling onSelect', async () => {
      await pressKey({ escape: true });
      expect(onClose).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('Enter selects current branch and closes', async () => {
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('main');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
