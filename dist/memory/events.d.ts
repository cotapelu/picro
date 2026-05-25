/**
 * Event Logging
 * Audit trail for memory operations
 */
export interface MemoryEvent {
    timestamp: number;
    action: "SAVE" | "RETRIEVE" | "UPDATE" | "DELETE";
    memoryId: string;
    content?: string;
    query?: string;
    beforeHash?: string;
    afterHash?: string;
}
export declare class MemoryEventLog {
    private events;
    log(action: MemoryEvent['action'], memoryId: string, content?: string, query?: string, beforeHash?: string, afterHash?: string): void;
    getEvents(): MemoryEvent[];
    replay(): {
        verified: boolean;
        errors: string[];
    };
    clear(): void;
    count(): number;
    getByAction(action: MemoryEvent['action']): MemoryEvent[];
    getByMemoryId(memoryId: string): MemoryEvent[];
    getRecent(limit?: number): MemoryEvent[];
}
//# sourceMappingURL=events.d.ts.map