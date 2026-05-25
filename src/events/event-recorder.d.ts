/**
 * Event Recorder - Record and replay events for debugging
 */
import type { AgentEvent } from './events.js';
/**
 * Event recorder options
 */
export interface EventRecorderOptions {
    /** Maximum number of events to keep (0 = unlimited) */
    maxEvents?: number;
    /** Auto-persist to file on each record (optional) */
    persistPath?: string;
    /** Filter event types to record (empty = all) */
    filterTypes?: string[];
}
/**
 * EventRecorder - records events to memory and optionally to disk
 */
export declare class EventRecorder {
    private events;
    private readonly maxEvents;
    private readonly filterTypes;
    private readonly persistPath?;
    constructor(options?: EventRecorderOptions);
    /**
     * Record an event (if passes filter)
     */
    record(event: AgentEvent): void;
    /**
     * Get all recorded events (copy)
     */
    getEvents(): AgentEvent[];
    /**
     * Get event count
     */
    get count(): number;
    /**
     * Clear recorded events
     */
    clear(): void;
    /**
     * Replay events to a target emitter
     */
    replay(target: {
        emit: (e: AgentEvent) => Promise<void> | void;
    }, speedMs?: number): Promise<void>;
    /**
     * Save events to file (JSON)
     */
    save(path?: string): void;
    /**
     * Load events from file
     */
    static load(path: string): EventRecorder;
    /**
     * Persist if persistPath set
     */
    private _persistIfNeeded;
}
//# sourceMappingURL=event-recorder.d.ts.map