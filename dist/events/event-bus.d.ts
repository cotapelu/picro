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
export declare function createEventBus(): EventBusController;
//# sourceMappingURL=event-bus.d.ts.map