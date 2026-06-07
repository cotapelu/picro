/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock clipboardy before importing InkApp
vi.mock('clipboardy', () => ({
  default: {
    read: vi.fn().mockResolvedValue(''),
  },
}));

// Mock ink's useInput to avoid real terminal input
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

import { render } from 'ink-testing-library';
import React, { act } from 'react';
import { InkApp } from '../InkApp.js';
import type { AgentSessionRuntimeInterface } from '../../../runtime/index.js';

// Helper to create a mock runtime
function createMockRuntime(overrides: any = {}): AgentSessionRuntimeInterface {
  const defaultSession = {
    messages: [],
    isStreaming: false,
    thinkingLevel: 'medium',
    model: { id: 'test-model', provider: 'test' },
    prompt: vi.fn().mockResolvedValue(undefined),
    abort: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    getSteeringMessages: vi.fn().mockReturnValue([]),
    getFollowUpMessages: vi.fn().mockReturnValue([]),
    getToolDefinition: vi.fn(),
    cycleThinkingLevel: vi.fn().mockReturnValue('high'),
    setModel: vi.fn().mockResolvedValue(undefined),
    sessionManager: {
      getSessionName: vi.fn().mockReturnValue('Test Session'),
      getEntries: vi.fn().mockReturnValue([]),
      getCwd: vi.fn().mockReturnValue('/test/cwd'),
    },
    resourceLoader: { reload: vi.fn().mockResolvedValue(undefined) },
    getPerformanceStats: vi.fn().mockReturnValue({ sampleCount: 10, avgCpuUserMS: 2.5, avgRSSMB: 100 }),
    getSessionStats: vi.fn().mockReturnValue({ sessionFile: '/tmp/session.jsonl', userMessages: 1, assistantMessages: 1, toolCalls: 0, toolResults: 0, tokens: { input: 10, output: 5, total: 15 }, cost: 0.001 }),
  };

  return {
    cwd: '/test/cwd',
    thinkingLevel: 'medium',
    session: { ...defaultSession, ...(overrides.session || {}) },
    settings: {
      get: vi.fn((key: string) => {
        if (key === 'defaultThinkingLevel') return 'medium';
        if (key === 'terminal.showImages') return true;
        if (key === 'terminal.imageWidthCells') return 60;
        return undefined;
      }),
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    },
    setThinkingLevel: vi.fn(),
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    fork: vi.fn().mockResolvedValue(undefined),
    newSession: vi.fn().mockResolvedValue(undefined),
    switchSession: vi.fn().mockResolvedValue({ cancelled: false }),
    ...overrides,
  };
}

describe('InkApp Integration', () => {
  let runtime: AgentSessionRuntimeInterface;

  beforeEach(() => {
    vi.clearAllMocks();
    runtime = createMockRuntime();
  });

  it('handles full assistant message streaming and tool execution', () => {
    const { rerender, lastFrame } = render(<InkApp runtime={runtime} />);
    const subscribe = runtime.session.subscribe as any;
    const handler = subscribe.mock.calls[0][0];

    // Start assistant message
    act(() => {
      handler({ type: 'message_start', message: { role: 'assistant' } });
    });
    rerender(<InkApp runtime={runtime} />);
    let output = lastFrame();
    expect(output).toContain('Assistant');

    // Send an update with content
    act(() => {
      handler({
        type: 'message_update',
        message: { role: 'assistant', content: 'Hello, let me check that.' },
      });
    });
    rerender(<InkApp runtime={runtime} />);
    output = lastFrame();
    expect(output).toContain('Hello, let me check that.');

    // Tool call start
    act(() => {
      handler({
        type: 'tool_execution_start',
        toolCallId: 'tool1',
        toolName: 'get_weather',
        args: { city: 'Paris' },
      });
    });
    rerender(<InkApp runtime={runtime} />);
    output = lastFrame();
    expect(output).toContain('get_weather');
    expect(output).toContain('running');

    // Tool call end with result
    act(() => {
      handler({
        type: 'tool_execution_end',
        toolCallId: 'tool1',
        result: { temp: 22, unit: 'C' },
        isError: false,
      });
    });
    rerender(<InkApp runtime={runtime} />);
    output = lastFrame();
    expect(output).toContain('get_weather');
    expect(output).toContain('done');

    // End assistant message
    act(() => {
      handler({
        type: 'message_end',
        message: { role: 'assistant', content: 'The weather in Paris is 22°C.' },
      });
    });
    rerender(<InkApp runtime={runtime} />);
    output = lastFrame();
    expect(output).toContain('The weather in Paris is 22°C.');
  });

  it('displays retry status when auto_retry_start occurs', () => {
    const { rerender, lastFrame } = render(<InkApp runtime={runtime} />);
    const subscribe = runtime.session.subscribe as any;
    const handlers = subscribe.mock.calls.map(call => call[0]);
    expect(handlers.length).toBeGreaterThanOrEqual(2); // useRuntime + InkApp

    // Emit auto_retry_start to all subscribers
    act(() => {
      for (const h of handlers) {
        h({ type: 'auto_retry_start', attempt: 1, maxAttempts: 3, delayMs: 3000 });
      }
    });
    rerender(<InkApp runtime={runtime} />);
    const output = lastFrame();
    // Status line should show retry info
    expect(output).toContain('Retrying');
    // Countdown may show '3s' or similar
    expect(output).toMatch(/in\s+\d+s/);
  });

  it('clears retry status after auto_retry_end', () => {
    const { rerender, lastFrame } = render(<InkApp runtime={runtime} />);
    const subscribe = runtime.session.subscribe as any;
    const handlers = subscribe.mock.calls.map(call => call[0]);

    // Trigger a retry start
    act(() => {
      for (const h of handlers) {
        h({ type: 'auto_retry_start', attempt: 1, maxAttempts: 3, delayMs: 3000 });
      }
    });
    rerender(<InkApp runtime={runtime} />);
    // Verify retry status is present (optional)
    let output = lastFrame();
    expect(output).toContain('Retrying');

    // Then end the retry
    act(() => {
      for (const h of handlers) {
        h({ type: 'auto_retry_end' });
      }
    });
    rerender(<InkApp runtime={runtime} />);
    output = lastFrame();
    // Retry status should no longer be present
    expect(output).not.toContain('Retrying');
  });
});
