// Key-path test: does a real Enter keypress reach onSubmit (and clear the input)?
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { MessageInput } from './MessageInput.js';

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

describe('MessageInput key path', () => {
  it('submits the typed text on Enter', async () => {
    const onSubmit = vi.fn();
    const instance = render(<MessageInput onSubmit={onSubmit} width={60} />);
    await settledFrame(instance);
    instance.stdin.write('hi');
    await settledFrame(instance);
    instance.stdin.write('\r');
    await settledFrame(instance);
    expect(onSubmit).toHaveBeenCalledWith('hi');
  });

  it('clears its own text after submitting (input row is empty again)', async () => {
    const onSubmit = vi.fn();
    const instance = render(<MessageInput onSubmit={onSubmit} width={60} />);
    await settledFrame(instance);
    instance.stdin.write('hi');
    await settledFrame(instance);
    instance.stdin.write('\r');
    const out = strip(await settledFrame(instance));
    expect(onSubmit).toHaveBeenCalledWith('hi');
    // Sau khi gửi: placeholder quay lại và KHÔNG còn dòng nào là nội dung vừa gõ.
    expect(out).toContain('Nhập tin nhắn');
    expect(out.split('\n').map((l) => l.trim())).not.toContain('hi');
  });

  it('queues instead of submitting on the newline byte', async () => {
    const onSubmit = vi.fn();
    const onQueue = vi.fn();
    const instance = render(<MessageInput onSubmit={onSubmit} onQueue={onQueue} width={60} />);
    await settledFrame(instance);
    instance.stdin.write('later');
    await settledFrame(instance);
    instance.stdin.write('\n');
    await settledFrame(instance);
    expect(onQueue).toHaveBeenCalledWith('later');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exposes the app actions for Ctrl+C / Ctrl+D / Esc', async () => {
    const actions: string[] = [];
    const instance = render(
      <MessageInput onSubmit={vi.fn()} onAppAction={(a) => actions.push(a)} width={60} />,
    );
    await settledFrame(instance);
    // Ink giữ ESC "pending" một nhịp rồi mới flush, nên mỗi phím cần đợi frame ổn định.
    for (const [key, action] of [
      ['\u0003', 'clear'],
      ['\u0004', 'exit'],
      ['\u001b', 'escape'],
      ['\u001a', 'suspend'],
      ['\u0007', 'externalEditor'],
      ['\u0016', 'clipboardPaste'],
      ['\u0010', 'modelCycleForward'],
      ['\u000e', 'modelCycleBackward'],
      ['\u000f', 'dequeue'],
    ] as const) {
      instance.stdin.write(key);
      await settledFrame(instance);
      expect(actions.at(-1)).toBe(action);
    }
  });
});
