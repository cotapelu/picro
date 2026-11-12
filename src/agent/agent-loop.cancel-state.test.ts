// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests: a cancelled run must not poison the next one.
 *
 * Only the streaming path reset `isCancelled` in its finally block, so after an
 * abort (or a stream error) `resume()` — the path AgentSession uses whenever the
 * session already has history — skipped the loop entirely and returned a bogus
 * "aborted" result forever. The session became unresponsive: every later prompt
 * silently did nothing.
 */

import { describe, it, expect } from 'vitest';
import { Agent } from './agent.js';
import type { Model } from '../llm/index.js';

function model(): Model {
  return {
    id: 'm',
    name: 'm',
    api: 'openai-completions',
    provider: 'openai',
    baseUrl: 'http://x',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 1000,
    maxTokens: 100,
  };
}

describe('Agent - cancelled state handling', () => {
  it('runs again after abort() cancelled the previous run', async () => {
    const agent = new Agent(model(), [], { maxRounds: 3 });
    let calls = 0;
    agent.setLLMProvider(async () => {
      calls++;
      return { content: `answer-${calls}`, stopReason: 'stop' };
    });

    await agent.run('first');
    expect(calls).toBe(1);

    agent.abort();
    expect(agent.getState().isCancelled).toBe(true);

    const result = await agent.run('second');
    expect(result.finalAnswer).toBe('answer-2');
    expect(result.stopReason).toBe('stop');
    expect(calls).toBe(2);
  });

  it('resumes (history path) after a cancelled run', async () => {
    const agent = new Agent(model(), [], { maxRounds: 3 });
    let calls = 0;
    agent.setLLMProvider(async () => {
      calls++;
      return { content: `answer-${calls}`, stopReason: 'stop' };
    });

    await agent.run('first');

    // Simulate the loop's own cancellation (abort mid-run / stream error).
    (agent.getRunner() as any).state.isCancelled = true;

    agent.steer({ role: 'user', content: [{ type: 'text', text: 'next' }], timestamp: Date.now() } as any);
    const result = await agent.resume();

    expect(result.stopReason).toBe('stop');
    expect(result.finalAnswer).toBe('answer-2');
    expect(calls).toBe(2);
  });

  it('forwards a live abort signal to the provider', async () => {
    const agent = new Agent(model(), [], { maxRounds: 3 });
    let seenAborted: boolean | undefined;
    agent.setLLMProvider(async (_prompt: string, _tools: any[], options?: any) => {
      seenAborted = options?.signal?.aborted;
      return { content: 'answer', stopReason: 'stop' };
    });

    await agent.run('first');
    agent.abort();

    const controller = new AbortController();
    controller.abort();
    await agent.run('second', controller.signal);

    // The stale internal flag was cleared, but the caller's signal must still
    // reach the provider aborted.
    expect(seenAborted).toBe(true);
  });
});
