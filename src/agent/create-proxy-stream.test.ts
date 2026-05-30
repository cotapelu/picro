/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProxyStream } from './proxy-stream.js';
import type { AssistantTurn, LLMStreamEvent } from './types.js';

async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

function createMockReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  let index = 0;
  const encode = (str: string) => new TextEncoder().encode(str);
  return {
    async read(): Promise<{ done: boolean; value: Uint8Array }> {
      if (index >= chunks.length) {
        return { done: true, value: new Uint8Array(0) };
      }
      const chunk = encode(chunks[index]);
      index++;
      return { done: false, value: chunk };
    },
    cancel: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('createProxyStream', () => {
  let fetchMock: any;
  let signalMock: { aborted: boolean; addEventListener: vi.fn(); removeEventListener: vi.fn() };

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    signalMock = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to build data lines from event objects
  function makeDataLine(event: any): string {
    return 'data: ' + JSON.stringify(event) + '\n';
  }

  describe('happy path streaming', () => {
    it('streams start, text delta, and done events', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'text_delta', delta: 'Hello' }),
            makeDataLine({ type: 'done', usage: { input: 1 } }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({
        authToken: 'token',
        proxyUrl: 'https://proxy.example',
      })({ model: 'test' }, { messages: [] });

      const events = await collectAsync(stream);
      const types = events.map(e => e.type);
      expect(types).toContain('start');
      expect(types).toContain('text_delta');
      expect(types).toContain('done');
    });

    it('accumulates multiple text deltas', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'text_delta', delta: 'Hello' }),
            makeDataLine({ type: 'text_delta', delta: ' World' }),
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const textDeltas = events.filter(e => e.type === 'text_delta');
      expect(textDeltas).toHaveLength(2);
      expect((textDeltas[0] as any).delta).toBe('Hello');
      expect((textDeltas[1] as any).delta).toBe(' World');
    });

    it('handles thinking_delta', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'thinking_delta', delta: 'Thinking' }),
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const thinkingEvents = events.filter(e => e.type === 'thinking_delta');
      expect(thinkingEvents).toHaveLength(1);
      expect((thinkingEvents[0] as any).delta).toBe('Thinking');
    });

    it('handles toolcall_delta including JSON accumulation', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'toolcall_delta', id: 'call1', name: 'read', delta: '{"path":' }),
            makeDataLine({ type: 'toolcall_delta', id: 'call1', name: 'read', delta: '"file.txt"}' }),
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const toolcallEvents = events.filter(e => e.type === 'toolcall_delta');
      expect(toolcallEvents.length).toBeGreaterThanOrEqual(2);
      // Check that the second delta's partial shows concatenated partialJson and parsed arguments
      const last = toolcallEvents[toolcallEvents.length - 1] as any;
      const content = (last.partial?.content || []) as any[];
      const toolCall = content.find((c: any) => c.id === 'call1');
      expect(toolCall).toBeDefined();
      // The arguments should be fully parsed after second delta
      expect(toolCall.arguments).toEqual({ path: 'file.txt' });
    });

    it('handles mixed event types in sequence', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'thinking_delta', delta: 'Hmm' }),
            makeDataLine({ type: 'text_delta', delta: 'Hello' }),
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const types = events.map(e => e.type);
      expect(types).toContain('start');
      expect(types).toContain('thinking_delta');
      expect(types).toContain('text_delta');
      expect(types).toContain('done');
    });

    it('handles empty and unknown data lines', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            'data: \n', // empty after trim
            'data: [DONE]\n',
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const types = events.map(e => e.type);
      expect(types).toContain('start');
      expect(types).toContain('done');
    });

    it('includes partial content on done event', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            makeDataLine({ type: 'thinking_delta', delta: 'Thinking' }),
            makeDataLine({ type: 'text_delta', delta: 'Hello' }),
            makeDataLine({ type: 'done', usage: { input: 1, output: 2 } }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      // Find a done with a message
      const doneWithMsg = events.find(e => e.type === 'done' && (e as any).message?.content?.length > 0);
      expect(doneWithMsg).toBeDefined();
      const { message } = (doneWithMsg as any);
      const textBlock = message.content.find((c: any) => c.type === 'text');
      expect(textBlock).toBeDefined();
      expect(textBlock.text).toBe('Hello');
    });

    it('sets up abort listener on signal and cleans up', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([makeDataLine({ type: 'done', usage: {} })]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const addSpy = vi.fn();
      const removeSpy = vi.fn();
      signalMock.aborted = false;
      signalMock.addEventListener = addSpy;
      signalMock.removeEventListener = removeSpy;

      const stream = createProxyStream({
        authToken: 't',
        proxyUrl: 'https://p',
        signal: signalMock,
      })({ model: 'm' }, { messages: [] });

      await collectAsync(stream);

      expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('handles non-ok response with JSON error body', async () => {
      const response = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({ error: 'Invalid token' }),
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 'bad', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0] as any).error.errorMessage).toBe('Invalid token');
    });

    it('handles non-ok response with plain text fallback', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('parse error')),
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0] as any).error.errorMessage).toContain('Proxy error: 500');
    });

    it('errors if response body is missing', async () => {
      const response = { ok: true, body: null };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0] as any).error.errorMessage).toBe('No response body');
    });

    it('handles malformed JSON in data lines without crashing', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([
            makeDataLine({ type: 'start' }),
            'data: { invalid json\n', // malformed
            makeDataLine({ type: 'text_delta', delta: 'After error' }),
            makeDataLine({ type: 'done', usage: {} }),
          ]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      const types = events.map(e => e.type);
      expect(types).toContain('start');
      expect(types).toContain('text_delta');
      expect(types).toContain('done');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to parse proxy event:', expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('handles reader read error', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockRejectedValue(new Error('network glitch')),
            cancel: vi.fn().mockResolvedValue(undefined),
          }),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({ authToken: 't', proxyUrl: 'https://p' })({ model: 'm' }, { messages: [] });
      const events = await collectAsync(stream);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0] as any).error.errorMessage).toBe('network glitch');
    });
  });

  describe('abort handling', () => {
    it('yields error event when signal already aborted before fetch', async () => {
      signalMock.aborted = true;
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([makeDataLine({ type: 'done', usage: {} })]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const stream = createProxyStream({
        authToken: 't',
        proxyUrl: 'https://p',
        signal: signalMock,
      })({ model: 'm' }, { messages: [] });

      const events = await collectAsync(stream);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0] as any).reason).toBe('aborted');
    });
  });

  describe('request construction', () => {
    it('sends expected POST body with model, context, options', async () => {
      const response = {
        ok: true,
        body: {
          getReader: () => createMockReader([makeDataLine({ type: 'done', usage: {} })]),
        },
      };
      fetchMock.mockResolvedValueOnce(response);

      const model = { id: 'gpt-4' };
      const context = { messages: [{ role: 'user', content: 'hi' }] };
      const streamOptions = { sessionId: 'sess123' };
      const options = {
        authToken: 'token123',
        proxyUrl: 'https://proxy',
        temperature: 0.5,
        maxTokens: 100,
        reasoning: 'advanced',
        signal: signalMock,
      };

      const stream = createProxyStream(options)(model, context, streamOptions);
      await collectAsync(stream);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, fetchOptions] = fetchMock.mock.calls[0];
      expect(url).toBe('https://proxy/api/stream');
      expect(fetchOptions.method).toBe('POST');
      expect(fetchOptions.headers['Authorization']).toBe('Bearer token123');
      expect(fetchOptions.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(fetchOptions.body as string);
      expect(body.model).toStrictEqual(model);
      expect(body.context).toStrictEqual(context);
      expect(body.options).toEqual({
        temperature: 0.5,
        maxTokens: 100,
        reasoning: 'advanced',
        sessionId: 'sess123',
      });
    });
  });
});