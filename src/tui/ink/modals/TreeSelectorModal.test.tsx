import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TreeSelectorModal } from './TreeSelectorModal';

// Mock theme hook
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      accent: 'cyan',
      foreground: 'white',
      selectedForeground: 'white',
      dim: 'gray',
    },
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

function createMockRuntime() {
  return {
    cwd: '/tmp',
    session: {
      sessionManager: {
        getBranch: () => [{ id: 'main' }, { id: 'dev' }],
      },
    } as any,
  } as any;
}

describe('TreeSelectorModal', () => {
  it('renders without crashing', () => {
    const runtime = createMockRuntime();
    const onClose = vi.fn();
    const instance = render(<TreeSelectorModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
