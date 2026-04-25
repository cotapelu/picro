import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebugCollector } from '../src/debug.ts';
import type { EventEmitter } from '@picro/agent';

// Mock EventEmitter
function createMockEmitter(): EventEmitter {
  return {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as any;
}

describe('DebugCollector', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = createMockEmitter();
    // Mock on to return unsubscribe function
    (emitter.on as any).mockReturnValue(() => {});
  });

  it('should initialize with disabled state by default', () => {
    const collector = new DebugCollector(emitter, false);
    expect(collector.isEnabled()).toBe(false);
  });

  it('should initialize with enabled state when debug true', () => {
    const collector = new DebugCollector(emitter, true);
    expect(collector.isEnabled()).toBe(true);
  });

  it('should enable and disable', () => {
    const collector = new DebugCollector(emitter, false);
    collector.enable();
    expect(collector.isEnabled()).toBe(true);
    collector.disable();
    expect(collector.isEnabled()).toBe(false);
  });

  it('should return metrics snapshot', () => {
    const collector = new DebugCollector(emitter, false);
    // Manually set some internal state (via private? we need to emit events, but easier to test snapshot structure)
    const snapshot = collector.getMetricsSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot).toHaveProperty('uptime');
    expect(snapshot).toHaveProperty('llmLatencyAvg');
    expect(snapshot).toHaveProperty('llmTokenTotal');
    expect(snapshot).toHaveProperty('toolCallsCount');
    expect(snapshot).toHaveProperty('toolErrorsCount');
    expect(snapshot).toHaveProperty('memoryRetrievalCount');
    expect(snapshot).toHaveProperty('memoryCountAvg');
    expect(snapshot).toHaveProperty('totalRounds');
  });

  // Can't easily test event handling without deep mocking; trust integration tests
});
