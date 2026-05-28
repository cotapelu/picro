import { describe, it, expect } from 'vitest';
import { MessageQueue, QueueMode } from './message-queue.js';
import type { ConversationTurn } from './types.js';

// Helper to create a ConversationTurn with unique reference
function createTurn(id: number): ConversationTurn {
  return {
    role: 'user',
    content: [{ type: 'text', text: `msg${id}` }],
    timestamp: Date.now(),
  };
}

describe('MessageQueue', () => {
  describe('constructor', () => {
    it('creates queue with default mode dequeue-one and no maxSize', () => {
      const queue = new MessageQueue();
      expect(queue.getMode()).toBe('dequeue-one');
      expect(queue.hasPending).toBe(false);
      expect(queue.size).toBe(0);
    });

    it('creates queue with custom mode and maxSize', () => {
      const queue = new MessageQueue('drain-all', 10);
      expect(queue.getMode()).toBe('drain-all');
    });
  });

  describe('enqueue and dequeue (FIFO)', () => {
    it('enqueues items and dequeues in order', () => {
      const queue = new MessageQueue();
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      queue.enqueue(t1);
      queue.enqueue(t2);
      expect(queue.size).toBe(2);
      expect(queue.dequeue()).toBe(t1);
      expect(queue.dequeue()).toBe(t2);
      expect(queue.dequeue()).toBeNull();
      expect(queue.hasPending).toBe(false);
    });

    it('size reflects pending items', () => {
      const queue = new MessageQueue();
      queue.enqueue(createTurn(1));
      expect(queue.size).toBe(1);
      queue.enqueue(createTurn(2));
      expect(queue.size).toBe(2);
      queue.dequeue();
      expect(queue.size).toBe(1);
    });
  });

  describe('hasPending', () => {
    it('false when empty', () => {
      const queue = new MessageQueue();
      expect(queue.hasPending).toBe(false);
    });

    it('true when items present', () => {
      const queue = new MessageQueue();
      queue.enqueue(createTurn(1));
      expect(queue.hasPending).toBe(true);
    });
  });

  describe('drainAll', () => {
    it('returns all pending items and clears queue', () => {
      const queue = new MessageQueue();
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      queue.enqueue(t1);
      queue.enqueue(t2);
      const drained = queue.drainAll();
      expect(drained).toEqual([t1, t2]);
      expect(queue.hasPending).toBe(false);
      expect(queue.size).toBe(0);
    });

    it('returns empty array when empty', () => {
      const queue = new MessageQueue();
      expect(queue.drainAll()).toEqual([]);
    });
  });

  describe('clear and reset', () => {
    it('clear empties the queue', () => {
      const queue = new MessageQueue();
      queue.enqueue(createTurn(1));
      queue.enqueue(createTurn(2));
      queue.clear();
      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });

    it('reset is alias for clear', () => {
      const queue = new MessageQueue();
      queue.enqueue(createTurn(1));
      queue.reset();
      expect(queue.size).toBe(0);
    });
  });

  describe('peek', () => {
    it('returns copy of pending items without removing', () => {
      const queue = new MessageQueue();
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      queue.enqueue(t1);
      queue.enqueue(t2);
      const peeked = queue.peek();
      expect(peeked).toEqual([t1, t2]);
      expect(queue.size).toBe(2);
    });

    it('returns empty array when empty', () => {
      const queue = new MessageQueue();
      expect(queue.peek()).toEqual([]);
    });
  });

  describe('setMode and getMode', () => {
    it('can change mode', () => {
      const queue = new MessageQueue('drain-all');
      expect(queue.getMode()).toBe('drain-all');
      queue.setMode('dequeue-one');
      expect(queue.getMode()).toBe('dequeue-one');
    });
  });

  describe('maxSize handling', () => {
    it('evicts oldest when exceeding maxSize', () => {
      const queue = new MessageQueue('dequeue-one', 3);
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      const t3 = createTurn(3);
      const t4 = createTurn(4);

      queue.enqueue(t1);
      queue.enqueue(t2);
      queue.enqueue(t3);
      expect(queue.size).toBe(3);
      expect(queue.peek()).toEqual([t1, t2, t3]);

      queue.enqueue(t4); // should evict t1
      expect(queue.size).toBe(3);
      expect(queue.peek()).toEqual([t2, t3, t4]);
    });

    it('dequeues in correct order after eviction', () => {
      const queue = new MessageQueue('dequeue-one', 2);
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      const t3 = createTurn(3);
      queue.enqueue(t1);
      queue.enqueue(t2);
      queue.enqueue(t3); // evicts t1
      expect(queue.dequeue()).toBe(t2);
      expect(queue.dequeue()).toBe(t3);
      expect(queue.dequeue()).toBeNull();
    });

    it('handles many enqueues/dequeues with compression', () => {
      const maxSize = 2000;
      const queue = new MessageQueue('dequeue-one', maxSize);
      // Enqueue 1500 items
      const initial = Array.from({ length: 1500 }, (_, i) => createTurn(i));
      for (const t of initial) {
        queue.enqueue(t);
      }
      expect(queue.size).toBe(1500);
      // Dequeue 1200 items
      for (let i = 0; i < 1200; i++) {
        queue.dequeue();
      }
      // Enqueue 100 new items
      const newer = Array.from({ length: 100 }, (_, i) => createTurn(1500 + i));
      for (const t of newer) {
        queue.enqueue(t);
      }
      // Size: 1500 - 1200 + 100 = 400
      expect(queue.size).toBe(400);
      const all = queue.peek();
      expect(all).toHaveLength(400);
      // The first item should be initial[1200]
      expect(all[0]).toEqual(initial[1200]);
      // The last item should be newer[99]
      expect(all[399]).toEqual(newer[99]);
    });
  });

  describe('edge cases', () => {
    it('peek after clear returns empty', () => {
      const queue = new MessageQueue();
      queue.enqueue(createTurn(1));
      queue.clear();
      expect(queue.peek()).toEqual([]);
    });

    it('drainAll after some dequeues returns only remaining', () => {
      const queue = new MessageQueue();
      const t1 = createTurn(1);
      const t2 = createTurn(2);
      const t3 = createTurn(3);
      queue.enqueue(t1);
      queue.enqueue(t2);
      queue.enqueue(t3);
      queue.dequeue();
      const drained = queue.drainAll();
      expect(drained).toEqual([t2, t3]);
    });

    it('handles multiple clear/reset cycles', () => {
      const queue = new MessageQueue();
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createTurn(i));
        queue.clear();
        expect(queue.size).toBe(0);
      }
    });
  });
});
