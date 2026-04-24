// SPDX-License-Identifier: Apache-2.0
/**
 * Proxy stream function for routing LLM calls through a server.
 * Different types, but similar purpose to pi-agent-legacy.
 */

import type { LLMStreamEvent, AssistantTurn, AIModel } from './types.js';

export interface ProxyOptions {
  authToken: string;
  proxyUrl: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: string;
  signal?: AbortSignal;
}

/**
 * Stream function that proxies requests through a server.
 * Reconstructs assistant message from delta events.
 */
export function createProxyStream(
  options: ProxyOptions
): (model: AIModel, context: any, streamOptions?: any) => AsyncIterable<LLMStreamEvent> {
  return async function* (model: AIModel, context: any, streamOptions?: any): AsyncIterable<LLMStreamEvent> {
    const partial: AssistantTurn = {
      role: 'assistant',
      content: [],
      timestamp: Date.now(),
      stopReason: 'stop',
    };

    let abortHandlerInstalled = false;

    try {
      const response = await fetch(`${options.proxyUrl}/api/stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          context,
          options: {
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            reasoning: options.reasoning,
            sessionId: streamOptions?.sessionId,
          },
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        let errorMsg = `Proxy error: ${response.status} ${response.statusText}`;
        try {
          const data = await response.json();
          if (typeof data === 'object' && data !== null && 'error' in data) {
            errorMsg = (data as { error: string }).error || errorMsg;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Setup abort
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          reader.cancel('Aborted').catch(() => {});
        });
        abortHandlerInstalled = true;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (options.signal?.aborted) {
          throw new Error('Request aborted');
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const event = JSON.parse(data) as ProxyStreamEvent;
              const result = processProxyEvent(event, partial);
              if (result) {
                yield result;
              }
            } catch (e) {
              console.warn('Failed to parse proxy event:', e);
            }
          }
        }
      }

      // Emit final done
      yield {
        type: 'done',
        reason: 'stop',
        usage: { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } },
        message: partial,
      };
    } catch (error: any) {
      yield {
        type: 'error',
        reason: options.signal?.aborted ? 'aborted' : 'error',
        error: {
          ...partial,
          errorMessage: error.message,
          stopReason: 'error',
        } as AssistantTurn,
      };
    } finally {
      if (options.signal && abortHandlerInstalled) {
        options.signal.removeEventListener('abort', () => {});
      }
    }
  };
}

type ProxyStreamEvent =
  | { type: 'start' }
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'toolcall_delta'; id: string; name: string; delta: string }
  | { type: 'done'; usage: any }
  | { type: 'error'; message: string };

function processProxyEvent(
  event: ProxyStreamEvent,
  partial: AssistantTurn
): LLMStreamEvent | null {
  switch (event.type) {
    case 'start':
      return { type: 'start', partial };

    case 'text_delta':
      if (partial.content.length === 0 || partial.content[0].type !== 'text') {
        partial.content.unshift({ type: 'text', text: '' });
      }
      (partial.content[0] as any).text += event.delta;
      return {
        type: 'text_delta',
        contentIndex: 0,
        delta: event.delta,
        partial: { ...partial },
      };

    case 'thinking_delta':
      if (partial.content.length === 0 || partial.content[0].type !== 'thinking') {
        partial.content.unshift({ type: 'thinking', thinking: '' });
      }
      (partial.content[0] as any).thinking += event.delta;
      return {
        type: 'thinking_delta',
        contentIndex: 0,
        delta: event.delta,
        partial: { ...partial },
      };

    case 'toolcall_delta':
      // Simplified: just create tool call block
      const existingIdx = partial.content.findIndex(
        (c: any) => c.type === 'toolCall' && c.id === event.id
      );
      if (existingIdx >= 0) {
        const tc = partial.content[existingIdx] as any;
        tc.partialJson = (tc.partialJson || '') + event.delta;
        try {
          tc.arguments = JSON.parse(tc.partialJson);
        } catch {
          // incomplete JSON, keep parsing
        }
      } else {
        partial.content.push({
          type: 'toolCall',
          id: event.id,
          name: event.name,
          arguments: {},
          partialJson: event.delta,
        } as any);
      }
      return {
        type: 'toolcall_delta',
        contentIndex: partial.content.length - 1,
        delta: event.delta,
        partial: { ...partial },
      };

    case 'done':
      partial.stopReason = 'stop';
      partial.usage = event.usage;
      return { type: 'done', reason: 'stop', usage: event.usage, message: partial };

    case 'error':
      partial.stopReason = 'error';
      partial.errorMessage = event.message;
      return {
        type: 'error',
        reason: 'error',
        error: partial,
      };

    default:
      return null;
  }
}
