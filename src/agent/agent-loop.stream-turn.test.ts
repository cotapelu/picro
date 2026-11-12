// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests: streaming runs must record the assistant turn in the same
 * shape as non-streaming runs.
 *
 * In streaming mode the provider's 'done' event carries an AssistantMessage
 * whose `content` is an array of blocks. The loop used to feed that through the
 * non-streaming builder (content: string + toolCalls[]), which nested the whole
 * block array inside one text block and dropped every toolCall block. The
 * restored history therefore lost tool calls and sent garbage to the provider.
 */

import { describe, it, expect } from 'vitest';
import { AgentLoop } from './agent-loop.js';
import { MessageQueue } from './message-queue.js';
import { EventEmitter } from '../events/event-emitter.js';
import { ToolExecutor } from './tool-executor.js';
import type { Model } from '../llm/index.js';
import type { AssistantMessage } from '../llm/types.js';

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

function assistantMessage(content: any[], stopReason: 'stop' | 'toolUse' = 'toolUse'): AssistantMessage {
  return {
    role: 'assistant',
    content,
    api: 'openai-completions',
    provider: 'openai',
    model: 'm',
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason,
    timestamp: Date.now(),
  };
}

function createLoop(streamFn: any) {
  const toolExecutor = new ToolExecutor({ timeout: 1000 });
  toolExecutor.register({
    name: 'noop',
    description: 'no-op tool for tests',
    parameters: { type: 'object', properties: {} },
    handler: async () => 'tool-ok',
  });

  const config: any = { maxRounds: 3, systemPrompt: 'test' };
  return new AgentLoop(
    config,
    new EventEmitter(),
    toolExecutor,
    null,
    { shouldContinue: () => false, formatResults: () => '' } as any,
    async () => ({ content: 'unused', toolCalls: [], stopReason: 'stop' }),
    streamFn,
    [{ name: 'noop', description: 'no-op tool for tests', parameters: { type: 'object', properties: {} } }] as any,
  );
}

async function drain(gen: AsyncGenerator<any, any>) {
  let next = await gen.next();
  while (!next.done) {
    next = await gen.next();
  }
  return next.value;
}

describe('AgentLoop - streaming assistant turn recording', () => {
  it('keeps text and toolCall blocks from the final AssistantMessage', async () => {
    const finalMessage = assistantMessage([
      { type: 'text', text: 'I will call a tool' },
      { type: 'toolCall', id: 'call_1', name: 'noop', arguments: { a: 1 } },
    ]);

    // Second round answers with plain text so the loop terminates.
    const streamFn = (async function* () {
      const partial = assistantMessage([]);
      yield { type: 'start', partial };
      if (calls++ === 0) {
        yield { type: 'done', reason: 'toolUse', usage: finalMessage.usage, message: finalMessage };
      } else {
        const done = assistantMessage([{ type: 'text', text: 'all done' }], 'stop');
        yield { type: 'done', reason: 'stop', usage: done.usage, message: done };
      }
    }) as any;
    let calls = 0;

    const loop = createLoop(streamFn);
    await drain(loop.stream('hi', new MessageQueue(), new MessageQueue()));

    const assistantTurns = loop.getState().history.filter((t: any) => t.role === 'assistant');
    expect(assistantTurns.length).toBeGreaterThan(0);

    const turn = assistantTurns[0] as any;
    expect(turn.content).toEqual([
      { type: 'text', text: 'I will call a tool' },
      { type: 'toolCall', id: 'call_1', name: 'noop', arguments: { a: 1 } },
    ]);
    expect(turn.stopReason).toBe('toolUse');
    expect(turn.usage).toEqual(finalMessage.usage);

    // The tool result must still be executed and recorded.
    const toolTurns = loop.getState().history.filter((t: any) => t.role === 'tool');
    expect(toolTurns).toHaveLength(1);
    expect((toolTurns[0] as any).toolCallId).toBe('call_1');
  });

  it('records thinking blocks without flattening them into text', async () => {
    const finalMessage = assistantMessage([
      { type: 'thinking', thinking: 'deliberating' },
      { type: 'text', text: 'answer' },
    ], 'stop');

    const streamFn = async function* () {
      yield { type: 'start', partial: assistantMessage([]) };
      yield { type: 'done', reason: 'stop', usage: finalMessage.usage, message: finalMessage };
    };

    const loop = createLoop(streamFn);
    await drain(loop.stream('hi', new MessageQueue(), new MessageQueue()));

    const assistantTurn = loop.getState().history.find((t: any) => t.role === 'assistant') as any;
    expect(assistantTurn.content).toEqual([
      { type: 'thinking', thinking: 'deliberating' },
      { type: 'text', text: 'answer' },
    ]);
  });
});
