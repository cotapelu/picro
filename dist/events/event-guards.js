"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Event Type Guards - Type guards for all AgentEvent types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventGuards = void 0;
exports.isAgentStartEvent = isAgentStartEvent;
exports.isAgentEndEvent = isAgentEndEvent;
exports.isTurnStartEvent = isTurnStartEvent;
exports.isTurnEndEvent = isTurnEndEvent;
exports.isMessageStartEvent = isMessageStartEvent;
exports.isMessageUpdateEvent = isMessageUpdateEvent;
exports.isMessageEndEvent = isMessageEndEvent;
exports.isToolCallStartEvent = isToolCallStartEvent;
exports.isToolCallEndEvent = isToolCallEndEvent;
exports.isToolProgressEvent = isToolProgressEvent;
exports.isToolErrorEvent = isToolErrorEvent;
exports.isLLMRequestEvent = isLLMRequestEvent;
exports.isLLMResponseEvent = isLLMResponseEvent;
exports.isMemoryRetrievalEvent = isMemoryRetrievalEvent;
exports.isErrorEvent = isErrorEvent;
/**
 * Check if event is AgentStartEvent
 */
function isAgentStartEvent(event) {
    return event.type === 'agent:start';
}
/**
 * Check if event is AgentEndEvent
 */
function isAgentEndEvent(event) {
    return event.type === 'agent:end';
}
/**
 * Check if event is TurnStartEvent
 */
function isTurnStartEvent(event) {
    return event.type === 'turn:start';
}
/**
 * Check if event is TurnEndEvent
 */
function isTurnEndEvent(event) {
    return event.type === 'turn:end';
}
/**
 * Check if event is MessageStartEvent
 */
function isMessageStartEvent(event) {
    return event.type === 'message:start';
}
/**
 * Check if event is MessageUpdateEvent
 */
function isMessageUpdateEvent(event) {
    return event.type === 'message:update';
}
/**
 * Check if event is MessageEndEvent
 */
function isMessageEndEvent(event) {
    return event.type === 'message:end';
}
/**
 * Check if event is ToolCallStartEvent
 */
function isToolCallStartEvent(event) {
    return event.type === 'tool:call:start';
}
/**
 * Check if event is ToolCallEndEvent
 */
function isToolCallEndEvent(event) {
    return event.type === 'tool:call:end';
}
/**
 * Check if event is ToolProgressEvent
 */
function isToolProgressEvent(event) {
    return event.type === 'tool:progress';
}
/**
 * Check if event is ToolErrorEvent
 */
function isToolErrorEvent(event) {
    return event.type === 'tool:error';
}
/**
 * Check if event is LLMRequestEvent
 */
function isLLMRequestEvent(event) {
    return event.type === 'llm:request';
}
/**
 * Check if event is LLMResponseEvent
 */
function isLLMResponseEvent(event) {
    return event.type === 'llm:response';
}
/**
 * Check if event is MemoryRetrievalEvent
 */
function isMemoryRetrievalEvent(event) {
    return event.type === 'memory:retrieve';
}
/**
 * Check if event is ErrorEvent
 */
function isErrorEvent(event) {
    return event.type === 'error';
}
/**
 * Get all event type guard functions
 */
exports.eventGuards = {
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