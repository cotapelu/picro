#!/usr/bin/env node
/**
 * Debug Mode Collector
 * Collects metrics from agent events and logs to file
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { EventEmitter } from '@picro/agent';
import type {
  AgentEvent,
  LLMResponseEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  MemoryRetrievalEvent,
  TurnEndEvent,
} from '@picro/agent';

export interface DebugMetrics {
  // LLM
  llmLatencies: number[]; // ms
  llmTokens: number[];
  // Tools
  toolExecTimes: Record<string, number>; // tool name -> ms (as object for serialization)
  toolCallsCount: number;
  toolErrorsCount: number;
  // Memory
  memoryRetrievalTimes: number[]; // ms
  memoryCounts: number[];
  // Session
  totalRounds: number;
  // Computed (may be undefined in partial snapshots)
  uptime?: number;
  llmLatencyAvg?: number;
  llmTokenTotal?: number;
  memoryRetrievalCount?: number;
  memoryCountAvg?: number;
  startTime: number;
}

export class DebugCollector {
  private emitter: EventEmitter;
  private metrics: DebugMetrics;
  private logPath: string;
  private enabled: boolean;
  private logStream?: fs.WriteStream;

  constructor(emitter: EventEmitter, enabled: boolean = false) {
    this.emitter = emitter;
    this.enabled = enabled;
    this.metrics = {
      llmLatencies: [],
      llmTokens: [],
      toolExecTimes: {},
      toolCallsCount: 0,
      toolErrorsCount: 0,
      memoryRetrievalTimes: [],
      memoryCounts: [],
      totalRounds: 0,
      startTime: Date.now(),
    };
    this.logPath = path.join(os.homedir(), '.picro', 'agent', 'debug.log');
    if (enabled) {
      this.initLogFile();
      this.setupListeners();
    }
  }

  private initLogFile(): void {
    try {
      const logDir = path.dirname(this.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      // Append mode
      this.logStream = fs.createWriteStream(this.logPath, { flags: 'a' });
      this.logEvent({ type: 'debug_start', timestamp: Date.now() });
    } catch (e) {
      console.warn('Failed to open debug log:', e);
    }
  }

  private setupListeners(): void {
    // Track LLM request timestamps by round
    const requestTimestamps = new Map<number, number>();

    // LLM request: record start time
    this.emitter.on('llm:request', (event: any) => {
      const round = event.round || 0;
      requestTimestamps.set(round, Date.now());
    });

    // LLM response: measure latency and tokens
    this.emitter.on('llm:response', (event: LLMResponseEvent) => {
      const round = event.round || 0;
      const startTime = requestTimestamps.get(round);
      if (startTime) {
        const latency = Date.now() - startTime;
        this.metrics.llmLatencies.push(latency);
        requestTimestamps.delete(round);
      }
      const tokens = event.tokensUsed; // Changed from event.metadata.tokensUsed
      this.metrics.llmTokens.push(tokens);
      this.logEvent({
        type: 'llm_response',
        timestamp: event.timestamp,
        round,
        tokensUsed: tokens,
        toolCallsCount: event.toolCallsCount, // Changed from event.metadata.toolCallsCount
      });
    });

    // Tool result: measure execution time (track from tool:call:start to tool:call:end)
    // We'll store call timestamp per toolCallId
    const callTimestamps = new Map<string, number>();
    this.emitter.on('tool:call:start', (event: ToolCallStartEvent) => {
      const toolName = event.toolName;
      this.metrics.toolCallsCount++;
      callTimestamps.set(event.toolCallId, Date.now());
    });

    this.emitter.on('tool:call:end', (event: ToolCallEndEvent) => {
      const toolName = event.toolName;
      const callTime = callTimestamps.get(event.toolCallId);
      if (callTime) {
        const duration = Date.now() - callTime;
        this.metrics.toolExecTimes[toolName] = (this.metrics.toolExecTimes[toolName] || 0) + duration;
        callTimestamps.delete(event.toolCallId);
      }
      if (event.result.isError) {
        this.metrics.toolErrorsCount++;
      }
      let resultLength = 0;
      if (!event.result.isError) {
        // SuccessfulToolResult has a 'result' property of type string
        const successful = event.result;
        if (typeof successful.result === 'string') {
          resultLength = successful.result.length;
        }
      }
      this.logEvent({
        type: 'tool_result',
        timestamp: event.timestamp,
        toolName,
        isError: event.result.isError,
        resultLength: resultLength,
      });
    });

    // Memory retrieve
    this.emitter.on('memory:retrieve', (event: MemoryRetrievalEvent) => {
      // We don't have direct time measurement, but we can log count and scores
      this.metrics.memoryCounts.push(event.memoriesRetrieved);
      this.logEvent({
        type: 'memory_retrieve',
        timestamp: event.timestamp,
        query: event.query,
        memoryCount: event.memoriesRetrieved,
        scores: event.scores,
      });
    });

    // Round start/end could track round count
    this.emitter.on('turn:end', () => {
      this.metrics.totalRounds++;
    });
  }

  private logEvent(event: Record<string, any>): void {
    if (!this.logStream) return;
    try {
      this.logStream.write(JSON.stringify(event) + '\n');
    } catch (e) {
      // ignore
    }
  }

  /**
   * Get a snapshot of current metrics
   */
  getMetricsSnapshot(): Partial<DebugMetrics> {
    const snapshot: Partial<DebugMetrics> = {
      uptime: Date.now() - this.metrics.startTime,
      llmLatencyAvg: this.metrics.llmLatencies.length > 0
        ? this.metrics.llmLatencies.reduce((a, b) => a + b, 0) / this.metrics.llmLatencies.length
        : 0,
      llmTokenTotal: this.metrics.llmTokens.reduce((a, b) => a + b, 0),
      toolExecTimes: this.metrics.toolExecTimes,
      toolCallsCount: this.metrics.toolCallsCount,
      toolErrorsCount: this.metrics.toolErrorsCount,
      memoryRetrievalCount: this.metrics.memoryCounts.length,
      memoryCountAvg: this.metrics.memoryCounts.length > 0
        ? this.metrics.memoryCounts.reduce((a, b) => a + b, 0) / this.metrics.memoryCounts.length
        : 0,
      totalRounds: this.metrics.totalRounds,
    };
    return snapshot;
  }

  /**
   * Enable debug logging at runtime
   */
  enable(): void {
    if (!this.enabled) {
      this.enabled = true;
      this.initLogFile();
      this.setupListeners();
    }
  }

  /**
   * Disable debug logging
   */
  disable(): void {
    if (this.enabled) {
      this.enabled = false;
      if (this.logStream) {
        this.logStream.end();
        this.logStream = undefined;
      }
      // Remove listeners? Not needed for process lifetime.
    }
  }

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Close log stream (on exit)
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = undefined;
    }
  }
}
