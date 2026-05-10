// SPDX-License-Identifier: Apache-2.0
/**
 * EventBus - Channel-based pub/sub events
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Channel-based pub/sub
 * - Error handling trong handlers
 */

export interface EventBus {
  emit(channel: string, data: unknown): void;
  on(channel: string, handler: (data: unknown) => void): () => void;
}

export interface EventBusController extends EventBus {
  clear(): void;
}

export function createEventBus(): EventBusController {
  const handlers = new Map<string, Set<(data: unknown) => void>>();

  return {
    emit(channel: string, data: unknown): void {
      const channelHandlers = handlers.get(channel);
      if (!channelHandlers) return;

      for (const handler of channelHandlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`Event handler error (${channel}):`, err);
        }
      }
    },

    on(channel: string, handler: (data: unknown) => void): () => void {
      let channelHandlers = handlers.get(channel);
      if (!channelHandlers) {
        channelHandlers = new Set();
        handlers.set(channel, channelHandlers);
      }
      channelHandlers.add(handler);

      return () => {
        channelHandlers?.delete(handler);
      };
    },

    clear(): void {
      handlers.clear();
    },
  };
}