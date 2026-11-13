// Footer (StatusBar) must show the full pi-mono stat set, not just model+tokens.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar.js';

const strip = (s: string | undefined) => (s ?? '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');

/**
 * Chờ frame ỔN ĐỊNH: ink-testing-library ghi frame tiến dần, lần đọc đầu có
 * thể là frame dở (mới 1-2 ký tự) nên phải đọc cho tới khi hai lần liên tiếp
 * giống nhau.
 */
async function frame(instance: { lastFrame: () => string | undefined }): Promise<string> {
  let previous: string | undefined;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 25));
    const value = instance.lastFrame();
    if (value && value === previous) return value;
    previous = value;
  }
  return instance.lastFrame() ?? '';
}

describe('StatusBar (full footer)', () => {
  it('shows input/output/cache/cost/context and the model', async () => {
    const instance = render(
      <StatusBar
        model="anthropic/claude"
        cwd="/home/me/project"
        gitBranch="main"
        sessionName="refactor"
        tokens="12000/80000"
        contextPercent="15%"
        thinkingLevel="high"
        usage={{ input: 12345, output: 6789, cacheRead: 2345, cacheWrite: 123, cost: 0.1234, cacheHitPercent: 95.0 }}
      />,
    );
    const out = strip(await frame(instance));
    expect(out).toContain('↑12k');
    expect(out).toContain('↓6.8k');
    expect(out).toContain('R2.3k');
    expect(out).toContain('W123');
    expect(out).toContain('CH95.0%');
    expect(out).toContain('$0.123');
    expect(out).toContain('15%');
    expect(out).toContain('anthropic/claude');
    expect(out).toContain('think high');
    expect(out).toContain('(main)');
    expect(out).toContain('refactor');
  });

  it('shortens the home directory and shows the processing state', async () => {
    const home = process.env.HOME ?? '/home/me';
    const instance = render(<StatusBar model="m" cwd={home} tokens="0/0" isProcessing />);
    const out = strip(await frame(instance));
    expect(out).toContain('~');
    expect(out).toContain('Working');
  });

  it('omits usage parts when there is no usage data', async () => {
    const instance = render(<StatusBar model="m" cwd="/tmp" tokens="0/0" />);
    const out = strip(await frame(instance));
    expect(out).not.toContain('↑');
    expect(out).toContain('m');
  });

  it('shows the routed model when it differs from the session model', async () => {
    const instance = render(
      <StatusBar model="virtual/x" routedModel="anthropic/claude" tokens="1/2" cwd="/tmp" />,
    );
    expect(strip(await frame(instance))).toContain('→ anthropic/claude');
  });
});
