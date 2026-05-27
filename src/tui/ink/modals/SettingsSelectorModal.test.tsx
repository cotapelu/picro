import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SettingsSelectorModal } from './SettingsSelectorModal';
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
      settings: {
        get: vi.fn((key: string) => {
          if (key === 'theme') return 'dark';
          if (key === 'autoCompact') return false;
          return undefined;
        }),
        set: vi.fn(),
        save: vi.fn(),
      },
    } as any,
  } as AgentSessionRuntimeInterface;
}

describe('SettingsSelectorModal', () => {
  it('renders without crashing', () => {
    const runtime = createMockRuntime();
    const onClose = vi.fn();
    const instance = render(<SettingsSelectorModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
