import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { ModelSelectorModal } from './ModelSelectorModal';
import { ThemeProvider } from '../hooks/useTheme.js';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

function createMockRuntime(): AgentSessionRuntimeInterface {
  return {
    cwd: '/tmp',
    listSessions: async () => [],
    switchSession: async () => ({ cancelled: false }),
    session: {} as any,
    settings: {} as any,
    services: {
      modelRegistry: {
        getAvailable: async () => [],
        refresh: async () => {},
      },
    },
  } as any;
}

describe('ModelSelectorModal', () => {
  it('renders without crashing', () => {
    const runtime = createMockRuntime();
    const { stdin } = render(
      <ThemeProvider initialMode="dark">
        <ModelSelectorModal runtime={runtime} onClose={() => {}} />
      </ThemeProvider>
    );
    expect(stdin).toBeDefined();
  });
});
