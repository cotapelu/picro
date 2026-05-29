import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ModelSelectorModal } from './ModelSelectorModal';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: { accent: 'cyan', foreground: 'white', selectedForeground: 'white', dim: 'gray', success: 'green', warning: 'yellow' },
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    cwd: '/tmp',
    session: {} as any,
    services: {} as any,
  } as any;
}

describe('ModelSelectorModal', () => {
  it('renders without crashing', () => {
    const runtime = createMockRuntime();
    const onClose = vi.fn();
    const instance = render(<ModelSelectorModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
