// SPDX-License-Identifier: Apache-2.0
/**
 * Message queue for pending conversation turns.
 * Different implementation: uses array with head index for efficient dequeue.
 */

import type { ConversationTurn } from './types.js';

export type QueueMode = 'drain-all' | 'dequeue-one';

/**
 * Efficient message queue using circular buffer pattern.
 * Internal array never shrinks, uses head index for O(1) dequeue.
 */
export class MessageQueue {
  private storage: ConversationTurn[] = [];
  private head: number = 0;
  private mode: QueueMode;

  constructor(mode: QueueMode = 'dequeue-one') {
    this.mode = mode;
  }

  /**
   * Add a message to the queue.
   */
  enqueue(turn: ConversationTurn): void {
    this.storage.push(turn);
  }

  /**
   * Check if queue has pending messages.
   */
  get hasPending(): boolean {
    return this.head < this.storage.length;
  }

  /**
   * Get number of pending messages.
   */
  get size(): number {
    return this.storage.length - this.head;
  }

  /**
   * Dequeue a single message (FIFO).
   */
  dequeue(): ConversationTurn | null {
    if (!this.hasPending) {
      return null;
    }
    const turn = this.storage[this.head];
    this.head++;
    return turn;
  }

  /**
   * Drain all pending messages and clear the queue.
   */
  drainAll(): ConversationTurn[] {
    if (!this.hasPending) {
      return [];
    }

    const pending = this.storage.slice(this.head);
    this.head = this.storage.length; // Mark all as consumed
    return pending;
  }

  /**
   * Change queue processing mode.
   */
  setMode(mode: QueueMode): void {
    this.mode = mode;
  }

  /**
   * Get current mode.
   */
  getMode(): QueueMode {
    return this.mode;
  }

  /**
   * Clear all pending messages.
   */
  clear(): void {
    this.storage = [];
    this.head = 0;
  }

  /**
   * Reset queue to initial state, clearing all messages.
   */
  reset(): void {
    this.storage = [];
    this.head = 0;
  }

  /**
   * Get a snapshot of pending messages without removing them.
   */
  peek(): ConversationTurn[] {
    return this.storage.slice(this.head);
  }
}
