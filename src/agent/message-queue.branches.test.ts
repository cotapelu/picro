// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for MessageQueue.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageQueue, QueueMode } from './message-queue.js';
import type { ConversationTurn } from './types.js';

function mockTurn(text: string): ConversationTurn {
  return {
    role: 'user',
    content: [{ type: 'text', text }],
    timestamp: Date.now(),
  };
}

describe('MessageQueue branch coverage', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue();
  });

  describe('enqueue', () => {
    it('adds item to storage', () => {
      queue.enqueue(mockTurn('a'));
      expect(queue.size).toBe(1);
      expect(queue.hasPending).toBe(true);
    });

    it('respects maxSize by evicting oldest', () => {
      queue = new MessageQueue(undefined, 2);
      queue.enqueue(mockTurn('1'));
      queue.enqueue(mockTurn('2'));
      queue.enqueue(mockTurn('3'));
      expect(queue.size).toBe(2);
      const items = queue.drainAll();
      expect(items.map(t => t.content[0].text)).toEqual(['2', '3']);
    });

    it('compacts storage when head exceeds 1000', () => {
      // Note: compression runs only when maxSize is set
      queue = new MessageQueue(undefined, 10000);
      // Simulate condition: head > 1000
      (queue as any).head = 1001;
      (queue as any).storage = Array(1101).fill(null).map((_, i) => mockTurn(String(i)));
      queue.enqueue(mockTurn('new'));
      // After compaction, head should reset to 0 and storage contains remaining items
      expect((queue as any).head).toBe(0);
      expect((queue as any).storage.length).toBeGreaterThan(0);
    });
  });

  describe('dequeue', () => {
    it('returns null when empty', () => {
      expect(queue.dequeue()).toBeNull();
    });

    it('returns first pending and advances head', () => {
      queue.enqueue(mockTurn('a'));
      queue.enqueue(mockTurn('b'));
      const t1 = queue.dequeue();
      expect(t1?.content[0].text).toBe('a');
      expect(queue.size).toBe(1);
      const t2 = queue.dequeue();
      expect(t2?.content[0].text).toBe('b');
      expect(queue.size).toBe(0);
    });
  });

  describe('drainAll', () => {
    it('returns empty when no pending', () => {
      expect(queue.drainAll()).toEqual([]);
    });

    it('returns all pending and clears queue', () => {
      queue.enqueue(mockTurn('a'));
      queue.enqueue(mockTurn('b'));
      const all = queue.drainAll();
      expect(all.length).toBe(2);
      expect(all[0].content[0].text).toBe('a');
      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });

    it('does not return already drained items on second call', () => {
      queue.enqueue(mockTurn('x'));
      queue.drainAll();
      expect(queue.drainAll()).toEqual([]);
    });
  });

  describe('hasPending and size', () => {
    it('hasPending false when empty', () => {
      expect(queue.hasPending).toBe(false);
    });

    it('size 0 when empty', () => {
      expect(queue.size).toBe(0);
    });
  });

  describe('mode operations', () => {
    it('setMode/getMode work', () => {
      queue.setMode('drain-all' as QueueMode);
      expect(queue.getMode()).toBe('drain-all');
    });
  });

  describe('clear', () => {
    it('clears all data', () => {
      queue.enqueue(mockTurn('a'));
      queue.enqueue(mockTurn('b'));
      queue.clear();
      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears storage but retains mode', () => {
      queue.enqueue(mockTurn('a'));
      queue.setMode('drain-all' as QueueMode);
      queue.reset();
      expect(queue.size).toBe(0);
      expect(queue.getMode()).toBe('drain-all');
    });
  });

  describe('peek', () => {
    it('returns snapshot without removing', () => {
      queue.enqueue(mockTurn('a'));
      queue.enqueue(mockTurn('b'));
      const snapshot = queue.peek();
      expect(snapshot.length).toBe(2);
      expect(queue.size).toBe(2); // still there
    });

    it('returns empty array when no pending', () => {
      expect(queue.peek()).toEqual([]);
    });
  });
});
