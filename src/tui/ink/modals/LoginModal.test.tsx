/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';

// Mock useTheme
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: { accent: 'cyan', foreground: 'white', dim: 'gray' },
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}));

import { LoginModal } from './LoginModal';

describe('LoginModal', () => {
  it('renders without crashing', () => {
    const onLogin = vi.fn();
    const onClose = vi.fn();
    const instance = render(<LoginModal onLogin={onLogin} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
