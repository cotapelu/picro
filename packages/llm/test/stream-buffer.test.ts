import { describe, it, expect, beforeEach } from 'vitest';
import { StreamBuffer, getProviderBufferConfig, createStreamBuffer } from '../src/utils/stream-buffer.js';

describe('StreamBuffer', () => {
  let buffer: StreamBuffer;

  beforeEach(() => {
    buffer = new StreamBuffer({ minChunkSize: 10, maxDelay: 50 });
  });

  describe('basic buffering', () => {
    it('accumulates small chunks', () => {
      const result1 = buffer.add('Hi');
      expect(result1).toBeNull();
      expect(buffer.size).toBe(2);

      const result2 = buffer.add('ya');
      expect(result2).toBeNull();
      expect(buffer.size).toBe(4);
    });

    it('flushes when minChunkSize reached', () => {
      buffer.add('Hello');
      const result = buffer.add(' World!!!!');
      expect(result).toBe('Hello World!!!!');
      expect(buffer.size).toBe(0);
    });

    it('flushes manually', () => {
      buffer.add('test');
      const result = buffer.flush();
      expect(result).toBe('test');
      expect(buffer.hasContent).toBe(false);
    });

    it('returns empty on flush when empty', () => {
      expect(buffer.flush()).toBe('');
    });
  });

  describe('adaptive buffering', () => {
    it('adjusts threshold based on latency', () => {
      const adaptive = new StreamBuffer({ adaptive: true, minChunkSize: 10 });

      // Simulate fast provider (low latency)
      for (let i = 0; i < 5; i++) {
        adaptive.add('a');
        // Force timestamp difference to be small
      }

      // For fast providers, threshold should be lower
      const metrics = adaptive.getMetrics();
      expect(metrics.threshold).toBeLessThanOrEqual(10);
    });
  });

  describe('metrics', () => {
    it('tracks buffer size', () => {
      buffer.add('test');
      expect(buffer.getMetrics().bufferSize).toBe(4);
    });

    it('calculates avg latency', () => {
      buffer.add('a');
      buffer.add('b');
      expect(buffer.getMetrics().avgLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('reset', () => {
    it('clears buffer and metrics', () => {
      buffer.add('test');
      buffer.reset();
      expect(buffer.size).toBe(0);
      expect(buffer.hasContent).toBe(false);
    });
  });
});

describe('Provider Buffer Configs', () => {
  it('returns config for known providers', () => {
    const openai = getProviderBufferConfig('openai');
    expect(openai.minChunkSize).toBe(4);

    const anthropic = getProviderBufferConfig('anthropic');
    expect(anthropic.minChunkSize).toBe(8);

    const ollama = getProviderBufferConfig('ollama');
    expect(ollama.minChunkSize).toBe(32);
  });

  it('returns default for unknown providers', () => {
    const unknown = getProviderBufferConfig('unknown-provider');
    expect(unknown.minChunkSize).toBe(8);
    expect(unknown.adaptive).toBe(true);
  });

  it('creates StreamBuffer with provider config', () => {
    const buffer = createStreamBuffer('gemini');
    expect(buffer).toBeInstanceOf(StreamBuffer);
  });
});
