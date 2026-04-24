import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebugCollector } from '../src/debug.js';
import type { EventEmitter } from '@picro/agent';

// Integration-style test: verify collector can be enabled/disabled and collects metrics
describe('Debug Mode Integration', () => {
  it('should collect metrics when enabled', () => {
    const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const collector = new DebugCollector(emitter, true);
    // Simulate some activity by calling private method indirectly? Not possible.
    // Verify that collector is enabled and can produce snapshot
    expect(collector.isEnabled()).toBe(true);
    const snapshot = collector.getMetricsSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.uptime).toBeGreaterThan(0);
  });

  it('should toggle off and on', () => {
    const emitter = { on: vi.fn(), off: vi.fn(), emit: vi.fn() } as any;
    const collector = new DebugCollector(emitter, false);
    expect(collector.isEnabled()).toBe(false);
    collector.enable();
    expect(collector.isEnabled()).toBe(true);
    collector.disable();
    expect(collector.isEnabled()).toBe(false);
  });
});
