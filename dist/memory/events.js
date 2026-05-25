/**
 * Event Logging
 * Audit trail for memory operations
 */
export class MemoryEventLog {
    events = [];
    log(action, memoryId, content, query, beforeHash, afterHash) {
        this.events.push({
            timestamp: Date.now(),
            action,
            memoryId,
            content,
            query,
            beforeHash,
            afterHash,
        });
    }
    getEvents() {
        return this.events;
    }
    replay() {
        // Placeholder for replay verification
        // Could verify hash consistency across operations
        return { verified: true, errors: [] };
    }
    clear() {
        this.events = [];
    }
    count() {
        return this.events.length;
    }
    // Get events by action type
    getByAction(action) {
        return this.events.filter(e => e.action === action);
    }
    // Get events for a specific memory
    getByMemoryId(memoryId) {
        return this.events.filter(e => e.memoryId === memoryId);
    }
    // Get recent events
    getRecent(limit = 10) {
        return this.events.slice(-limit);
    }
}
//# sourceMappingURL=events.js.map