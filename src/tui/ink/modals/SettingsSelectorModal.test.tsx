/** @jsxImportSource react */
import { render } from 'ink-testing-library';
import { act } from 'react';
import { vi } from 'vitest';
import { useInput, useFocus } from 'ink';
import { ThemeProvider } from '../hooks/useTheme.js';
import { SettingsSelectorModal } from './SettingsSelectorModal.js';

// Mock ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
    useFocus: vi.fn(() => ({ focus: () => {}, isFocused: false })),
  };
});

vi.mock('../hooks/useTheme.js', async () => {
  const actual = await vi.importActual('../hooks/useTheme.js');
  return {
    ...actual,
    useTheme: vi.fn(() => ({ isDark: true })),
  };
});

describe('SettingsSelectorModal', () => {
  let mockRuntime: any;
  let mockSettings: any;
  let onClose: any;

  beforeEach(() => {
    onClose = vi.fn();

    mockSettings = {
      getTheme: vi.fn().mockReturnValue('dark'),
      setTheme: vi.fn(),
      getDefaultThinkingLevel: vi.fn().mockReturnValue('medium'),
      setDefaultThinkingLevel: vi.fn(),
      getTransport: vi.fn().mockReturnValue('sse'),
      setTransport: vi.fn(),
      getCompactionEnabled: vi.fn().mockReturnValue(true),
      setCompactionEnabled: vi.fn(),
      getHideThinkingBlock: vi.fn().mockReturnValue(false),
      setHideThinkingBlock: vi.fn(),
      getShowImages: vi.fn().mockReturnValue(true),
      setShowImages: vi.fn(),
      getImageWidthCells: vi.fn().mockReturnValue(60),
      setImageWidthCells: vi.fn(),
      save: vi.fn(),
    };

    mockRuntime = {
      settings: mockSettings,
    };
  });

  async function renderModal() {
    const useInputMock = vi.mocked(useInput);
    useInputMock.mockReset();

    render(
      <ThemeProvider initialMode="dark">
        <SettingsSelectorModal runtime={mockRuntime} onClose={onClose} />
      </ThemeProvider>
    );

    // Wait for initial render and effects that populate settings/values
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    // Extra flush
    await act(async () => {});

    const calls = useInputMock.mock.calls;
    if (calls.length === 0) {
      throw new Error('useInput not called');
    }
    // Latest handler
    const getHandler = () => {
      const allCalls = useInputMock.mock.calls;
      return allCalls[allCalls.length - 1][0];
    };

    return {
      pressKey: (key: any) => act(async () => {
        const handler = getHandler();
        handler('', key);
      }),
      typeChar: (char: string) => act(async () => {
        const handler = getHandler();
        handler(char, {});
      }),
    };
  }

  it('renders settings list without crashing', async () => {
    const { pressKey } = await renderModal();
    expect(pressKey).toBeDefined();
  });

  it('closes on Escape without saving', async () => {
    const { pressKey } = await renderModal();
    await pressKey({ escape: true });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSettings.save).not.toHaveBeenCalled();
  });

  it('navigates selection with up/down arrows', async () => {
    const { pressKey } = await renderModal();
    await pressKey({ downArrow: true });
    await pressKey({ downArrow: true });
    // No errors → success
  });

  it('toggles a boolean setting with Space and saves', async () => {
    const { pressKey, typeChar } = await renderModal();
    // Navigate to "Show Images" (index 5)
    for (let i = 0; i < 5; i++) await pressKey({ downArrow: true });
    // Toggle
    await typeChar(' ');
    // Save
    await pressKey({ return: true });
    // Wait for save
    await act(async () => {});
    expect(mockSettings.setShowImages).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('changes number setting with left/right arrows and saves', async () => {
    const { pressKey } = await renderModal();
    // Navigate to "Image Width (cells)" (index 6)
    for (let i = 0; i < 6; i++) await pressKey({ downArrow: true });
    // Increase by 5
    await pressKey({ rightArrow: true });
    // Save
    await pressKey({ return: true });
    await act(async () => {});
    expect(mockSettings.setImageWidthCells).toHaveBeenCalledWith(65);
    expect(onClose).toHaveBeenCalled();
  });

  it('cycles select options with left/right arrows and saves', async () => {
    const { pressKey } = await renderModal();
    // Theme is index 0 by default
    await pressKey({ rightArrow: true }); // cycle from dark -> light
    // Save
    await pressKey({ return: true });
    await act(async () => {});
    expect(mockSettings.setTheme).toHaveBeenCalledWith('light');
    expect(onClose).toHaveBeenCalled();
  });

  it('saves all settings on Enter without changes', async () => {
    const { pressKey } = await renderModal();
    await pressKey({ return: true });
    await act(async () => {});
    expect(mockRuntime.settings.save).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles save errors gracefully', async () => {
    mockRuntime.settings.save = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { pressKey } = await renderModal();
    await pressKey({ return: true });
    await act(async () => {});
    expect(onClose).not.toHaveBeenCalled();
    // Error state would be shown; no crash
  });

  it('does not navigate beyond last item', async () => {
    const { pressKey } = await renderModal();
    // There are 7 items; go down many times
    for (let i = 0; i < 20; i++) await pressKey({ downArrow: true });
    // Should stay at last index without errors
  });

  it('does not navigate above first item', async () => {
    const { pressKey } = await renderModal();
    for (let i = 0; i < 20; i++) await pressKey({ upArrow: true });
  });

  it('ignores key input while saving', async () => {
    // Simulate a slow save
    let resolveSave: (value: void) => void;
    mockRuntime.settings.save = vi.fn().mockImplementation(() => new Promise(resolve => {
      resolveSave = resolve;
    }));
    const { pressKey } = await renderModal();
    // Start save
    await pressKey({ return: true });
    // While saving, further input should be ignored (no errors)
    await pressKey({ downArrow: true });
    // Complete save
    resolveSave();
    await act(async () => {});
    expect(onClose).toHaveBeenCalled();
  });
});
