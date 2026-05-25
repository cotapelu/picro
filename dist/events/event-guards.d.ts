/**
 * Event Type Guards - Type guards for all AgentEvent types
 */
import type { AgentEvent, AgentStartEvent, AgentEndEvent, TurnStartEvent, TurnEndEvent, MessageStartEvent, MessageUpdateEvent, MessageEndEvent, ToolCallStartEvent, ToolCallEndEvent, ToolProgressEvent, ToolErrorEvent, LLMRequestEvent, LLMResponseEvent, MemoryRetrievalEvent, ErrorEvent } from '../agent/types.js';
/**
 * Check if event is AgentStartEvent
 */
export declare function isAgentStartEvent(event: AgentEvent): event is AgentStartEvent;
/**
 * Check if event is AgentEndEvent
 */
export declare function isAgentEndEvent(event: AgentEvent): event is AgentEndEvent;
/**
 * Check if event is TurnStartEvent
 */
export declare function isTurnStartEvent(event: AgentEvent): event is TurnStartEvent;
/**
 * Check if event is TurnEndEvent
 */
export declare function isTurnEndEvent(event: AgentEvent): event is TurnEndEvent;
/**
 * Check if event is MessageStartEvent
 */
export declare function isMessageStartEvent(event: AgentEvent): event is MessageStartEvent;
/**
 * Check if event is MessageUpdateEvent
 */
export declare function isMessageUpdateEvent(event: AgentEvent): event is MessageUpdateEvent;
/**
 * Check if event is MessageEndEvent
 */
export declare function isMessageEndEvent(event: AgentEvent): event is MessageEndEvent;
/**
 * Check if event is ToolCallStartEvent
 */
export declare function isToolCallStartEvent(event: AgentEvent): event is ToolCallStartEvent;
/**
 * Check if event is ToolCallEndEvent
 */
export declare function isToolCallEndEvent(event: AgentEvent): event is ToolCallEndEvent;
/**
 * Check if event is ToolProgressEvent
 */
export declare function isToolProgressEvent(event: AgentEvent): event is ToolProgressEvent;
/**
 * Check if event is ToolErrorEvent
 */
export declare function isToolErrorEvent(event: AgentEvent): event is ToolErrorEvent;
/**
 * Check if event is LLMRequestEvent
 */
export declare function isLLMRequestEvent(event: AgentEvent): event is LLMRequestEvent;
/**
 * Check if event is LLMResponseEvent
 */
export declare function isLLMResponseEvent(event: AgentEvent): event is LLMResponseEvent;
/**
 * Check if event is MemoryRetrievalEvent
 */
export declare function isMemoryRetrievalEvent(event: AgentEvent): event is MemoryRetrievalEvent;
/**
 * Check if event is ErrorEvent
 */
export declare function isErrorEvent(event: AgentEvent): event is ErrorEvent;
/**
 * Get all event type guard functions
 */
export declare const eventGuards: {
    isAgentStartEvent: typeof isAgentStartEvent;
    isAgentEndEvent: typeof isAgentEndEvent;
    isTurnStartEvent: typeof isTurnStartEvent;
    isTurnEndEvent: typeof isTurnEndEvent;
    isMessageStartEvent: typeof isMessageStartEvent;
    isMessageUpdateEvent: typeof isMessageUpdateEvent;
    isMessageEndEvent: typeof isMessageEndEvent;
    isToolCallStartEvent: typeof isToolCallStartEvent;
    isToolCallEndEvent: typeof isToolCallEndEvent;
    isToolProgressEvent: typeof isToolProgressEvent;
    isToolErrorEvent: typeof isToolErrorEvent;
    isLLMRequestEvent: typeof isLLMRequestEvent;
    isLLMResponseEvent: typeof isLLMResponseEvent;
    isMemoryRetrievalEvent: typeof isMemoryRetrievalEvent;
    isErrorEvent: typeof isErrorEvent;
};
//# sourceMappingURL=event-guards.d.ts.map