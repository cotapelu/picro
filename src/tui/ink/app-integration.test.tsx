// End-to-end view test: the real App with the real controller.
//
// Covers what a manual run showed: after submitting, the user's text must appear
// in the transcript, the editor must be cleared, and a runtime failure must be
// surfaced as an in-UI message (not raw stdout).
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { App } from './App.js';
import { InteractiveController } from '../../modes/interactive/interactive-controller.js';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

async function settledFrame(instance: { lastFrame: () => string | undefined }): Promise<string> {
  let previous: string | undefined;
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 25));
    const value = instance.lastFrame();
    if (value && value === previous) return value;
    previous = value;
  }
  return instance.lastFrame() ?? '';
}

function makeRuntime(prompt: (text: string) => Promise<void>) {
  const listeners: Array<(event: unknown) => void> = [];
  const session = {
    subscribe(listener: (event: unknown) => void) {
      listeners.push(listener);
      return () => listeners.splice(listeners.indexOf(listener), 1);
    },
    isStreaming: false,
    messages: [] as unknown[],
    model: { id: 'm', provider: 'p', reasoning: false, contextWindow: 8000 },
    thinkingLevel: 'off',
    getSteeringMessages: () => [],
    getFollowUpMessages: () => [],
    clearQueue: () => ({ steering: [], followUp: [] }),
  };
  return {
    cwd: '/tmp/project',
    session,
    settings: {},
    services: { modelRegistry: { getAll: () => [] } },
    prompt,
    getContextUsage: () => ({ tokens: 10, contextWindow: 100, percent: 10 }),
    getSessionStats: () => ({ tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }, cost: 0.5 }),
    copyToClipboard: async () => {},
    abort: () => {},
    cycleModel: async () => undefined,
  } as unknown as AgentSessionRuntimeInterface;
}

describe('App + InteractiveController', () => {
  it('shows the submitted message in the transcript and clears the editor', async () => {
    const runtime = makeRuntime(async () => {});
    const controller = new InteractiveController({ runtime });
    const instance = render(<App runtime={runtime} controller={controller} />);
    await settledFrame(instance);

    await controller.sendMessage('hello world');
    const out = strip(await settledFrame(instance));

    const lines = out.split('\n');
    // Tin nhắn hiện trong transcript (vùng trên ô nhập, có đệm 1 cột)...
    expect(lines.map((l) => l.trim())).toContain('hello world');
    // ...và ô nhập đã trống lại: placeholder quay lại, dòng ngay trên nó (dòng
    // con trỏ của editor) không còn chữ vừa gõ.
    const placeholder = lines.findIndex((l) => l.includes('Nhập tin nhắn'));
    expect(placeholder).toBeGreaterThan(0);
    expect(lines[placeholder - 1]!.trim()).toBe('');
  });

  it('surfaces a runtime failure inside the UI as a toast', async () => {
    const runtime = makeRuntime(async () => {
      throw new Error('boom from the model');
    });
    const controller = new InteractiveController({ runtime });
    const instance = render(<App runtime={runtime} controller={controller} />);
    await settledFrame(instance);

    await controller.sendMessage('hi');
    const out = strip(await settledFrame(instance));
    expect(controller.getToasts().some((t) => t.message.includes('boom'))).toBe(true);
    expect(out).toContain('hi');
  });

  it('opens the help overlay for /help and closes it again', async () => {
    const runtime = makeRuntime(async () => {});
    const controller = new InteractiveController({ runtime });
    const instance = render(<App runtime={runtime} controller={controller} />);
    await settledFrame(instance);

    await controller.runCommand('help');
    const open = strip(await settledFrame(instance));
    expect(open).toContain('Trợ giúp');

    controller.closeOverlay();
    const closed = strip(await settledFrame(instance));
    expect(closed).not.toContain('Trợ giúp');
  });

  it('displays queued follow-up messages in the dock', async () => {
    const session = {
      subscribe: () => () => {},
      isStreaming: true,
      messages: [],
      model: { id: 'm', provider: 'p', contextWindow: 8000 },
      thinkingLevel: 'off',
      getSteeringMessages: () => [] as string[],
      getFollowUpMessages: () => ['do this next'],
      clearQueue: () => ({ steering: [], followUp: [] }),
      prompt: async () => {},
    };
    const runtime = {
      cwd: '/tmp/project',
      session,
      settings: {},
      services: { modelRegistry: { getAll: () => [] } },
      prompt: async () => {},
      getContextUsage: () => ({ tokens: 1, contextWindow: 100, percent: 1 }),
      getSessionStats: () => ({ tokens: {}, cost: 0 }),
    } as unknown as AgentSessionRuntimeInterface;
    const controller = new InteractiveController({ runtime });
    const instance = render(<App runtime={runtime} controller={controller} />);
    await settledFrame(instance);

    expect(strip(await settledFrame(instance))).toContain('do this next');
  });
});
