// The interactive app must mount and render its regions without crashing.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from './App.js';

/** ink-testing-library publishes frames asynchronously; wait for a settled one. */
async function settledFrame(instance: { lastFrame: () => string | undefined }): Promise<string> {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 20));
    const value = instance.lastFrame();
    if (value && value.trim().length > 0) return value;
  }
  return instance.lastFrame() ?? '';
}

function makeController() {
  const state = {
    toasts: [] as any[],
    transcript: [
      { id: 'a', kind: 'user', index: 0, text: 'hello there' },
      {
        id: 'b',
        kind: 'assistant',
        index: 1,
        thinking: 'reasoning...',
        text: 'Hi! How can I help?',
      },
      {
        id: 'c',
        kind: 'tool',
        index: 2,
        toolName: 'bash',
        toolArgs: { command: 'ls' },
        toolResult: { content: [{ type: 'text', text: 'a.ts b.ts' }], isError: false, durationMs: 12 },
        toolPartial: false,
      },
    ] as any[],
    status: { model: 'test/model', tokens: '1200/8000', cwd: '/tmp', isProcessing: false, contextPercent: '15%' },
    history: ['previous message'],
    queue: { steering: [], followUp: [] },
  };
  const controller = {
    getMessages: () => state.toasts,
    getToasts: () => state.toasts,
    getTranscript: () => state.transcript,
    getStatus: () => state.status,
    getHistory: () => state.history,
    getQueue: () => state.queue,
    sendMessage: vi.fn(async () => {}),
    runCommand: vi.fn(async () => {}),
    updateSetting: vi.fn(),
    loadTranscript: vi.fn(),
    queueFollowUp: vi.fn(async () => {}),
    restoreQueue: () => 0,
    onToast: () => {},
    onMessage: () => {},
    onStatusChange: () => {},
    onIndicator: () => {},
    onOverlayRequest: () => {},
    onOverlayClose: () => {},
    onEditorCallbacks: () => {},
    onShutdown: () => {},
    dispose: () => {},
    subscribeEvents: () => () => {},
  };
  return controller;
}

const runtime = { cwd: '/tmp' } as any;

describe('App (interactive TUI)', () => {
  it('renders header, transcript, dock and footer', async () => {
    const controller = makeController();
    const instance = render(<App runtime={runtime} controller={controller} />);
    const out = (await settledFrame(instance)).replace(/\x1b\[[0-9;]*m/g, '');
    expect(out).toContain('hello there');
    expect(out).toContain('Hi! How can I help?');
    expect(out).toContain('bash');
    expect(out).toContain('test/model');
  });

  it('does not crash with an empty transcript', async () => {
    const controller = { ...makeController(), getTranscript: () => [] };
    const instance = render(<App runtime={runtime} controller={controller} />);
    expect(typeof (await settledFrame(instance))).toBe('string');
  });

  it('does not crash while processing', async () => {
    const controller = { ...makeController(), getStatus: () => ({ ...makeController().getStatus(), isProcessing: true }) };
    const instance = render(<App runtime={runtime} controller={controller} />);
    expect(typeof (await settledFrame(instance))).toBe('string');
  });
});

/**
 * Regression: every transcript kind must actually put its payload on screen.
 *
 * Two real bugs were found here: a bare string child inside an Ink <Box> blanks
 * the whole subtree (user messages vanished), and the bash block ignored its
 * `output` prop entirely (replayed sessions showed only the command).
 */
describe('Transcript rendering', () => {
  it('renders payloads for user, tool, bash, custom, compaction and system kinds', async () => {
    const items = [
      { id: 'a', kind: 'user', index: 0, text: 'hello there' },
      {
        id: 'b',
        kind: 'assistant',
        index: 1,
        thinking: 'reasoning about it',
        text: 'Hi! How can I help?',
      },
      {
        id: 'c',
        kind: 'tool',
        index: 2,
        toolName: 'bash',
        toolArgs: { command: 'ls' },
        toolResult: { content: [{ type: 'text', text: 'a.ts' }], isError: false, durationMs: 12 },
        toolPartial: false,
      },
      { id: 'd', kind: 'bash', index: 3, command: 'ls', output: 'a.ts', exitCode: 0 },
      { id: 'e', kind: 'custom', index: 4, customType: 'note', text: 'a custom note' },
      { id: 'f', kind: 'compaction', index: 5, summary: 'summary text', tokensBefore: 12345 },
      { id: 'g', kind: 'system', index: 6, text: 'system note' },
    ] as any;

    const controller = { ...makeController(), getTranscript: () => items };
    const instance = render(<App runtime={runtime} controller={controller} />);
    const out = (await settledFrame(instance)).replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

    expect(out).toContain('hello there');
    expect(out).toContain('Hi! How can I help?');
    expect(out).toContain('a.ts');
    expect(out).toContain('a custom note');
    expect(out).toContain('Nén từ 12,345 token');
    expect(out).toContain('system note');
  });
});
