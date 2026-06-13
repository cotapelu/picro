import { describe, it, expect, vi } from 'vitest';
import { PrioritizedEventEmitter } from './prioritized-event-emitter.js';

describe('PrioritizedEventEmitter additional branches', () => {
  describe('unlimited buffer (maxBufferSize=0)', () => {
    it('allows unlimited buffering regardless of dropLowPriorityWhenFull', async () => {
      const emitter = new PrioritizedEventEmitter({ maxBufferSize: 0, dropLowPriorityWhenFull: true });
      const count = 100;
      for (let i = 0; i < count; i++) {
        await emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 1 } as any);
      }
      expect(emitter.getDroppedCount()).toBe(0);
    });
  });

  describe('clear method', () => {
    it('clears all queues and resets droppedCount', async () => {
      const emitter = new PrioritizedEventEmitter();
      const handler = vi.fn().mockImplementation(async () => {});
      emitter.on('queue_update', handler);
      await emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 1 } as any);
      await emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 2 } as any);
      // Wait for processing
      await new Promise(r => setTimeout(r, 100));
      emitter.clear();
      const lengths = emitter.getQueueLengths();
      expect(lengths.low).toBe(0);
      expect(emitter.getDroppedCount()).toBe(0);
    });
  });

  describe('clearMetrics method', () => {
    it('resets event metrics to zero', async () => {
      const emitter = new PrioritizedEventEmitter();
      const handler = vi.fn().mockImplementation(async () => {});
      emitter.on('queue_update', handler);
      await emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 1 } as any);
      await emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 2 } as any);
      // Wait for processing to ensure metrics recorded
      await new Promise(r => setTimeout(r, 100));
      let metrics = emitter.getEventMetrics();
      expect(metrics.get('queue_update')?.count).toBeGreaterThan(0);
      emitter.clearMetrics();
      metrics = emitter.getEventMetrics();
      expect(metrics.get('queue_update')).toBeUndefined();
    });
  });

  describe('dropLowPriorityWhenFull=false with retry', () => {
    it('retries instead of dropping low priority when buffer full', async () => {
      const emitter = new PrioritizedEventEmitter({ maxBufferSize: 1, dropLowPriorityWhenFull: false });
      const handler = vi.fn().mockImplementation(async () => {});
      emitter.on('queue_update', handler);
      // First emit fills the buffer (low priority)
      const p1 = emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 1 } as any);
      // Second emit while buffer full: should retry, not drop
      const p2 = emitter.emit({ type: 'queue_update', timestamp: Date.now(), round: 2 } as any);
      await Promise.all([p1, p2]);
      expect(emitter.getDroppedCount()).toBe(0);
      // Wait for processing
      await new Promise(r => setTimeout(r, 100));
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('queue lengths reporting', () => {
    it('reports correct lengths before processing and after', async () => {
      const emitter = new PrioritizedEventEmitter();
      // No listeners for these events; they will stay in queue until we manually clear or process
      const e1 = { type: 'queue_update', timestamp: Date.now(), round: 2 } as any;
      const e2 = { type: 'queue_update', timestamp: Date.now(), round: 3 } as any;
      // Emit without awaiting to avoid yielding
      emitter.emit(e1);
      emitter.emit(e2);
      // Immediately check: events are queued but not yet processed because microtask hasn't run
      let lengths = emitter.getQueueLengths();
      expect(lengths.low).toBe(2);
      // Allow microtask to process
      await new Promise(r => setTimeout(r, 100));
      lengths = emitter.getQueueLengths();
      expect(lengths.low).toBe(0);
    });
  });
});
