/** @jsxImportSource react */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { InkApp } from './InkApp';
import type { AgentSessionRuntimeInterface } from '../runtime.js';

function createMinimalRuntime(): AgentSessionRuntimeInterface {
  return {
    cwd: '/tmp',
    session: {
      messages: [],
      model: { id: 'test-model', provider: 'test' },
      thinkingLevel: 'medium',
      sessionManager: {
        getSessionName: () => 'Test Session',
        getCwd: () => '/tmp',
        getEntries: () => [],
      },
      getPerformanceStats: () => null,
      subscribe: (cb: any) => {
        // Immediately call with no event? just return unsubscribe
        return () => {};
      },
      prompt: async () => {},
      abort: () => {},
    } as any,
    settings: {
      get: (key: string) => undefined,
      set: () => {},
      save: async () => {},
    } as any,
    authStorage: {
      getApiKey: async () => undefined,
      setApiKey: async () => {},
      removeApiKey: async () => {},
      getProviders: async () => [],
    } as any,
    copyToClipboard: async () => {},
    dispose: async () => {},
    setThinkingLevel: (level: any) => {},
  } as AgentSessionRuntimeInterface;
}

describe('InkApp', () => {
  it('renders without crashing with minimal runtime', () => {
    const runtime = createMinimalRuntime();
    const instance = render(<InkApp runtime={runtime} />);
    expect(instance.stdin).toBeDefined();
    expect(instance.stdout).toBeDefined();
  });
});
