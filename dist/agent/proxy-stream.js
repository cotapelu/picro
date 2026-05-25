// SPDX-License-Identifier: Apache-2.0
/**
 * Proxy stream function for routing LLM calls through a server.
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
/**
 * Stream function that proxies requests through a server.
 * Reconstructs assistant message from delta events.
 */
export function createProxyStream(options) {
    return async function* (model, context, streamOptions) {
        const partial = {
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
                        errorMsg = data.error || errorMsg;
                    }
                }
                catch {
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
                    reader.cancel('Aborted').catch(() => { });
                });
                abortHandlerInstalled = true;
            }
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                if (options.signal?.aborted) {
                    throw new Error('Request aborted');
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (!data)
                            continue;
                        try {
                            const event = JSON.parse(data);
                            const result = processProxyEvent(event, partial);
                            if (result) {
                                yield result;
                            }
                        }
                        catch (e) {
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
        }
        catch (error) {
            yield {
                type: 'error',
                reason: options.signal?.aborted ? 'aborted' : 'error',
                error: {
                    ...partial,
                    errorMessage: error.message,
                    stopReason: 'error',
                },
            };
        }
        finally {
            if (options.signal && abortHandlerInstalled) {
                options.signal.removeEventListener('abort', () => { });
            }
        }
    };
}
function processProxyEvent(event, partial) {
    switch (event.type) {
        case 'start':
            return { type: 'start', partial };
        case 'text_delta':
            if (partial.content.length === 0 || partial.content[0].type !== 'text') {
                partial.content.unshift({ type: 'text', text: '' });
            }
            partial.content[0].text += event.delta;
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
            partial.content[0].thinking += event.delta;
            return {
                type: 'thinking_delta',
                contentIndex: 0,
                delta: event.delta,
                partial: { ...partial },
            };
        case 'toolcall_delta':
            const existingIdx = partial.content.findIndex((c) => c.type === 'toolCall' && c.id === event.id);
            if (existingIdx >= 0) {
                const tc = partial.content[existingIdx];
                tc.partialJson = (tc.partialJson || '') + event.delta;
                try {
                    tc.arguments = JSON.parse(tc.partialJson);
                }
                catch {
                    // incomplete JSON, keep parsing
                }
            }
            else {
                partial.content.push({
                    type: 'toolCall',
                    id: event.id,
                    name: event.name,
                    arguments: {},
                    partialJson: event.delta,
                });
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
//# sourceMappingURL=proxy-stream.js.map