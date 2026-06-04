import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamBuffer, getProviderBufferConfig, createStreamBuffer } from './stream-buffer.js';

describe('StreamBuffer', () => {
  let buffer;
  let clock;

  beforeEach(() => {
    clock = vi.useFakeTimers();
    buffer = new StreamBuffer({ minChunkSize: 8, maxDelay: 50, accumulationMs: 16 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should set default config values', () => {
      const b = new StreamBuffer();
      expect(b.config.minChunkSize).toBe(8);
      expect(b.config.maxDelay).toBe(50);
      expect(b.config.accumulationMs).toBe(16);
      expect(b.config.minBufferCount).toBe(3);
      expect(b.config.adaptive).toBe(true);
    });

    it('should accept custom config', () => {
      const b = new StreamBuffer({ minChunkSize: 10, maxDelay: 100 });
      expect(b.config.minChunkSize).toBe(10);
      expect(b.config.maxDelay).toBe(100);
    });
  });

  describe('add()', () => {
    it('should flush immediately when buffer reaches minChunkSize', () => {
      buffer = new StreamBuffer({ minChunkSize: 8, adaptive: false });
      const result = buffer.add('12345678'); // exactly 8
      expect(result).toBe('12345678');
      expect(buffer.size).toBe(0);
    });

    it('should not flush immediately when buffer below threshold', () => {
      buffer = new StreamBuffer({ minChunkSize: 8, adaptive: false, maxDelay: 1000 });
      const result = buffer.add('1234'); // 4 chars
      expect(result).toBeNull();
      expect(buffer.size).toBe(4);
      // Should have scheduled a flush timer
      expect(buffer.flushTimeout).toBeDefined();
    });

    it('should flush when maxDelay exceeded', () => {
      buffer = new StreamBuffer({ minChunkSize: 8, adaptive: false, maxDelay: 50 });
      buffer.add('1234'); // 4 chars, below threshold, schedules timer
      // Fast-forward time beyond maxDelay
      clock.advanceTimersByTime(60);
      // The timer should have fired and flushed
      expect(buffer.size).toBe(0);
    });

    it('should accumulate multiple adds before flushing if threshold not reached', () => {
      buffer = new StreamBuffer({ minChunkSize: 20, adaptive: false, maxDelay: 1000 });
      buffer.add('12345');
      expect(buffer.size).toBe(5);
      buffer.add('67890'); // total 10, still below threshold 20
      expect(buffer.size).toBe(10);
    });
  });

  describe('flush()', () => {
    it('should return current buffer and clear it', () => {
      buffer = new StreamBuffer({ adaptive: false, minChunkSize: 20, maxDelay: 1000 });
      buffer.add('hello');
      buffer.add('world');
      expect(buffer.size).toBe(10);
      const flushed = buffer.flush();
      expect(flushed).toBe('helloworld');
      expect(buffer.size).toBe(0);
      expect(buffer.chunks.length).toBe(0);
    });

    it('should cancel any pending flush timer', () => {
      buffer = new StreamBuffer({ adaptive: false, minChunkSize: 8, maxDelay: 1000 });
      buffer.add('1234'); // schedules timer
      expect(buffer.flushTimeout).toBeDefined();
      buffer.flush();
      expect(buffer.flushTimeout).toBeNull();
    });
  });

  describe('getAdaptiveThreshold()', () => {
    it('returns minChunkSize when adaptive is false', () => {
      buffer = new StreamBuffer({ adaptive: false, minChunkSize: 8 });
      expect(buffer.getAdaptiveThreshold()).toBe(8);
    });

    it('reduces threshold when avg latency < 20ms', () => {
      buffer = new StreamBuffer({ minChunkSize: 8 });
      buffer.avgLatency = 10;
      expect(buffer.getAdaptiveThreshold()).toBe(4); // 8-4=4
    });

    it('increases threshold when avg latency > 100ms', () => {
      buffer = new StreamBuffer({ minChunkSize: 8 });
      buffer.avgLatency = 150;
      expect(buffer.getAdaptiveThreshold()).toBe(16); // 8*2
    });

    it('returns minChunkSize for mid latency', () => {
      buffer = new StreamBuffer({ minChunkSize: 8 });
      buffer.avgLatency = 50;
      expect(buffer.getAdaptiveThreshold()).toBe(8);
    });
  });

  describe('scheduleFlush()', () => {
    it('should set a timeout to flush after accumulationMs', () => {
      buffer = new StreamBuffer({ accumulationMs: 16 });
      buffer.add('a');
      expect(buffer.flushTimeout).toBeDefined();
      clock.advanceTimersByTime(16);
      // timer should have fired
      expect(buffer.size).toBe(0);
    });

    it('should not schedule multiple timers', () => {
      buffer.add('a');
      buffer.add('b');
      expect(buffer.flushTimeout).toBeDefined();
      const firstTimer = buffer.flushTimeout;
      buffer.scheduleFlush(); // called internally on each add; but we can call explicitly
      expect(buffer.flushTimeout).toBe(firstTimer);
    });
  });

  describe('reset()', () => {
    it('should clear buffer and metrics', () => {
      buffer = new StreamBuffer();
      buffer.add('hello');
      buffer.flush();
      // Simulate some latency
      buffer.chunkCount = 10;
      buffer.totalLatency = 500;
      buffer.avgLatency = 50;
      buffer.reset();
      expect(buffer.size).toBe(0);
      expect(buffer.chunks.length).toBe(0);
      expect(buffer.chunkCount).toBe(0);
      expect(buffer.totalLatency).toBe(0);
      expect(buffer.avgLatency).toBe(50); // initial default
    });
  });

  describe('getMetrics()', () => {
    it('should return current metrics', () => {
      buffer = new StreamBuffer({ minChunkSize: 8 });
      buffer.add('abc'); // below threshold
      const metrics = buffer.getMetrics();
      expect(metrics).toHaveProperty('avgLatency');
      expect(metrics).toHaveProperty('threshold');
      expect(metrics).toHaveProperty('bufferSize');
    });
  });
});

describe('StreamBuffer provider helpers', () => {
  it('getProviderBufferConfig returns config for known provider', () => {
    const cfg = getProviderBufferConfig('openai');
    expect(cfg.minChunkSize).toBe(4);
    expect(cfg.maxDelay).toBe(16);
  });

  it('getProviderBufferConfig returns default for unknown', () => {
    const cfg = getProviderBufferConfig('unknown');
    expect(cfg.minChunkSize).toBe(8);
    expect(cfg.maxDelay).toBe(50);
  });

  it('createStreamBuffer creates with provider config', () => {
    const buffer = createStreamBuffer('anthropic');
    expect(buffer.config.minChunkSize).toBe(8);
    expect(buffer.config.maxDelay).toBe(32);
  });
});
