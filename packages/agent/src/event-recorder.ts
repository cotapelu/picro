// SPDX-License-Identifier: Apache-2.0
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
export class EventRecorder {
  private events: AgentEvent[] = [];
  private readonly maxEvents: number;
  private readonly filterTypes: Set<string>;
  private readonly persistPath?: string;

  constructor(options: EventRecorderOptions = {}) {
    this.maxEvents = options.maxEvents ?? 10000;
    this.filterTypes = new Set(options.filterTypes ?? []);
    this.persistPath = options.persistPath;
  }

  /**
   * Record an event (if passes filter)
   */
  record(event: AgentEvent): void {
    if (this.filterTypes.size > 0 && !this.filterTypes.has(event.type)) {
      return;
    }
    this.events.push(event);
    if (this.maxEvents > 0 && this.events.length > this.maxEvents) {
      this.events.shift();
    }
    this._persistIfNeeded();
  }

  /**
   * Get all recorded events (copy)
   */
  getEvents(): AgentEvent[] {
    return this.events.map(e => ({ ...e }));
  }

  /**
   * Get event count
   */
  get count(): number {
    return this.events.length;
  }

  /**
   * Clear recorded events
   */
  clear(): void {
    this.events = [];
    if (this.persistPath) {
      try {
        // remove file
        // fs.unlinkSync(this.persistPath);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Replay events to a target emitter
   */
  async replay(target: { emit: (e: AgentEvent) => Promise<void> | void }, speedMs: number = 0): Promise<void> {
    for (const ev of this.events) {
      await target.emit(ev);
      if (speedMs > 0) {
        await new Promise(resolve => setTimeout(resolve, speedMs));
      }
    }
  }

  /**
   * Save events to file (JSON)
   */
  save(path?: string): void {
    const filePath = path ?? this.persistPath;
    if (!filePath) return;
    try {
      require('fs').writeFileSync(filePath, JSON.stringify(this.events, null, 2));
    } catch (err) {
      console.error('Failed to save event recording:', err);
    }
  }

  /**
   * Load events from file
   */
  static load(path: string): EventRecorder {
    try {
      const content = require('fs').readFileSync(path, 'utf8');
      const events = JSON.parse(content) as AgentEvent[];
      const recorder = new EventRecorder();
      recorder.events = events;
      return recorder;
    } catch (err) {
      console.error('Failed to load event recording:', err);
      return new EventRecorder();
    }
  }

  /**
   * Persist if persistPath set
   */
  private _persistIfNeeded(): void {
    if (this.persistPath) {
      this.save();
    }
  }
}
