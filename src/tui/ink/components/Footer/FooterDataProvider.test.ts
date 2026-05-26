import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultFooterDataProvider } from './FooterDataProvider';

// Mock runtime for testing
function createMockRuntime(overrides: any = {}) {
  return {
    cwd: '/test/cwd',
    session: {
      messages: [],
      model: { id: 'test-model', provider: 'test' },
      thinkingLevel: 'medium',
      sessionManager: {
        getSessionName: () => 'Test Session',
        getEntries: () => [],
        getCwd: () => '/test/cwd',
      },
      getPerformanceStats: () => null,
    },
    settings: {
      get: (key: string) => {
        if (key === 'autoCompact') return true;
        return undefined;
      },
      save: async () => {},
    },
    ...overrides,
  };
}

describe('DefaultFooterDataProvider', () => {
  let provider: DefaultFooterDataProvider;

  beforeEach(() => {
    provider = new DefaultFooterDataProvider();
  });

  it('should initialize with default values', () => {
    const data = provider.getData();
    expect(data.cwdBasename).toBe('');
    expect(data.sessionName).toBe('');
    expect(data.model).toBe('No model');
    expect(data.thinkingLevel).toBe('off');
    expect(data.tokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
    expect(data.cost).toBe(0);
    expect(data.autoCompactEnabled).toBe(false);
    expect(data.extensionStatuses).toEqual([]);
    expect(data.git).toBeUndefined();
  });

  it('should update from runtime correctly', () => {
    const runtime = createMockRuntime({
      cwd: '/home/user/project',
      thinkingLevel: 'high',
      session: {
        ...createMockRuntime().session,
        model: { id: 'gpt-4', provider: 'openai' },
        sessionManager: {
          getSessionName: () => 'My Session',
          getEntries: () => [
            {
              type: 'message',
              message: { role: 'assistant', usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, cost: { total: 0.01 } } },
            },
          ],
        },
        getPerformanceStats: () => ({ sampleCount: 10, avgCpuUserMS: 2.5, avgRSSMB: 100 }),
      },
    });

    provider.updateFromRuntime(runtime);
    const data = provider.getData();

    expect(data.cwdBasename).toBe('project');
    expect(data.sessionName).toBe('My Session');
    expect(data.model).toBe('gpt-4');
    expect(data.thinkingLevel).toBe('high');
    expect(data.tokens).toEqual({ input: 100, output: 50, cacheRead: 0, cacheWrite: 0 });
    expect(data.cost).toBe(0.01);
    expect(data.performance).toEqual({ avgCpuUserMS: 2.5, avgRSSMB: 100 });
  });

  it('should update git info', () => {
    provider.updateGitInfo({
      branch: 'main',
      dirty: true,
      ahead: 2,
      behind: 0,
    });
    const data = provider.getData();
    expect(data.git).toEqual({
      branch: 'main',
      dirty: true,
      ahead: 2,
      behind: 0,
    });
  });

  it('should clear git info when undefined', () => {
    provider.updateGitInfo({ branch: 'main', dirty: false });
    provider.updateGitInfo(undefined);
    const data = provider.getData();
    expect(data.git).toBeUndefined();
  });

  it('should update extension statuses', () => {
    provider.updateExtensionStatuses([
      { name: 'test-extension', status: 'active' },
    ]);
    const data = provider.getData();
    expect(data.extensionStatuses).toHaveLength(1);
    expect(data.extensionStatuses[0]).toEqual({ name: 'test-extension', status: 'active' });
  });

  it('should update auto compact enabled', () => {
    provider.updateAutoCompactEnabled(true);
    let data = provider.getData();
    expect(data.autoCompactEnabled).toBe(true);

    provider.updateAutoCompactEnabled(false);
    data = provider.getData();
    expect(data.autoCompactEnabled).toBe(false);
  });

  it('should notify listeners on data change', () => {
    const callback = vi.fn();
    provider.onChange(callback);

    provider.updateFromRuntime(createMockRuntime());
    expect(callback).toHaveBeenCalledTimes(1);

    const firstCallData = callback.mock.calls[0][0];
    expect(firstCallData).toMatchObject({
      cwdBasename: 'cwd',
      sessionName: 'Test Session',
      model: 'test-model',
    });
  });

  it('should handle errors gracefully', () => {
    const runtime = createMockRuntime({
      // @ts-expect-error testing error case
      session: null,
    });

    // Should not throw
    provider.updateFromRuntime(runtime);
    const data = provider.getData();
    // Default values preserved
    expect(data.model).toBe('No model');
  });
});
