import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SettingsSelectorModal } from './SettingsSelectorModal';
import { ThemeProvider } from '../hooks/useTheme.js';
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
  } as any;
}

describe('SettingsSelectorModal', () => {
  it('renders without crashing', () => {
    const runtime = createMockRuntime();
    const onClose = vi.fn();
    const instance = render(
      <ThemeProvider initialMode="dark">
        <SettingsSelectorModal runtime={runtime} onClose={onClose} />
      </ThemeProvider>
    );
    expect(instance.stdin).toBeDefined();
  });
});
