/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { SelectModal } from './SelectModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink's useInput to capture the handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

describe('SelectModal', () => {
  let handler: ((input?: string, key: any) => void) | null = null;
  const title = 'Test Modal';
  const options = ['Option A', 'Option B', 'Option C'];
  const onSelect = vi.fn();
  const onCancel = vi.fn();

  const renderModal = async () => {
    const result = render(
      <ThemeProvider initialMode="dark">
        <SelectModal title={title} options={options} onSelect={onSelect} onCancel={onCancel} />
      </ThemeProvider>
    );
    await act(async () => {}); // flush effects
    return result;
  };

  beforeEach(() => {
    handler = null;
    onSelect.mockClear();
    onCancel.mockClear();
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((h: any) => {
      handler = h;
    });
  });

  async function pressKey(key: any) {
    if (!handler) throw new Error('Handler not captured');
    await act(async () => {
      handler(undefined, key);
    });
  }

  it('renders without crashing', async () => {
    const result = await renderModal();
    expect(result.stdin).toBeDefined();
  });

  it('calls onCancel when Escape is pressed', async () => {
    await renderModal();
    await pressKey({ escape: true });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onSelect with the first option when Enter is pressed', async () => {
    await renderModal();
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Option A');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('navigates down with downArrow', async () => {
    await renderModal();
    // downArrow once -> index 1
    await pressKey({ downArrow: true });
    // Verify that after navigation, selecting yields option B
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('Option B');
  });

  it('navigates up with upArrow', async () => {
    await renderModal();
    // Move down twice to index 2
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    // upArrow once -> index 1
    await pressKey({ upArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('Option B');
  });

  it('does not go below 0 on upArrow at top', async () => {
    await renderModal();
    await pressKey({ upArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('Option A');
  });

  it('does not exceed max index on downArrow at bottom', async () => {
    await renderModal();
    // 3 options, indices 0,1,2. Down twice to 2.
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    // Another down should stay at 2
    await pressKey({ downArrow: true });
    await pressKey({ return: true });
    expect(onSelect).toHaveBeenCalledWith('Option C');
  });
});
