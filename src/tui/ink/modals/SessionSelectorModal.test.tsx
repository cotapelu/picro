import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from 'react';
import { SessionSelectorModal } from './SessionSelectorModal';
import { ThemeProvider } from '../hooks/useTheme.js';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
    onClose = vi.fn();
  });

  function renderModal(overrides?: Partial<AgentSessionRuntimeInterface>) {
    const finalRuntime = { ...runtime, ...overrides };
    return render(
      <ThemeProvider initialMode="dark">
        <SessionSelectorModal runtime={finalRuntime} onClose={onClose} />
      </ThemeProvider>
    );
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
});
