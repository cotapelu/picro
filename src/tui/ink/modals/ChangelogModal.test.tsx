import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ChangelogModal } from './ChangelogModal';

// Mock theme hook
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      accent: 'cyan',
      foreground: 'white',
      dim: 'gray',
    },
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

describe('ChangelogModal', () => {
  it('renders without crashing', () => {
    const onClose = vi.fn();
    const instance = render(<ChangelogModal onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
