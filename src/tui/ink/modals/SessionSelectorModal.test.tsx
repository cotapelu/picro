import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionSelectorModal } from './SessionSelectorModal';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

// Mock theme hook
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      accent: 'cyan',
      foreground: 'white',
      selectedForeground: 'white',
      dim: 'gray',
      success: 'green',
      warning: 'yellow',
    },
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    cwd: '/tmp',
    session: {
      sessionManager: {
        list: async () => [],
        listAll: async () => [],
      },
    } as any,
    settings: {} as any,
  } as AgentSessionRuntimeInterface;
}

describe('SessionSelectorModal', () => {
  it('renders without crashing when no sessions', () => {
    const runtime = createMockRuntime();
    const onClose = vi.fn();
    const instance = render(<SessionSelectorModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
