/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { BashOutputModal } from './BashOutputModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink's useInput to capture the handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

async function renderModal(props: any) {
  const result = render(
    <ThemeProvider initialMode="dark">
      <BashOutputModal {...props} />
    </ThemeProvider>
  );
  // Wait for React to flush effects (e.g., focus)
  await act(async () => {});
  return result;
}

describe('BashOutputModal', () => {
  let capturedHandler: ((input?: string, key: any) => void) | null = null;
  const onClose = vi.fn();

  beforeEach(() => {
    capturedHandler = null;
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
    onClose.mockClear();
  });

  async function pressKey(key: any = {}) {
    if (!capturedHandler) {
      throw new Error('No captured handler');
    }
    await act(async () => {
      capturedHandler(undefined, key);
    });
  }

  it('renders without crashing', async () => {
    const result = await renderModal({
      command: 'ls -la',
      output: 'file1\nfile2',
      onClose,
    });
    // Ensure render succeeded
    expect(result.stdin).toBeDefined();
  });

  it('renders without crashing when error prop is true', async () => {
    const result = await renderModal({
      command: 'fakecmd',
      output: 'error message',
      error: true,
      onClose,
    });
    // Ensure render succeeded
    expect(result.stdin).toBeDefined();
  });

  it('calls onClose when Escape is pressed', async () => {
    await renderModal({ command: 'test', output: '', onClose });
    await pressKey({ escape: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Enter is pressed', async () => {
    await renderModal({ command: 'test', output: '', onClose });
    await pressKey({ return: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Ctrl is pressed', async () => {
    await renderModal({ command: 'test', output: '', onClose });
    await pressKey({ ctrl: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
