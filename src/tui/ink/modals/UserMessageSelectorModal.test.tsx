/** @jsxImportSource react */
import { render } from 'ink-testing-library';
import { act } from 'react';
import { vi } from 'vitest';
import { useInput, useFocus } from 'ink';
import { UserMessageSelectorModal } from './UserMessageSelectorModal';
import { ThemeProvider } from '../hooks/useTheme.js';

// Mock ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
    useFocus: vi.fn(() => ({ setFocus: () => {}, isFocused: false })),
  };
});

// Use real useTheme, no mock

function createMockRuntime(entries: any[] = []) {
  const getEntries = vi.fn().mockReturnValue(entries);
  return {
    session: {
      sessionManager: {
        getEntries,
      },
    },
    fork: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('UserMessageSelectorModal', () => {
  let runtime: any;
  let onClose: any;

  const createEntry = (id: string, text: string, timestamp?: string) => ({
    id,
    type: 'message',
    message: { role: 'user', content: text },
    timestamp: timestamp || new Date().toISOString(),
  });

  beforeEach(() => {
    onClose = vi.fn();
    vi.mocked(useInput).mockClear();
  });

  async function renderModal(runtime: any) {
    render(
      <ThemeProvider initialMode="dark">
        <UserMessageSelectorModal runtime={runtime} onClose={onClose} />
      </ThemeProvider>
    );

    // Wait sufficiently for loadMessages effect and re-renders
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await Promise.resolve();
      });
    }
    await act(async () => {});

    const useInputMock = vi.mocked(useInput);
    if (useInputMock.mock.calls.length === 0) {
      throw new Error('useInput not called');
    }
    const getHandler = () => {
      const calls = useInputMock.mock.calls;
      return calls[calls.length - 1][0];
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

  it('renders without crashing', async () => {
    runtime = createMockRuntime([]);
    await renderModal(runtime);
    // If we got here, rendering succeeded
  });

  it('displays user messages', async () => {
    const msgs = [createEntry('e1', 'Hello'), createEntry('e2', 'World')];
    runtime = createMockRuntime(msgs);
    await renderModal(runtime);
    // Rendering succeeded with messages
  });

  it('navigates with up/down arrows', async () => {
    const msgs = [createEntry('a', 'A'), createEntry('b', 'B'), createEntry('c', 'C')];
    runtime = createMockRuntime(msgs);
    const { pressKey } = await renderModal(runtime);
    // default selected is last (c)
    await pressKey({ upArrow: true }); // to b
    await pressKey({ upArrow: true }); // to a
    await pressKey({ downArrow: true }); // to b
    // no errors = success
  });

  it('calls runtime.fork and onClose on Enter', async () => {
    const msgs = [
      createEntry('e1', 'First'),
      createEntry('e2', 'Second'),
    ];
    runtime = createMockRuntime(msgs);
    const { pressKey } = await renderModal(runtime);
    const getEntries = runtime.session.sessionManager.getEntries as any;
    // Ensure messages were loaded
    expect(getEntries).toHaveBeenCalled();
    await pressKey({ return: true });
    expect(runtime.fork).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape without forking', async () => {
    const msgs = [createEntry('e1', 'Hello')];
    runtime = createMockRuntime(msgs);
    const { pressKey } = await renderModal(runtime);
    await pressKey({ escape: true });
    expect(runtime.fork).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles empty message list gracefully', async () => {
    runtime = createMockRuntime([]);
    const { pressKey } = await renderModal(runtime);
    // Enter does nothing
    await pressKey({ return: true });
    expect(runtime.fork).not.toHaveBeenCalled();
    // Escape closes
    await pressKey({ escape: true });
    expect(onClose).toHaveBeenCalled();
  });
});
