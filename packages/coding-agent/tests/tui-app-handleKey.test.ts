import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatUI } from '../src/tui-app.js';
import type { BaseAgent } from '@picro/agent';
import { AgentMemoryApp } from '@picro/memory';
import { TerminalUI } from '@picro/tui';
import { ConfigManager } from '../src/config/config.js';

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
      on: vi.fn((event: string, cb: any) => () => {}),
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

describe('ChatUI handleKey', () => {
  let tui: TerminalUI;
  let agent: BaseAgent;
  let memory: AgentMemoryApp;
  let chat: ChatUI;
  let onExit: vi.Mock;

  beforeEach(() => {
    tui = createMockTUI();
    agent = createMockAgent();
    memory = createMockMemory();
    onExit = vi.fn();
    // Config mock
    const configSpy = {
      getSettings: vi.fn().mockReturnValue({ toolTimeout: 30000, debugMode: false }),
      getSetting: vi.fn().mockImplementation((k: any) => {
        const s: any = { toolTimeout: 30000, debugMode: false };
        return s[k];
      }),
      setSetting: vi.fn(),
      getCurrentProvider: vi.fn().mockReturnValue('test-provider'),
      getCurrentModel: vi.fn().mockReturnValue('test-model'),
    };
    vi.spyOn(ConfigManager, 'getInstance').mockReturnValue(configSpy as any);

    chat = new ChatUI(agent, memory, tui, mockTheme, [], onExit);
  });

  describe('key handling', () => {
    it('should call onExit on Ctrl+C when agent not running', () => {
      (chat as any).isAgentRunning = false;
      const keyEvent = { raw: '\x03', name: 'c', modifiers: { ctrl: true } } as any;
      (chat as any).handleKey(keyEvent);
      expect(onExit).toHaveBeenCalled();
    });

    it('should abort agent on Ctrl+C when running', () => {
      (chat as any).isAgentRunning = true;
      (agent as any).abort = vi.fn();
      const keyEvent = { raw: '\x03', name: 'c', modifiers: { ctrl: true } } as any;
      (chat as any).handleKey(keyEvent);
      expect((agent as any).abort).toHaveBeenCalled();
      expect((chat as any).status).toBe('Cancelling...');
    });

    it('should copy last code block on Enter when input empty', () => {
      (chat as any).inputBuffer = '';
      (chat as any).isFocused = false;
      const copySpy = vi.spyOn(chat as any, 'copyLastCodeBlock');
      const keyEvent = { raw: '\r', name: 'Enter', modifiers: {} } as any;
      (chat as any).handleKey(keyEvent);
      expect(copySpy).toHaveBeenCalled();
    });

    it('should process input on Enter when buffer non-empty', () => {
      (chat as any).inputBuffer = 'test input';
      (chat as any).isFocused = false;
      const processSpy = vi.spyOn(chat as any, 'processAgentResponse');
      const keyEvent = { raw: '\r', name: 'Enter', modifiers: {} } as any;
      (chat as any).handleKey(keyEvent);
      expect(processSpy).toHaveBeenCalledWith('test input');
      // inputBuffer should be cleared
      expect((chat as any).inputBuffer).toBe('');
    });

    it('should insert newline on Ctrl+Enter', () => {
      (chat as any).inputBuffer = 'line1';
      (chat as any).cursorPos = 5;
      const keyEvent = { raw: '\r', name: 'Enter', modifiers: { ctrl: true } } as any;
      (chat as any).handleKey(keyEvent);
      expect((chat as any).inputBuffer).toBe('line1\n');
      expect((chat as any).cursorPos).toBe(6);
    });

    it('should navigate command history on ArrowUp when input empty', () => {
      (chat as any).commandHistory = ['cmd1', 'cmd2'];
      (chat as any).cursorPos = 0;
      (chat as any).inputBuffer = '';
      // Simulate that a command was just executed: historyIndex is set to length
      (chat as any).historyIndex = (chat as any).commandHistory.length;
      const keyEvent = { name: 'ArrowUp', raw: '\x1b[A' } as any;
      (chat as any).handleKey(keyEvent);
      expect((chat as any).inputBuffer).toBe('cmd2');
      expect((chat as any).cursorPos).toBe(4);
    });
  });
});
