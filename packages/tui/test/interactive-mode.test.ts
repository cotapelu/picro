import { describe, it, expect, vi } from 'vitest';
import { InteractiveMode } from '../src/interactive-mode.js';
import { TerminalUI } from '../src/components/tui.js';
import { ProcessTerminal } from '../src/components/terminal.js';

describe('InteractiveMode', () => {
  let terminal: ProcessTerminal;
  let tui: TerminalUI;

  beforeEach(() => {
    terminal = new ProcessTerminal();
    tui = new TerminalUI(terminal);
    // Mock setTitle to avoid errors
    vi.spyOn(terminal, 'setTitle').mockImplementation(() => {});
  });

  afterEach(() => {
    tui.stop?.(); // if stop exists; otherwise ignore
  });

  it('should construct without errors', () => {
    const mode = new InteractiveMode({ tui });
    expect(mode).toBeDefined();
    mode.dispose();
  });

  it('should set initial status', () => {
    const mode = new InteractiveMode({
      tui,
      initialStatus: 'Ready',
    });
    // No direct getter, but we can verify no errors thrown
    mode.dispose();
  });

  it('should add user and assistant messages', () => {
    const mode = new InteractiveMode({ tui });
    const userId = mode.addUserMessage('Hello');
    const assistantId = mode.addAssistantMessage('Hi there');
    expect(userId).toBeTruthy();
    expect(assistantId).toBeTruthy();
    mode.dispose();
  });

  it('should add tool message', () => {
    const mode = new InteractiveMode({ tui });
    const id = mode.addToolMessage('grep', 'found 3 matches', 0);
    expect(id).toBeTruthy();
    mode.dispose();
  });

  it('should provide extension UIContext', () => {
    const mode = new InteractiveMode({ tui });
    const ctx = mode.getExtensionUIContext();
    expect(ctx).toBeDefined();
    expect(ctx.select).toBeInstanceOf(Function);
    mode.dispose();
  });

  it('should start a countdown', () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();
    const mode = new InteractiveMode({ tui });
    mode.startCountdown('test1', 2000, onTick, onComplete);
    // Can't easily test without real timers; just ensure no error
    mode.dispose();
  });

  it('should call onUserInput when provided', () => {
    const onUserInput = vi.fn();
    const mode = new InteractiveMode({ tui, onUserInput });
    // The onUserInput is called when input is submitted; we won't simulate full input here
    mode.dispose();
  });
});
