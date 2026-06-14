import { describe, it, expect, vi } from 'vitest';
import { FollowUpManager } from './follow-up-manager.js';
import { MessageQueue } from './message-queue.js';
import type { ConversationTurn } from './types.js';

describe('FollowUpManager', () => {
  let manager: FollowUpManager;
  let queue: MessageQueue;

  beforeEach(() => {
    manager = new FollowUpManager();
    queue = new MessageQueue();
  });

  describe('collect', () => {
    it('returns empty when queue empty and no hook', async () => {
      const result = await manager.collect(queue);
      expect(result).toEqual([]);
    });

    it('returns queued turns', async () => {
      const turn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'queued' }],
        timestamp: Date.now(),
      };
      queue.enqueue(turn);
      const result = await manager.collect(queue);
      expect(result.length).toBe(1);
      expect(result[0].content[0].text).toBe('queued');
    });

    it('appends hook turns after queue turns', async () => {
      queue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'queue' }],
        timestamp: Date.now(),
      } as ConversationTurn);
      const hookTurns: ConversationTurn[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'hook' }],
          timestamp: Date.now(),
        },
      ];
      const getFollowUp = vi.fn().mockResolvedValue(hookTurns);
      const result = await manager.collect(queue, getFollowUp);
      expect(result.length).toBe(2);
      expect(result[1].content[0].text).toBe('hook');
    });

    it('returns queue turns if hook rejects', async () => {
      queue.enqueue({
        role: 'user',
        content: [{ type: 'text', text: 'queue' }],
        timestamp: Date.now(),
      } as ConversationTurn);
      const getFollowUp = vi.fn().mockRejectedValue(new Error('fail'));
      const result = await manager.collect(queue, getFollowUp);
      expect(result.length).toBe(1);
    });
  });

  describe('toText', () => {
    it('joins text blocks with newline', () => {
      const turn: ConversationTurn = {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'World' },
        ],
        timestamp: Date.now(),
      };
      expect(manager.toText([turn])).toBe('Hello\nWorld');
    });

    it('skips non-text blocks', () => {
      const turn: ConversationTurn = {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'thinking' },
          { type: 'text', text: 'Answer' },
        ] as any,
        timestamp: Date.now(),
      };
      expect(manager.toText([turn])).toBe('Answer');
    });
  });
});
