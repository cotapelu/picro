// SPDX-License-Identifier: Apache-2.0
/**
 * Event Type Guards - Type guards for all AgentEvent types
 */

import type {
  AgentEvent,
  AgentStartEvent,
  AgentEndEvent,
  TurnStartEvent,
  TurnEndEvent,
  MessageStartEvent,
  MessageUpdateEvent,
  MessageEndEvent,
  ToolCallStartEvent,
  ToolCallEndEvent,
  ToolProgressEvent,
  ToolErrorEvent,
  LLMRequestEvent,
  LLMResponseEvent,
  MemoryRetrievalEvent,
  ErrorEvent,
} from './types.js';

/**
 * Check if event is AgentStartEvent
 */
export function isAgentStartEvent(event: AgentEvent): event is AgentStartEvent {
  return event.type === 'agent:start';
}

/**
 * Check if event is AgentEndEvent
 */
export function isAgentEndEvent(event: AgentEvent): event is AgentEndEvent {
  return event.type === 'agent:end';
}

/**
 * Check if event is TurnStartEvent
 */
export function isTurnStartEvent(event: AgentEvent): event is TurnStartEvent {
  return event.type === 'turn:start';
}

/**
 * Check if event is TurnEndEvent
 */
export function isTurnEndEvent(event: AgentEvent): event is TurnEndEvent {
  return event.type === 'turn:end';
}

/**
 * Check if event is MessageStartEvent
 */
export function isMessageStartEvent(event: AgentEvent): event is MessageStartEvent {
  return event.type === 'message:start';
}

/**
 * Check if event is MessageUpdateEvent
 */
export function isMessageUpdateEvent(event: AgentEvent): event is MessageUpdateEvent {
  return event.type === 'message:update';
}

/**
 * Check if event is MessageEndEvent
 */
export function isMessageEndEvent(event: AgentEvent): event is MessageEndEvent {
  return event.type === 'message:end';
}

/**
 * Check if event is ToolCallStartEvent
 */
export function isToolCallStartEvent(event: AgentEvent): event is ToolCallStartEvent {
  return event.type === 'tool:call:start';
}

/**
 * Check if event is ToolCallEndEvent
 */
export function isToolCallEndEvent(event: AgentEvent): event is ToolCallEndEvent {
  return event.type === 'tool:call:end';
}

/**
 * Check if event is ToolProgressEvent
 */
export function isToolProgressEvent(event: AgentEvent): event is ToolProgressEvent {
  return event.type === 'tool:progress';
}

/**
 * Check if event is ToolErrorEvent
 */
export function isToolErrorEvent(event: AgentEvent): event is ToolErrorEvent {
  return event.type === 'tool:error';
}

/**
 * Check if event is LLMRequestEvent
 */
export function isLLMRequestEvent(event: AgentEvent): event is LLMRequestEvent {
  return event.type === 'llm:request';
}

/**
 * Check if event is LLMResponseEvent
 */
export function isLLMResponseEvent(event: AgentEvent): event is LLMResponseEvent {
  return event.type === 'llm:response';
}

/**
 * Check if event is MemoryRetrievalEvent
 */
export function isMemoryRetrievalEvent(event: AgentEvent): event is MemoryRetrievalEvent {
  return event.type === 'memory:retrieve';
}

/**
 * Check if event is ErrorEvent
 */
export function isErrorEvent(event: AgentEvent): event is ErrorEvent {
  return event.type === 'error';
}

/**
 * Get all event type guard functions
 */
export const eventGuards = {
  isAgentStartEvent,
  isAgentEndEvent,
  isTurnStartEvent,
  isTurnEndEvent,
  isMessageStartEvent,
  isMessageUpdateEvent,
  isMessageEndEvent,
  isToolCallStartEvent,
  isToolCallEndEvent,
  isToolProgressEvent,
  isToolErrorEvent,
  isLLMRequestEvent,
  isLLMResponseEvent,
  isMemoryRetrievalEvent,
  isErrorEvent,
};
