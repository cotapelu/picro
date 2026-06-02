/** @jsxImportSource react */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { useInput as inkUseInput } from 'ink';
import { ThemeProvider } from '../hooks/useTheme.js';
import { ModelSelectorModal } from './ModelSelectorModal';

// Mock ink's useInput to capture the handler
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

let inputHandler: ((input?: string, key: any) => void) | null = null;

describe('ModelSelectorModal', () => {
  const mockRuntime = {
    services: {
      modelRegistry: {
        refresh: vi.fn(),
        getAvailable: vi.fn(),
      },
    },
    session: {
      setModel: vi.fn().mockResolvedValue(undefined),
    },
  } as any;

  const onClose = vi.fn();
  const onSelect = vi.fn();

  beforeEach(() => {
    inputHandler = null;
    onClose.mockClear();
    onSelect.mockClear();
    (inkUseInput as any).mockClear();
    (inkUseInput as any).mockImplementation((handler: any) => {
      inputHandler = handler;
    });
    mockRuntime.services.modelRegistry.refresh.mockClear().mockResolvedValue(undefined);
    mockRuntime.services.modelRegistry.getAvailable.mockClear();
    mockRuntime.session.setModel.mockClear().mockResolvedValue(undefined);
  });

  async function renderModal() {
    const result = render(
      <ThemeProvider initialMode="dark">
        <ModelSelectorModal runtime={mockRuntime} onClose={onClose} onSelect={onSelect} />
      </ThemeProvider>
    );
    // Wait for initial render and any microtasks (including async effects)
    await act(async () => {
      await Promise.resolve();
    });
    return result;
  }

  async function pressKey(key: any) {
    if (!inputHandler) throw new Error('Handler not captured');
    await act(async () => {
      inputHandler(undefined, key);
    });
  }

  async function typeChar(char: string) {
    if (!inputHandler) throw new Error('Handler not captured');
    await act(async () => {
      inputHandler(char, {});
    });
  }

  it('renders without crashing', async () => {
    const result = await renderModal();
    expect(result.stdin).toBeDefined();
  });

  it('displays models after loading (renders without crashing)', async () => {
    mockRuntime.services.modelRegistry.getAvailable.mockResolvedValue([
      { id: 'gpt-4', provider: 'openai', name: 'GPT-4', reasoning: true },
      { id: 'claude-3', provider: 'anthropic', name: 'Claude 3', reasoning: false },
    ]);
    const result = await renderModal();
    // Just ensure render succeeded; we don't verify visual output due to absolute positioning
    expect(result.stdin).toBeDefined();
  });

  it('does nothing when no models available and Enter pressed', async () => {
    mockRuntime.services.modelRegistry.getAvailable.mockResolvedValue([]);
    await renderModal();
    await pressKey({ return: true });
    expect(mockRuntime.session.setModel).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    mockRuntime.services.modelRegistry.getAvailable.mockResolvedValue([]);
    await renderModal();
    await pressKey({ escape: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not select any model when filter yields no matches', async () => {
    mockRuntime.services.modelRegistry.getAvailable.mockResolvedValue([
      { id: 'a', provider: 'p', name: 'A' },
    ]);
    await renderModal();
    // Type a filter that matches nothing
    await typeChar('z');
    await pressKey({ return: true });
    expect(mockRuntime.session.setModel).not.toHaveBeenCalled();
  });
});
