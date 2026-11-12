// The console logger must read the message payload on both paths.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter, createConsoleLogger } from './event-emitter.js';
import type { AgentEvent } from './events.js';

afterEach(() => vi.restoreAllMocks());

describe('createConsoleLogger', () => {
  it('logs the role on the non-streaming path (turn payload)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const emitter = createConsoleLogger();
    await emitter.emit({
      type: 'message:start',
      timestamp: Date.now(),
      round: 1,
      turn: { role: 'user' },
    } as unknown as AgentEvent);
    const lines = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(lines).toContain('Message start: user');
  });

  it('logs the role on the streaming path (message payload)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const emitter = createConsoleLogger();
    await emitter.emit({
      type: 'message:start',
      timestamp: Date.now(),
      round: 1,
      message: { role: 'assistant' },
    } as unknown as AgentEvent);
    await emitter.emit({
      type: 'message:end',
      timestamp: Date.now(),
      round: 1,
      message: { role: 'assistant' },
    } as unknown as AgentEvent);
    const lines = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(lines).toContain('Message start: assistant');
    expect(lines).toContain('Message end: assistant');
  });
});
