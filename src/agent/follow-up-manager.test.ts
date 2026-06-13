import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FollowUpManager } from './follow-up-manager';
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
    it('returns only queue turns when no hook provided', async () => {
      const turn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
        timestamp: Date.now(),
      };
      queue.enqueue(turn);

      const result = await manager.collect(queue);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(turn);
    });

    it('combines queue turns with hook turns when hook provided', async () => {
      const queueTurn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'from queue' }],
        timestamp: Date.now(),
      };
      queue.enqueue(queueTurn);

      const hookTurn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'from hook' }],
        timestamp: Date.now(),
      };
      const hook = vi.fn().mockResolvedValue([hookTurn]);

      const result = await manager.collect(queue, hook);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(queueTurn);
      expect(result[1]).toBe(hookTurn);
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('returns only queue turns when hook throws error', async () => {
      const queueTurn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'from queue' }],
        timestamp: Date.now(),
      };
      queue.enqueue(queueTurn);

      const hook = vi.fn().mockRejectedValue(new Error('hook error'));

      const result = await manager.collect(queue, hook, false); // debug=false
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(queueTurn);
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('logs error in debug mode when hook fails', async () => {
      const queueTurn: ConversationTurn = {
        role: 'user',
        content: [{ type: 'text', text: 'from queue' }],
        timestamp: Date.now(),
      };
      queue.enqueue(queueTurn);

      const hook = vi.fn().mockRejectedValue(new Error('hook error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await manager.collect(queue, hook, true); // debug=true

      expect(consoleSpy).toHaveBeenCalledWith('getFollowUpMessages hook failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('returns empty array when queue is empty and hook returns empty', async () => {
      const hook = vi.fn().mockResolvedValue([]);
      const result = await manager.collect(queue, hook);
      expect(result).toHaveLength(0);
    });

    it('preserves order: queue turns first, then hook turns', async () => {
      const hookTurns: ConversationTurn[] = [
        { role: 'user', content: [{ type: 'text', text: 'h1' }], timestamp: 1 },
        { role: 'user', content: [{ type: 'text', text: 'h2' }], timestamp: 2 },
      ];
      const queueTurns: ConversationTurn[] = [
        { role: 'user', content: [{ type: 'text', text: 'q1' }], timestamp: 3 },
        { role: 'user', content: [{ type: 'text', text: 'q2' }], timestamp: 4 },
      ];
      const hook = vi.fn().mockResolvedValue(hookTurns);
      for (const turn of queueTurns) queue.enqueue(turn);

      const result = await manager.collect(queue, hook);
      expect(result).toEqual([...queueTurns, ...hookTurns]);
    });
  });

  describe('toText', () => {
    it('extracts text from all turns', () => {
      const turns: ConversationTurn[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
          ],
          timestamp: 1,
        },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
          timestamp: 2,
        },
      ];

      const text = manager.toText(turns);
      expect(text).toBe('Hello\nWorld\nResponse');
    });

    it('handles turns with non-text content gracefully', () => {
      const turns: ConversationTurn[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Text only' },
            { type: 'image', mimeType: 'image/png', data: 'base64...' },
          ],
          timestamp: 1,
        },
      ];

      const text = manager.toText(turns);
      expect(text).toBe('Text only');
    });

    it('returns empty string for empty array', () => {
      expect(manager.toText([])).toBe('');
    });

    it('joins multiple text blocks with no separator', () => {
      const turns: ConversationTurn[] = [
        { role: 'user', content: [{ type: 'text', text: 'A' }], timestamp: 1 },
        { role: 'user', content: [{ type: 'text', text: 'B' }], timestamp: 2 },
        { role: 'user', content: [{ type: 'text', text: 'C' }], timestamp: 3 },
      ];
      expect(manager.toText(turns)).toBe('A\nB\nC');
    });
  });
});
