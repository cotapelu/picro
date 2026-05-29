/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCommand } from './command-handlers';
import type { CommandContext } from './command-handlers';

function createMockContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    runtime: {} as any,
    addToast: vi.fn(),
    setActiveModal: vi.fn(),
    messages: [],
    footerProvider: {} as any,
    inputValue: '',
    setInputValue: vi.fn(),
    ...overrides,
  };
}

describe('handleCommand', () => {
  let ctx: CommandContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should handle /quit by calling process.exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    await handleCommand(ctx, 'quit');
    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should set thinking level when valid argument provided', async () => {
    ctx.runtime.setThinkingLevel = vi.fn();
    await handleCommand(ctx, 'thinking', '/thinking high');
    expect(ctx.runtime.setThinkingLevel).toHaveBeenCalledWith('high');
    expect(ctx.addToast).toHaveBeenCalledWith('Thinking level set to high', 'success');
  });

  it('should show thinking modal when no argument', async () => {
    await handleCommand(ctx, 'thinking', '/thinking');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'thinking' });
  });

  it('should open login modal', async () => {
    await handleCommand(ctx, 'login', '/login');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'login' });
  });

  it('should open help modal', async () => {
    await handleCommand(ctx, 'help', '/help');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'help' });
  });

  it('should copy last assistant message', async () => {
    ctx.messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    ctx.runtime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'copy', '/copy');
    expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith('Hi there');
    expect(ctx.addToast).toHaveBeenCalledWith('Copied last assistant message', 'success');
  });

  it('should copy full conversation when /copy all', async () => {
    ctx.messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
    ];
    ctx.runtime.copyToClipboard = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'copy', '/copy all');
    const expected = 'You: Hello\n\nAssistant: Hi';
    expect(ctx.runtime.copyToClipboard).toHaveBeenCalledWith(expected);
  });

  it('should open session selector on /resume', async () => {
    await handleCommand(ctx, 'resume', '/resume');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'session-selector' });
  });

  it('should create new session on /new', async () => {
    ctx.runtime.newSession = vi.fn().mockResolvedValue(undefined);
    await handleCommand(ctx, 'new', '/new');
    expect(ctx.setActiveModal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'confirmation',
        title: 'New Session',
      })
    );
  });

  it('should open settings modal', async () => {
    await handleCommand(ctx, 'settings', '/settings');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'settings' });
  });

  it('should open model selector', async () => {
    await handleCommand(ctx, 'model', '/model');
    expect(ctx.setActiveModal).toHaveBeenCalledWith({ type: 'model-selector' });
  });

  it('should return insert for unknown command', async () => {
    const result = await handleCommand(ctx, 'unknown', '/unknown');
    expect(result).toBe('insert');
  });
});
