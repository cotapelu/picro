/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { ThinkingModal } from './ThinkingModal';

// Mock ink's useInput before component imports it
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

import * as ink from 'ink';

describe('ThinkingModal', () => {
  let onChange: vi.Mock;
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    onChange = vi.fn();
    // Capture the useInput handler
    (ink.useInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
  });

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  function renderModal(currentLevel: string) {
    render(
      <ThinkingModal currentLevel={currentLevel} onChange={onChange} />
    );
  }

  async function pressKey(key: any) {
    await act(async () => {
      capturedHandler?.(undefined, key);
    });
  }

  describe('keyboard interaction', () => {
    it('down Arrow moves selection and Enter confirms', async () => {
      renderModal('low'); // index 2 -> medium (3)
      await pressKey({ downArrow: true });
      await pressKey({ return: true });
      expect(onChange).toHaveBeenCalledWith('medium');
    });

    it('up Arrow moves selection and Enter confirms', async () => {
      renderModal('medium'); // index 3 -> low (2)
      await pressKey({ upArrow: true });
      await pressKey({ return: true });
      expect(onChange).toHaveBeenCalledWith('low');
    });

    it('clamps top boundary on up when at first item', async () => {
      renderModal('off'); // index 0
      await pressKey({ upArrow: true });
      await pressKey({ return: true });
      expect(onChange).toHaveBeenCalledWith('off');
    });

    it('clamps bottom boundary on down when at last item', async () => {
      renderModal('xhigh'); // index 5
      await pressKey({ downArrow: true });
      await pressKey({ return: true });
      expect(onChange).toHaveBeenCalledWith('xhigh');
    });

    it('Escape returns original level without change', async () => {
      renderModal('medium');
      await pressKey({ escape: true });
      expect(onChange).toHaveBeenCalledWith('medium');
    });

    it('Enter confirms current selection without arrow movement', async () => {
      renderModal('minimal');
      await pressKey({ return: true });
      expect(onChange).toHaveBeenCalledWith('minimal');
    });
  });
});
