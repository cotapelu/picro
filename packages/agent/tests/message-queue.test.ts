import { describe, it, expect, beforeEach } from 'vitest';
import { MessageQueue } from '../src/message-queue';
import type { ConversationTurn } from '../src/types';

describe('MessageQueue', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue('dequeue-one');
  });

  const createTurn = (role: string, content: string): ConversationTurn => ({
    role: role as any,
    content: [{ type: 'text', text: content }],
    timestamp: Date.now(),
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue messages', () => {
      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      expect(queue.size).toBe(2);
      expect(queue.hasPending).toBe(true);
    });

    it('should dequeue one message in dequeue-one mode', () => {
      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      const first = queue.dequeue();
      expect(first?.content[0]).toEqual({ type: 'text', text: 'Hello' });
      expect(queue.size).toBe(1);

      const second = queue.dequeue();
      expect(second?.content[0]).toEqual({ type: 'text', text: 'Hi' });
      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });

    it('should drain all messages in drain-all mode', () => {
      queue.setMode('drain-all');

      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      const drained = queue.drainAll();
      expect(drained.length).toBe(2);
      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });

    it('should return null when dequeueing from empty queue', () => {
      const result = queue.dequeue();
      expect(result).toBeNull();
    });

    it('should peek without removing', () => {
      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      const peeked = queue.peek();
      expect(peeked.length).toBe(2);

      // Verify not removed
      expect(queue.size).toBe(2);
    });
  });

  describe('clear and reset', () => {
    it('should clear all messages', () => {
      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      queue.clear();

      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });

    it('should reset while keeping capacity', () => {
      queue.enqueue(createTurn('user', 'Hello'));
      queue.enqueue(createTurn('assistant', 'Hi'));

      queue.reset();

      expect(queue.size).toBe(0);
      expect(queue.hasPending).toBe(false);
    });
  });

  describe('mode switching', () => {
    it('should change processing mode', () => {
      expect(queue.getMode()).toBe('dequeue-one');

      queue.setMode('drain-all');
      expect(queue.getMode()).toBe('drain-all');
    });
  });
});
