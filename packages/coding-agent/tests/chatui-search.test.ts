import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatUI } from '../src/tui-app.js';
import type { BaseAgent } from '@picro/agent';
import { AgentMemoryApp } from '@picro/memory';
import type { TerminalUI } from '@picro/tui';

// Mock TerminalUI
function createMockTUI(): TerminalUI {
  return {
    showPanel: vi.fn().mockReturnValue({ close: vi.fn() }),
    requestRender: vi.fn(),
    stop: vi.fn(),
    append: vi.fn(),
    setFocus: vi.fn(),
    addKeyHandler: vi.fn(),
  } as any;
}

// Mock Agent
function createMockAgent(): BaseAgent {
  return {
    getEmitter: () => ({
      on: vi.fn((event: string, cb: any) => {
        // Store callbacks for manual invocation if needed
        return () => {}; // unsubscribe
      }),
      off: vi.fn(),
      emit: vi.fn(),
    }),
    run: vi.fn().mockResolvedValue({ finalAnswer: 'test', success: true, totalRounds: 1 }),
    getState: vi.fn(),
    getTools: vi.fn().mockReturnValue([]),
    abort: vi.fn(),
  } as any;
}

// Mock Memory
function createMockMemory(): AgentMemoryApp {
  return {
    init: vi.fn(),
    recallWithScores: vi.fn().mockResolvedValue({ memories: [], scores: [] }),
    getMemoryCount: vi.fn().mockReturnValue(0),
    getStats: vi.fn().mockReturnValue({}),
    clear: vi.fn(),
  } as any;
}

// Mock theme
const mockTheme = {
  accent: '',
  green: '',
  red: '',
  yellow: '',
  cyan: '',
  magenta: '',
  blue: '',
  dim: '',
  bold: '',
  reset: '',
};

describe('ChatUI Search Panel', () => {
  let tui: TerminalUI;
  let agent: BaseAgent;
  let memory: AgentMemoryApp;
  let chat: ChatUI;

  beforeEach(() => {
    tui = createMockTUI();
    agent = createMockAgent();
    memory = createMockMemory();

    chat = new ChatUI(agent, memory, tui, mockTheme, () => {});
  });

  it('should start with no search panel', () => {
    // Access private via any
    expect((chat as any).searchPanelHandle).toBeNull();
  });

  it('should open search panel', () => {
    (chat as any).showSearchPanel();
    expect((tui as any).showPanel).toHaveBeenCalled();
    expect((chat as any).searchPanelHandle).not.toBeNull();
  });

  it('should close search panel on second call', () => {
    (chat as any).showSearchPanel();
    const handle = (chat as any).searchPanelHandle;
    expect(handle).not.toBeNull();

    // second call should close
    (chat as any).showSearchPanel();
    expect(handle.close).toHaveBeenCalled();
    expect((chat as any).searchPanelHandle).toBeNull();
  });
});
