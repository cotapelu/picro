/** @jsxImportSource react */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React, { act } from 'react';
import { InkApp } from '../InkApp.js';

// Mock clipboardy required by InkApp
vi.mock('clipboardy', () => ({
  default: {
    read: vi.fn().mockResolvedValue(''),
  },
}));

// Mock ink's useInput to avoid terminal input errors in test env
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useInput: vi.fn(),
  };
});

// Mock useModal to capture setActiveModal calls
let setActiveModalMock: any = null;
vi.mock('../hooks/useModal', () => ({
  useModal: () => {
    if (!setActiveModalMock) {
      setActiveModalMock = vi.fn();
    }
    return { activeModal: null, setActiveModal: setActiveModalMock };
  },
}));

// Capture InputBox props across renders for inspection
const inputBoxPropsHistory: any[] = [];
vi.mock('../components/InputBox/InputBox', () => ({
  InputBox: (props: any) => {
    inputBoxPropsHistory.push(props);
    return React.null;
  },
}));

// Create a comprehensive mock runtime
function createMockRuntime(overrides: any = {}): any {
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
    settingsManager: {
      getDoubleEscapeAction: vi.fn().mockReturnValue('tree'),
    },
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

describe('InkApp Double-Escape Feature', () => {
  let runtime: any;

  beforeEach(() => {
    vi.clearAllMocks();
    inputBoxPropsHistory.length = 0;
    setActiveModalMock = null;
    vi.useFakeTimers();
    runtime = createMockRuntime();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens tree selector on double-escape when action is tree', () => {
    render(<InkApp runtime={runtime} />);
    expect(inputBoxPropsHistory.length).toBeGreaterThan(0);
    const latestProps = inputBoxPropsHistory[inputBoxPropsHistory.length - 1];
    expect(latestProps.onEscape).toBeDefined();

    const onEscape = latestProps.onEscape;

    // First escape: records time, no modal
    onEscape();
    expect(setActiveModalMock).not.toHaveBeenCalled();

    // Second escape within 500ms
    vi.advanceTimersByTime(400);
    onEscape();

    expect(setActiveModalMock).toHaveBeenCalledTimes(1);
    expect(setActiveModalMock).toHaveBeenCalledWith({ type: 'tree-selector' });
  });

  it('opens fork selector on double-escape when action is fork', () => {
    runtime.session.settingsManager.getDoubleEscapeAction.mockReturnValue('fork');

    render(<InkApp runtime={runtime} />);
    const onEscape = inputBoxPropsHistory[inputBoxPropsHistory.length - 1].onEscape;

    onEscape();
    vi.advanceTimersByTime(400);
    onEscape();

    expect(setActiveModalMock).toHaveBeenCalledTimes(1);
    expect(setActiveModalMock).toHaveBeenCalledWith({ type: 'user-message-selector' });
  });

  it('does not open modal on single escape (no double-tap)', () => {
    render(<InkApp runtime={runtime} />);
    const onEscape = inputBoxPropsHistory[inputBoxPropsHistory.length - 1].onEscape;

    onEscape();

    // Wait longer than double-tap window
    vi.advanceTimersByTime(1000);
    // No modal should be opened
    expect(setActiveModalMock).not.toHaveBeenCalled();
  });

  it('does not open modal if second escape after timeout', () => {
    render(<InkApp runtime={runtime} />);
    const onEscape = inputBoxPropsHistory[inputBoxPropsHistory.length - 1].onEscape;

    onEscape(); // first
    vi.advanceTimersByTime(600); // >500ms
    onEscape(); // second

    expect(setActiveModalMock).not.toHaveBeenCalled();
  });

  it('does not open modal when doubleEscapeAction is none', () => {
    runtime.session.settingsManager.getDoubleEscapeAction.mockReturnValue('none');
    render(<InkApp runtime={runtime} />);
    const onEscape = inputBoxPropsHistory[inputBoxPropsHistory.length - 1].onEscape;

    onEscape();
    vi.advanceTimersByTime(400);
    onEscape();

    expect(setActiveModalMock).not.toHaveBeenCalled();
  });

  it('clears input when escape pressed with non-empty text', () => {
    render(<InkApp runtime={runtime} />);
    // Get the latest InputBox props (which have empty value)
    let props = inputBoxPropsHistory[inputBoxPropsHistory.length - 1];
    expect(props.value).toBe('');

    // Simulate typing some text
    act(() => {
      props.onChange('hello');
    });

    // After change, latest props should reflect new value
    const afterInputProps = inputBoxPropsHistory[inputBoxPropsHistory.length - 1];
    expect(afterInputProps.value).toBe('hello');

    // Press Escape
    act(() => {
      afterInputProps.onEscape();
    });

    // After Escape, latest props should have empty value
    const afterEscapeProps = inputBoxPropsHistory[inputBoxPropsHistory.length - 1];
    expect(afterEscapeProps.value).toBe('');
    // Also ensure no modal opened
    expect(setActiveModalMock).not.toHaveBeenCalled();
  });
});
