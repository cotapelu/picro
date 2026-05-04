// SPDX-License-Identifier: Apache-2.0
/**
 * Discriminated union types for agent events.
 *
 * Provides strong type safety for event listeners and emitters.
 * All events extend BaseAgentEvent with common fields.
 */

import type { AgentRuntimeState, AgentRunResult, ToolResult, MemoryEntry } from './types';

// ============================================================================
// Base Event Interface
// ============================================================================

/**
 * Base event with common fields.
 */
export interface BaseAgentEvent {
  timestamp: number;
  round: number;
}

// ============================================================================
// Agent Lifecycle Events
// ============================================================================

/**
 * Emitted when an agent run starts.
 */
export interface AgentStartEvent extends BaseAgentEvent {
  type: 'agent:start';
  initialPrompt: string;
}

/**
 * Emitted when an agent run completes.
 */
export interface AgentEndEvent extends BaseAgentEvent {
  type: 'agent:end';
  result: AgentRunResult;
}

// ============================================================================
// Turn Lifecycle Events
// ============================================================================

/**
 * Emitted at the start of each turn (before LLM call).
 */
export interface TurnStartEvent extends BaseAgentEvent {
  type: 'turn:start';
  promptLength: number;
}

/**
 * Emitted at the end of a turn (after tool execution or final answer).
 */
export interface TurnEndEvent extends BaseAgentEvent {
  type: 'turn:end';
  toolCallsExecuted: number;
  hasAssistantContent: boolean;
}

// ============================================================================
// Message Lifecycle Events
// ============================================================================

/**
 * Emitted when a message starts (user, assistant, or tool result).
 */
export interface MessageStartEvent extends BaseAgentEvent {
  type: 'message:start';
  message: any; // AgentMessage - using any temporarily
}

/**
 * Emitted when an assistant message partial is updated during streaming.
 */
export interface MessageUpdateEvent extends BaseAgentEvent {
  type: 'message:update';
  message: any; // Partial assistant message
  delta?: string;
}

/**
 * Emitted when a message ends (final).
 */
export interface MessageEndEvent extends BaseAgentEvent {
  type: 'message:end';
  message: any; // Final message
}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * Emitted when a tool call starts.
 */
export interface ToolCallStartEvent extends BaseAgentEvent {
  type: 'tool:call:start';
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

/**
 * Emitted during tool progress updates (if tool supports streaming).
 */
export interface ToolProgressEvent extends BaseAgentEvent {
  type: 'tool:progress';
  toolCallId: string;
  toolName: string;
  partialResult?: string;
  details?: Record<string, any>;
}

/**
 * Emitted when a tool call ends.
 */
export interface ToolCallEndEvent extends BaseAgentEvent {
  type: 'tool:call:end';
  toolCallId: string;
  toolName: string;
  result: ToolResult;
  isError: boolean;
}

/**
 * Emitted when a tool errors.
 */
export interface ToolErrorEvent extends BaseAgentEvent {
  type: 'tool:error';
  toolName: string;
  toolCallId: string;
  errorMessage: string;
}

// ============================================================================
// LLM Events
// ============================================================================

/**
 * Emitted before an LLM request.
 */
export interface LLMRequestEvent extends BaseAgentEvent {
  type: 'llm:request';
  promptLength: number;
  toolsAvailable: number;
}

/**
 * Emitted after an LLM response.
 */
export interface LLMResponseEvent extends BaseAgentEvent {
  type: 'llm:response';
  tokensUsed: number;
  toolCallsCount: number;
}

// ============================================================================
// Memory Events
// ============================================================================

/**
 * Emitted when memories are retrieved.
 */
export interface MemoryRetrievalEvent extends BaseAgentEvent {
  type: 'memory:retrieve';
  query: string;
  memoriesRetrieved: number;
  memories?: Array<{
    content: string;
    relevance?: number;
    index: number;
  }>;
  scores?: number[];
}

// ============================================================================
// Error Event
// ============================================================================

/**
 * Emitted when an error occurs.
 */
export interface ErrorEvent extends BaseAgentEvent {
  type: 'error';
  message: string;
  stack?: string;
}

// ============================================================================
// Debug Events (optional, only when debug mode enabled)
// ============================================================================

/**
 * Emitted at the end of each round with timing information (debug mode only).
 */
export interface DebugRoundTimingEvent extends BaseAgentEvent {
  type: 'debug:round:timing';
  contextBuildingTime: number;
  memoryRetrievalTime: number;
  llmRequestTime: number;
  toolExecutionTime: number;
  totalRoundTime: number;
}

/**
 * Emitted at the end of the agent run with timing information (debug mode only).
 */
export interface DebugRunTimingEvent extends BaseAgentEvent {
  type: 'debug:run:timing';
  totalRunTime: number;
  totalContextBuildingTime: number;
  totalMemoryRetrievalTime: number;
  totalLLMRequestTime: number;
  totalToolExecutionTime: number;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all possible agent events.
 * Use discriminated union pattern: switch on `event.type` to get narrowed type.
 */
export type AgentEvent =
  | AgentStartEvent
  | AgentEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | MessageStartEvent
  | MessageUpdateEvent
  | MessageEndEvent
  | ToolCallStartEvent
  | ToolProgressEvent
  | ToolCallEndEvent
  | ToolErrorEvent
  | LLMRequestEvent
  | LLMResponseEvent
  | MemoryRetrievalEvent
  | ErrorEvent
  | DebugRoundTimingEvent
  | DebugRunTimingEvent;

// ============================================================================
// Event Handler Type
// ============================================================================

/**
 * Type for event listeners.
 * Receives an event and the current abort signal (if any).
 */
export type AgentEventListener<E extends AgentEvent = AgentEvent> = (
  event: E,
  signal?: AbortSignal,
) => Promise<void> | void;
