import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ScopedModelsSelectorModal } from './ScopedModelsSelectorModal';
import type { AgentSessionRuntimeInterface } from '../../../runtime.js';

// Mock theme context
vi.mock('../hooks/useTheme', () => ({
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

function createMockRuntime(models: any[] = []) {
  const runtime = {
    session: {
      modelRegistry: {
        getAvailable: async () => models,
      },
    },
    settings: {
      get: vi.fn((key: string) => {
        if (key === 'scopedModelsEnabled') return true;
        if (key === 'scopedModelIds') return models.map((m) => m.provider + '/' + m.id).slice(0, 3);
        return undefined;
      }),
      set: vi.fn(),
      save: vi.fn(),
    },
  } as unknown as AgentSessionRuntimeInterface;
  return runtime;
}

describe('ScopedModelsSelectorModal', () => {
  const mockModels = [
    { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
    { provider: 'anthropic', id: 'claude-3', name: 'Claude 3' },
  ];

  it('should render without crashing', () => {
    const runtime = createMockRuntime(mockModels);
    const onClose = vi.fn();
    // If render throws, test will fail automatically
    const instance = render(<ScopedModelsSelectorModal runtime={runtime} onClose={onClose} />);
    // Basic sanity: instance should have stdin and stdout
    expect(instance.stdin).toBeDefined();
    expect(instance.stdout).toBeDefined();
  });
});
