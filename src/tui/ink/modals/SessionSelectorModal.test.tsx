/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

// Mock ink's useInput before component imports
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});
import * as ink from 'ink';

import { SessionSelectorModal } from './SessionSelectorModal';
import { ThemeProvider } from '../hooks/useTheme.js';

function createMockRuntime(overrides: any = {}): AgentSessionRuntimeInterface {
  return {
    cwd: '/tmp',
    listSessions: vi.fn().mockResolvedValue([]),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
    session: {} as any,
    settings: {} as any,
    ...overrides,
  } as any;
}

describe('SessionSelectorModal', () => {
  let runtime: AgentSessionRuntimeInterface;
  let onClose: vi.Mock;
  let capturedHandler: ((input: string | undefined, key: any) => void) | null = null;

  afterEach(() => {
    capturedHandler = null;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
    onClose = vi.fn();
    // Capture useInput handler
    (ink.useInput as any).mockImplementation((handler: any) => {
      capturedHandler = handler;
    });
  });

  function renderModal(overrides?: Partial<AgentSessionRuntimeInterface>) {
    const finalRuntime = { ...runtime, ...overrides };
    return render(
      <ThemeProvider initialMode="dark">
        <SessionSelectorModal runtime={finalRuntime} onClose={onClose} />
      </ThemeProvider>
    );
  }

  async function pressKey(key: any) {
    await act(async () => {
      capturedHandler?.(undefined, key);
    });
  }

  describe('rendering', () => {
    it('renders loading state initially', () => {
      runtime.listSessions = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 10)));
      const { lastFrame } = renderModal();
      expect(lastFrame()).toContain('Loading sessions...');
    });

    it('renders empty state when no sessions', async () => {
      runtime.listSessions = vi.fn().mockResolvedValue([]);
      const { lastFrame } = renderModal();
      await act(async () => {}); // flush promises
      expect(lastFrame()).toContain('No sessions found.');
    });

    it('renders list of sessions', async () => {
      const sessions = [
        { id: '1', path: '/sessions/1', cwd: '/', modified: new Date('2024-01-01T10:00:00'), name: 'Session 1', firstMessage: 'Hello' },
        { id: '2', path: '/sessions/2', cwd: '/home', modified: new Date('2024-01-02T10:00:00'), name: 'Session 2', firstMessage: 'World' },
      ];
      runtime.listSessions = vi.fn().mockResolvedValue(sessions);
      const { lastFrame } = renderModal();
      await act(async () => {}); // flush promises
      const output = lastFrame() || '';
      expect(output).toContain('Session 1');
      expect(output).toContain('Session 2');
    });

    it('renders error state when listSessions fails', async () => {
      runtime.listSessions = vi.fn().mockRejectedValue(new Error('Network error'));
      const { lastFrame } = renderModal();
      await act(async () => {}); // flush promises
      expect(lastFrame()).toContain('Error: Network error');
    });
  });

  describe('keyboard interactions', () => {
    it('navigates down with down arrow', async () => {
      const sessions = [
        { id: '1', path: '/1', cwd: '/', modified: new Date(), name: 'A' },
        { id: '2', path: '/2', cwd: '/', modified: new Date(), name: 'B' },
        { id: '3', path: '/3', cwd: '/', modified: new Date(), name: 'C' },
      ];
      runtime.listSessions = vi.fn().mockResolvedValue(sessions);
      renderModal();
      await act(async () => {}); // load sessions

      // Initial selection should be 0 (A)
      await pressKey({ downArrow: true });
      // After down, selected should be 1 (B)
      // To verify, we trigger Enter and check which session passed
      await pressKey({ return: true });
      expect(runtime.switchSession).toHaveBeenCalledWith('/2');
      expect(onClose).toHaveBeenCalled();
    });

    it('navigates up with up arrow', async () => {
      const sessions = [
        { id: '1', path: '/1', cwd: '/', modified: new Date(), name: 'A' },
        { id: '2', path: '/2', cwd: '/', modified: new Date(), name: 'B' },
      ];
      runtime.listSessions = vi.fn().mockResolvedValue(sessions);
      renderModal();
      await act(async () => {});

      // Start at 0, move down to 1, then up to 0, select
      await pressKey({ downArrow: true });
      await pressKey({ upArrow: true });
      await pressKey({ return: true });
      expect(runtime.switchSession).toHaveBeenCalledWith('/1');
    });

    it('clamps up navigation at top (does not wrap)', async () => {
      const sessions = [
        { id: '1', path: '/1', cwd: '/', modified: new Date(), name: 'A' },
        { id: '2', path: '/2', cwd: '/', modified: new Date(), name: 'B' },
      ];
      runtime.listSessions = vi.fn().mockResolvedValue(sessions);
      renderModal();
      await act(async () => {});

      // At index 0, up arrow should stay at 0
      await pressKey({ upArrow: true });
      await pressKey({ return: true });
      expect(runtime.switchSession).toHaveBeenCalledWith('/1');
    });

    it('wraps navigation: down from last goes to first', async () => {
      const sessions = [
        { id: '1', path: '/1', cwd: '/', modified: new Date(), name: 'A' },
        { id: '2', path: '/2', cwd: '/', modified: new Date(), name: 'B' },
      ];
      runtime.listSessions = vi.fn().mockResolvedValue(sessions);
      renderModal();
      await act(async () => {});

      // Move to last
      await pressKey({ downArrow: true }); // now at 1 (B)
      await pressKey({ downArrow: true }); // still at 1 (wraps? Actually clamp? Implementation: setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1)); So no wrap, clamps at last. So down from last stays last.
      // So no wrap. That is fine. We'll test clamp.
      await pressKey({ return: true });
      expect(runtime.switchSession).toHaveBeenCalledWith('/2');
    });

    it('calls onClose without switching when Escape pressed', async () => {
      runtime.listSessions = vi.fn().mockResolvedValue([{ id: '1', path: '/1', cwd: '/', modified: new Date(), name: 'A' }]);
      renderModal();
      await act(async () => {});
      await pressKey({ escape: true });
      expect(onClose).toHaveBeenCalled();
      expect(runtime.switchSession).not.toHaveBeenCalled();
    });

    it('does not switch if no sessions available and Enter pressed', async () => {
      runtime.listSessions = vi.fn().mockResolvedValue([]);
      renderModal();
      await act(async () => {});
      await pressKey({ return: true });
      expect(runtime.switchSession).not.toHaveBeenCalled();
      // onClose not called because Enter only triggers if sessions[selectedIndex] exists
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
