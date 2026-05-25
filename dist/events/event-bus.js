"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * EventBus - Channel-based pub/sub events
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Channel-based pub/sub
 * - Error handling trong handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBus = createEventBus;
function createEventBus() {
    const handlers = new Map();
    return {
        emit(channel, data) {
            const channelHandlers = handlers.get(channel);
            if (!channelHandlers)
                return;
            for (const handler of channelHandlers) {
                try {
                    handler(data);
                }
                catch (err) {
                    console.error(`Event handler error (${channel}):`, err);
                }
            }
        },
        on(channel, handler) {
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
        clear() {
            handlers.clear();
        },
    };
}
//# sourceMappingURL=event-bus.js.map