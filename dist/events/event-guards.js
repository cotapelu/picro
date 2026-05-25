// SPDX-License-Identifier: Apache-2.0
/**
 * Event Type Guards - Type guards for all AgentEvent types
 */
/**
 * Check if event is AgentStartEvent
 */
export function isAgentStartEvent(event) {
    return event.type === 'agent:start';
}
/**
 * Check if event is AgentEndEvent
 */
export function isAgentEndEvent(event) {
    return event.type === 'agent:end';
}
/**
 * Check if event is TurnStartEvent
 */
export function isTurnStartEvent(event) {
    return event.type === 'turn:start';
}
/**
 * Check if event is TurnEndEvent
 */
export function isTurnEndEvent(event) {
    return event.type === 'turn:end';
}
/**
 * Check if event is MessageStartEvent
 */
export function isMessageStartEvent(event) {
    return event.type === 'message:start';
}
/**
 * Check if event is MessageUpdateEvent
 */
export function isMessageUpdateEvent(event) {
    return event.type === 'message:update';
}
/**
 * Check if event is MessageEndEvent
 */
export function isMessageEndEvent(event) {
    return event.type === 'message:end';
}
/**
 * Check if event is ToolCallStartEvent
 */
export function isToolCallStartEvent(event) {
    return event.type === 'tool:call:start';
}
/**
 * Check if event is ToolCallEndEvent
 */
export function isToolCallEndEvent(event) {
    return event.type === 'tool:call:end';
}
/**
 * Check if event is ToolProgressEvent
 */
export function isToolProgressEvent(event) {
    return event.type === 'tool:progress';
}
/**
 * Check if event is ToolErrorEvent
 */
export function isToolErrorEvent(event) {
    return event.type === 'tool:error';
}
/**
 * Check if event is LLMRequestEvent
 */
export function isLLMRequestEvent(event) {
    return event.type === 'llm:request';
}
/**
 * Check if event is LLMResponseEvent
 */
export function isLLMResponseEvent(event) {
    return event.type === 'llm:response';
}
/**
 * Check if event is MemoryRetrievalEvent
 */
export function isMemoryRetrievalEvent(event) {
    return event.type === 'memory:retrieve';
}
/**
 * Check if event is ErrorEvent
 */
export function isErrorEvent(event) {
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
//# sourceMappingURL=event-guards.js.map