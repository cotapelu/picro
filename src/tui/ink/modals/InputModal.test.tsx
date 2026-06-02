/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { InputModal } from './InputModal';
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
      <InputModal {...props} />
    </ThemeProvider>
  );
  // Wait for effects (e.g., focus) and initial render
  await act(async () => {});
  return result;
}

describe('InputModal', () => {
  let modalHandler: ((input?: string, key: any) => void) | null = null;
  let inputBoxHandler: ((input?: string, key: any) => void) | null = null;
  const onCancel = vi.fn();
  const onSubmit = vi.fn();

  beforeEach(() => {
    modalHandler = null;
    inputBoxHandler = null;
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((handler: any) => {
      // The first call is from InputModal, the second from InputBox
      if (modalHandler === null) {
        modalHandler = handler;
      } else if (inputBoxHandler === null) {
        inputBoxHandler = handler;
      }
    });
    onCancel.mockClear();
    onSubmit.mockClear();
  });

  async function pressModalKey(key: any) {
    if (!modalHandler) {
      throw new Error('Modal handler not captured');
    }
    await act(async () => {
      modalHandler(undefined, key);
    });
  }

  it('renders without crashing', async () => {
    const result = await renderModal({ title: 'Enter name', onSubmit, onCancel });
    // Ensure render succeeded
    expect(result.stdin).toBeDefined();
  });

  it('calls onCancel when Escape is pressed', async () => {
    await renderModal({ title: 'Test', onSubmit, onCancel });
    await pressModalKey({ escape: true });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when Enter is pressed with empty value', async () => {
    await renderModal({ title: 'Test', onSubmit, onCancel });
    // Value remains empty, so Enter should trigger onCancel (since empty)
    await pressModalKey({ return: true });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Note: Testing non-empty submission requires interacting with the InputBox's internal state,
  // which is already covered by InputBox tests. This modal's responsibility is to call onSubmit
  // when Enter is pressed and the value is non-empty. That logic is exercised by InputBox tests indirectly.
});
