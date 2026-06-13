// SPDX-License-Identifier: Apache-2.0
/**
 * FollowUpManager: Centralizes follow-up message collection logic.
 * Extracted from AgentLoop to reduce duplication and improve clarity.
 */

import type { ConversationTurn } from './types.js';
import { MessageQueue } from './message-queue.js';

/**
 * Manages collection of follow-up turns from queue and hook.
 */
export class FollowUpManager {
  /**
   * Collect follow-up turns from the queue and optional hook.
   * @param followUpQueue - Queue containing follow-up messages
   * @param getFollowUpMessagesHook - Optional async hook to get additional follow-ups
   * @param debug - Whether to log debug info
   * @returns Combined follow-up turns
   */
  async collect(
    followUpQueue: MessageQueue,
    getFollowUpMessagesHook?: () => Promise<ConversationTurn[]>,
    debug?: boolean
  ): Promise<ConversationTurn[]> {
    const queueTurns = followUpQueue.drainAll();

    if (!getFollowUpMessagesHook) {
      return queueTurns;
    }

    try {
      const hookTurns = await getFollowUpMessagesHook();
      return [...queueTurns, ...hookTurns];
    } catch (e) {
      this.logError(e, debug);
      return queueTurns;
    }
  }

  /**
   * Convert follow-up turns to text for prompt construction.
   * @param turns - The follow-up turns
   * @returns Concatenated text content
   */
  toText(turns: ConversationTurn[]): string {
    const parts: string[] = [];
    for (const turn of turns) {
      for (const block of turn.content) {
        if (block.type === 'text') {
          parts.push(block.text);
        }
      }
    }
    return parts.join('\n');
  }

  private logError(error: unknown, debug?: boolean): void {
    if (debug) {
      console.error('getFollowUpMessages hook failed:', error);
    } else {
      // Silently ignore in non-debug mode (maintains existing behavior)
    }
  }
}
