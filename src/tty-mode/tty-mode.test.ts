import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TTYMode } from './tty-mode.js';
import type { InputHandler } from './components/input-handler.js';
import type { MenuSystem } from './menu-system.js';
import type { CommandProcessor } from './command-processor.js';

describe('TTYMode', () => {
  let tty: TTYMode;
  let runtime: any;
  let mockMenu: Partial<MenuSystem>;
  let mockInput: Partial<InputHandler>;
  let mockCommands: Partial<CommandProcessor>;

  beforeEach(() => {
    mockMenu = { show: vi.fn() };
    mockInput = {};
    mockCommands = { getAll: vi.fn(() => []), getMenuItems: vi.fn(() => []) };

    runtime = {
      prompt: vi.fn(),
      session: { subscribe: vi.fn(() => () => {}) },
    };

    // Ensure process.stdin has required methods (polyfill for non-TTY test env)
    if (!process.stdin.setRawMode) (process.stdin as any).setRawMode = vi.fn();
    if (!process.stdin.removeAllListeners) (process.stdin as any).removeAllListeners = vi.fn();
    if (!process.stdin.resume) (process.stdin as any).resume = vi.fn();
    if (!process.stdin.setEncoding) (process.stdin as any).setEncoding = vi.fn();
    if (!process.stdin.on) (process.stdin as any).on = vi.fn();
    if (!process.stdout.write) (process.stdout as any).write = vi.fn();
    vi.spyOn(process, 'exit').mockImplementation(vi.fn());

    tty = new TTYMode(runtime);
  });

  it('should have default prompt and welcome', () => {
    expect(tty['prompt']).toBe('> ');
    expect(tty['welcomeMessage']).toContain('picro agent ready');
  });

  it('getRl returns null', () => {
    expect(tty.getRl()).toBeNull();
  });

  it('getMenuRenderer returns a MenuSystem', () => {
    const renderer = tty.getMenuRenderer();
    expect(renderer).toBeDefined();
  });

  it('getCommands returns command list', () => {
    const cmds = tty.getCommands();
    expect(Array.isArray(cmds)).toBe(true);
    expect(cmds.length).toBeGreaterThanOrEqual(4); // model, help, quit, exit
  });

  it('setRawMode methods exist', () => {
    expect(typeof tty['setRawMode']).toBe('function');
    expect(typeof tty['hideCursor']).toBe('function');
    expect(typeof tty['showCursor']).toBe('function');
    expect(typeof tty['clearLine']).toBe('function');
    expect(typeof tty['moveUp']).toBe('function');
    expect(typeof tty['write']).toBe('function');
    expect(typeof tty['onKeypress']).toBe('function');
  });

  it('onKeypress returns unsubscribe function', () => {
    const unsub = tty.onKeypress(() => {});
    expect(typeof unsub).toBe('function');
  });

  it('stop calls process.exit', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    tty.stop();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('subscribeToEvents handles agent_start', () => {
    const outputShowThinking = vi.fn();
    const mockSession = {
      subscribe: vi.fn((cb) => { cb({ type: 'agent_start' }); return () => {}; }),
    };
    const rt = { session: mockSession } as any;
    const newTty = new TTYMode(rt);
    (newTty as any).output.showThinking = outputShowThinking;
    (newTty as any).subscribeToEvents();
    expect(outputShowThinking).toHaveBeenCalled();
  });

  it('subscribeToEvents handles agent_end and shows prompt', () => {
    const outputClearLine = vi.fn();
    const promptLineShow = vi.fn();
    let capturedCb: ((event: any) => void) | null = null;
    const mockSession = {
      subscribe: vi.fn((cb) => {
        capturedCb = cb;
        return () => {};
      }),
      messages: [],
    };
    const rt = { session: mockSession } as any;
    const tty = new TTYMode(rt);
    (tty as any).promptLine = { show: promptLineShow };
    (tty as any).output.clearLine = outputClearLine;
    // Manually set up subscription (normally called in start())
    (tty as any).subscribeToEvents();
    // Trigger event
    if (capturedCb) capturedCb({ type: 'agent_end' });
    expect(outputClearLine).toHaveBeenCalled();
    expect(promptLineShow).toHaveBeenCalled();
  });

  it('handleUserMessage invokes runtime.prompt for text', async () => {
    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const rt = { prompt: promptSpy } as any;
    const tty = new TTYMode(rt);
    await (tty as any).handleUserMessage('hello');
    expect(promptSpy).toHaveBeenCalledWith('hello');
  });

  it('handleUserMessage invokes slash command', async () => {
    const cmdExecuteSpy = vi.fn().mockResolvedValue(undefined);
    const promptLineShow = vi.fn();
    const rt = {} as any;
    const tty = new TTYMode(rt);
    (tty as any).promptLine = { show: promptLineShow };
    (tty as any).commandProcessor = { execute: cmdExecuteSpy } as any;
    await (tty as any).handleUserMessage('/help');
    expect(cmdExecuteSpy).toHaveBeenCalledWith(expect.anything(), 'help', []);
    expect(promptLineShow).toHaveBeenCalled();
  });

  it('updateStatusBar prints status', () => {
    const rt = {
      services: { settingsManager: { getDefaultProvider: () => 'openai' } },
      session: { getContextUsage: () => ({ tokens: 100, contextWindow: 4000, percent: 2.5 }) },
      cwd: '/home/user',
    } as any;
    const tty = new TTYMode(rt);
    const printSpy = vi.spyOn((tty as any).statusBar, 'print');
    (tty as any).updateStatusBar();
    expect(printSpy).toHaveBeenCalledWith('openai', { tokens: 100, contextWindow: 4000, percent: 2.5 }, '/home/user');
  });
});
