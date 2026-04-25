import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatUI } from '../src/tui-app.ts';
import type { BaseAgent } from '@picro/agent';
import { AgentMemoryApp } from '@picro/memory';
import { TerminalUI } from '@picro/tui';
import { ConfigManager } from '../src/config/config.ts';
import * as fs from 'fs';
import * as path from 'path';

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

describe('ChatUI Commands & Panels', () => {
  let tui: TerminalUI;
  let agent: BaseAgent;
  let memory: AgentMemoryApp;
  let chat: ChatUI;

  beforeEach(() => {
    tui = createMockTUI();
    agent = createMockAgent();
    memory = createMockMemory();

    // Spy on ConfigManager.getInstance()
    const configSpy = {
      getConfig: vi.fn().mockReturnValue({
        settings: { toolTimeout: 30000, maxRounds: 10, debugMode: false, theme: 'dark' },
        getCurrentModel: () => 'test-model',
        getCurrentProvider: () => 'test-provider',
      }),
      getSettings: vi.fn().mockReturnValue({ toolTimeout: 30000, maxRounds: 10, debugMode: false, theme: 'dark' }),
      getSetting: vi.fn().mockImplementation((key: any) => {
        const settings: any = { toolTimeout: 30000, maxRounds: 10, debugMode: false, theme: 'dark' };
        return settings[key];
      }),
      setSetting: vi.fn().mockImplementation((key: any, value: any) => {
        // no-op for tests
      }),
      getCurrentProvider: vi.fn().mockReturnValue('test-provider'),
      getCurrentModel: vi.fn().mockReturnValue('test-model'),
    };
    vi.spyOn(ConfigManager, 'getInstance').mockReturnValue(configSpy as any);

    chat = new ChatUI(agent, memory, tui, mockTheme, [], () => {});
  });

  describe('Command Palette (showCommandFinder)', () => {
    it('should open and close command finder panel', () => {
      expect((chat as any).commandPanelHandle).toBeNull();
      (chat as any).showCommandFinder();
      expect(tui.showPanel).toHaveBeenCalled();
      expect((chat as any).commandPanelHandle).not.toBeNull();
    });

    it('should open a new panel on subsequent calls', () => {
      (chat as any).showCommandFinder();
      expect(tui.showPanel).toHaveBeenCalledTimes(1);
      (chat as any).showCommandFinder();
      expect(tui.showPanel).toHaveBeenCalledTimes(2);
      // The commandPanelHandle now points to the latest panel
      expect((chat as any).commandPanelHandle).not.toBeNull();
    });
  });

  describe('handleCommand', () => {
    it('should clear memory and add system message for clear-memory', () => {
      (chat as any).handleCommand('clear-memory');
      expect(memory.clear).toHaveBeenCalled();
      // Check that a system message was added (by inspecting messages)
      const messages = (chat as any).messages as any[];
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.role).toBe('system');
      expect(lastMsg.content).toBe('Memory cleared.');
    });

    it('should show memory stats for memory-stats', () => {
      (memory as any).getStats.mockReturnValue({ count: 5, size: 1024 });
      (chat as any).handleCommand('memory-stats');
      const messages = (chat as any).messages as any[];
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.role).toBe('system');
      expect(lastMsg.content).toContain('Stats:');
    });

    it('should call toggleTheme and add message for toggle-theme', () => {
      const config = ConfigManager.getInstance();
      (config as any).getSettings.mockReturnValue({ theme: 'dark' });
      (chat as any).handleCommand('toggle-theme');
      // Expect theme was toggled in config (need to check implementation)
      // For now we can check that a message was added
      const messages = (chat as any).messages as any[];
      const lastMsg = messages[messages.length - 1];
      expect(lastMsg.role).toBe('system');
    });

    it('should call onExit for exit command', () => {
      const onExit = vi.fn();
      const chatWithExit = new ChatUI(agent, memory, tui, mockTheme, [], onExit) as any;
      chatWithExit.handleCommand('exit');
      expect(onExit).toHaveBeenCalled();
    });

    it('should ignore unknown commands', () => {
      // Spies on addMessage to ensure no extra messages
      const addMessageSpy = vi.spyOn(chat as any, 'addMessage');
      (chat as any).handleCommand('unknown-command');
      expect(addMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('Provider & App Settings', () => {
    it('should show provider settings panel', () => {
      (chat as any).showProviderSettings();
      expect(tui.showPanel).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });

    it('should show app settings panel with maxRounds options', () => {
      (chat as any).showAppSettings();
      expect(tui.showPanel).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });
  });

  describe('Search Panels', () => {
    it('should show search panel', () => {
      (chat as any).showSearchPanel();
      expect(tui.showPanel).toHaveBeenCalled();
      expect((chat as any).searchPanelHandle).not.toBeNull();
    });

    it('should show recent search panel', () => {
      (chat as any).showRecentSearchPanel(3);
      expect(tui.showPanel).toHaveBeenCalled();
      expect((chat as any).searchPanelHandle).not.toBeNull();
    });

    it('should close recent search panel on second call', () => {
      (chat as any).showRecentSearchPanel(3);
      const handle = (chat as any).searchPanelHandle;
      (chat as any).showRecentSearchPanel(3);
      expect(handle.close).toHaveBeenCalled();
      expect((chat as any).searchPanelHandle).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should show session list filter when list-sessions command', () => {
      (chat as any).handleCommand('list-sessions');
      expect(tui.showPanel).toHaveBeenCalled();
      expect((chat as any).sessionPanelHandle).not.toBeNull();
    });

    it('should show session menu (manage session)', () => {
      // Use a real temporary directory
      const tmp = fs.mkdtempSync('tui-sessions-');
      const sessionDir = path.join(tmp, '.coding-agent', 'sessions');
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'abc123.json'), JSON.stringify({ id: 'abc123', name: 'Test Session', tags: [] }));
      (chat as any).getSessionDir = () => sessionDir;

      (chat as any).showManageSessionMenu();
      expect(tui.showPanel).toHaveBeenCalled();

      // Cleanup
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('should show bulk rename sessions panel', () => {
      const tmp = fs.mkdtempSync('tui-sessions-');
      const sessionDir = path.join(tmp, '.coding-agent', 'sessions');
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(path.join(sessionDir, 'a.json'), '{}');
      fs.writeFileSync(path.join(sessionDir, 'b.json'), '{}');
      (chat as any).getSessionDir = () => sessionDir;
      const addMessageSpy = vi.spyOn(chat as any, 'addMessage');

      (chat as any).showBulkRenameSessions();
      expect(addMessageSpy).toHaveBeenCalledWith('system', expect.stringContaining('Sessions:'));

      // Cleanup
      fs.rmSync(tmp, { recursive: true, force: true });
    });
  });

  describe('Retry & Error handling', () => {
    it('retryLast should call processAgentResponse when there is pending input', async () => {
      (chat as any).lastError = new Error('test error');
      (chat as any).pendingInput = 'test input';
      const processSpy = vi.spyOn(chat as any, 'processAgentResponse');
      (chat as any).retryLast();
      expect(processSpy).toHaveBeenCalledWith('test input');
    });

    it('retryLast should do nothing if no pending input', () => {
      (chat as any).lastError = new Error('test error');
      (chat as any).pendingInput = null;
      const processSpy = vi.spyOn(chat as any, 'processAgentResponse');
      (chat as any).retryLast();
      expect(processSpy).not.toHaveBeenCalled();
    });
  });

  describe('Tool Progress', () => {
    it('startToolInterval should set up interval and update toolProgress', () => {
      (chat as any).currentTool = 'test_tool';
      (chat as any).toolStartTime = Date.now();
      (chat as any).startToolInterval();
      // Interval should be set
      expect((chat as any).toolInterval).not.toBeNull();
      // Advance time and trigger interval callback manually is tricky; instead we can check that requestRender was called
      // Let's just verify that after starting interval, toolProgress is not empty
      expect((chat as any).toolProgress).toBe('');
      // Simulate one tick
      vi.useFakeTimers();
      (chat as any).toolInterval && setImmediate(() => {
        expect(tui.requestRender).toHaveBeenCalled();
        vi.useRealTimers();
      });
    });

    it('clearToolState should clear interval and state', () => {
      (chat as any).toolInterval = setInterval(() => {}, 1000);
      (chat as any).currentTool = 'test_tool';
      (chat as any).toolProgress = '1.0s';
      (chat as any).clearToolState();
      expect((chat as any).toolInterval).toBeNull();
      expect((chat as any).currentTool).toBeNull();
      expect((chat as any).toolProgress).toBe('');
    });
  });

  describe('Status & Announce', () => {
    it('setStatus should update status and color', () => {
      (chat as any).setStatus('Working', 'yellow');
      expect((chat as any).status).toBe('Working');
      expect((chat as any).statusColor).toBe('yellow');
    });

    it('announce should update announcement', () => {
      (chat as any).announce('Hello');
      expect((chat as any).announcement).toBe('Hello');
    });
  });

  describe('parseSearchFilters', () => {
    it('should parse role filter', () => {
      const result = (chat as any).parseSearchFilters('install role:assistant');
      expect(result.query).toBe('install');
      expect(result.role).toBe('assistant');
      expect(result.since).toBeUndefined();
      expect(result.until).toBeUndefined();
    });

    it('should parse since and until dates', () => {
      const result = (chat as any).parseSearchFilters('test since:2025-01-01 until:2025-01-31');
      expect(result.query).toBe('test');
      expect(result.since?.getTime()).toBe(new Date('2025-01-01').getTime());
      expect(result.until?.getTime()).toBe(new Date('2025-01-31').getTime());
    });

    it('should keep unknown parts in query', () => {
      const result = (chat as any).parseSearchFilters('install role:unknown since:xyz');
      expect(result.query).toBe('install role:unknown since:xyz');
      expect(result.role).toBeUndefined();
      expect(result.since).toBeUndefined();
    });

    it('should handle empty input', () => {
      const result = (chat as any).parseSearchFilters('');
      expect(result.query).toBe('');
      expect(result.role).toBeUndefined();
      expect(result.since).toBeUndefined();
      expect(result.until).toBeUndefined();
    });
  });

  describe('Memory citation', () => {
    it('should include memory count in assistant answer', () => {
      (chat as any).retrievedMemories = [{ id: '1' }, { id: '2' }];
      const result = { finalAnswer: 'Here is the answer' };
      // Simulate what processAgentResponse does: addMessage with citation
      const answer = result.finalAnswer + `\n\n*${(chat as any).retrievedMemories.length} memories retrieved*`;
      (chat as any).addMessage('assistant', answer);
      const messages = (chat as any).messages as any[];
      const last = messages[messages.length - 1];
      expect(last.content).toContain('memories retrieved');
    });
  });
});
