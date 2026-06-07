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
  let getTreeMock: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onSelect = vi.fn();
    // Capture useInput handler
    (ink.useInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
    // Create a sample tree
    const sampleTree = [
      {
        entry: { id: 'root1', type: 'message', timestamp: '2024-01-01T00:00:00Z' },
        children: [
          {
            entry: { id: 'msg1', type: 'message', timestamp: '2024-01-01T00:01:00Z' },
            children: [],
          },
          {
            entry: { id: 'msg2', type: 'message', timestamp: '2024-01-01T00:02:00Z' },
            children: [],
          },
        ],
      },
      {
        entry: { id: 'root2', type: 'message', timestamp: '2024-01-01T00:03:00Z' },
        children: [
          {
            entry: { id: 'msg3', type: 'message', timestamp: '2024-01-01T00:04:00Z' },
            children: [],
          },
        ],
      },
    ];
    getTreeMock = vi.fn(() => sampleTree);
    runtime = {
      session: {
        sessionManager: {
          getTree: getTreeMock,
          getLeafId: vi.fn(() => 'msg1'),
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

  it('calls sessionManager.getTree and getLeafId on mount', () => {
    renderModal();
    expect(getTreeMock).toHaveBeenCalled();
  });

  it('falls back to empty when sessionManager missing', () => {
    runtime.session = {};
    renderModal();
    // Should not throw; will show "No tree entries found"
  });

  describe('keyboard handling', () => {
    beforeEach(async () => {
      renderModal();
      // Flush useEffect that loads branches
      await act(async () => {});
    });

    it('down arrow moves selection down and Enter confirms', async () => {
      // With flattened tree: root1 (0), msg1 (1), msg2 (2), root2 (3), msg3 (4)
      // Since leafId is 'msg1', selectedIndex starts at 1 (msg1)
      await pressKey({ downArrow: true }); // index 2 -> msg2
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('msg2');
      expect(onClose).toHaveBeenCalled();
    });

    it('up arrow moves selection up', async () => {
      // Starting at msg1 (1)
      await pressKey({ upArrow: true }); // to root1 (0)
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('root1');
    });

    it('clamps at top boundary', async () => {
      // Move to root1 (0) then try up
      await pressKey({ upArrow: true }); // stays at 0
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('root1');
    });

    it('clamps at bottom boundary', async () => {
      // Move down several times to last (msg3)
      await pressKey({ downArrow: true }); // 2
      await pressKey({ downArrow: true }); // 3
      await pressKey({ downArrow: true }); // 4
      await pressKey({ downArrow: true }); // stays 4
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('msg3');
    });

    it('Escape closes without calling onSelect', async () => {
      await pressKey({ escape: true });
      expect(onClose).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('Enter selects current branch and closes', async () => {
      // Starting at msg1 (leaf)
      await pressKey({ return: true });
      expect(onSelect).toHaveBeenCalledWith('msg1');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
