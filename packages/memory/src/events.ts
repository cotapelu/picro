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

export class MemoryEventLog {
  private events: MemoryEvent[] = [];

  log(
    action: MemoryEvent['action'], 
    memoryId: string, 
    content?: string, 
    query?: string, 
    beforeHash?: string, 
    afterHash?: string
  ) {
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

  getEvents(): MemoryEvent[] {
    return this.events;
  }

  replay(): { verified: boolean; errors: string[] } {
    // Placeholder for replay verification
    // Could verify hash consistency across operations
    return { verified: true, errors: [] };
  }

  clear(): void {
    this.events = [];
  }

  count(): number {
    return this.events.length;
  }

  // Get events by action type
  getByAction(action: MemoryEvent['action']): MemoryEvent[] {
    return this.events.filter(e => e.action === action);
  }

  // Get events for a specific memory
  getByMemoryId(memoryId: string): MemoryEvent[] {
    return this.events.filter(e => e.memoryId === memoryId);
  }

  // Get recent events
  getRecent(limit: number = 10): MemoryEvent[] {
    return this.events.slice(-limit);
  }
}