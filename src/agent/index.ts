// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/agent - Core Agent Library (pure logic, no session persistence)
 *
 * This is the lowest-level agent module. It contains only the core
 * agent execution logic without any session persistence, UI, or runtime concerns.
 *
 * Dependencies: None (only uses internal files and ../events, ../llm)
 */

// Agent
export { Agent } from './agent.js';
export type { AgentConfig, AgentRuntimeState, AgentRunResult } from './types.js';

// Tool Execution
export { ToolExecutor } from './tool-executor.js';
export type {
  ToolDefinition,
  ToolHandler,
  ToolResult,
  ToolCallData,
  ToolContext,
  ToolProgressUpdate,
  ToolExecutionMetadata,
  SuccessfulToolResult,
  FailedToolResult,
} from './types.js';

// Event System (Agent emits events)
export { EventEmitter, createConsoleLogger } from '../events/event-emitter.js';
export { createEventBus, type EventBus, type EventBusController } from '../events/event-bus.js';
export { PrioritizedEventEmitter } from '../events/prioritized-event-emitter.js';
export { EventRecorder } from '../events/event-recorder.js';
export type {
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
} from '../events/events.js';
export * from '../events/event-guards.js';

// Utilities (agent-specific)
export { isContextOverflow } from './pi-ai-shim.js';
export { ExtensionRunner, createExtensionRuntime } from '../extensions/runner.js';

// Core Types
export type {
  ConversationTurn,
  SystemTurn,
  UserTurn,
  AssistantTurn,
  ToolTurn,
  TextBlock,
  ThinkingBlock,
  ToolCallBlock,
  ContentBlock,
  Role,
  StopReason,
  ThinkingLevel,
  ToolExecutionStrategy,
  TransportType,
  Usage,
  LLMMessage,
  LLMResponse,
  LLMStreamEvent,
  StreamOptions,
  StreamFunction,
  QueueMode,
} from './types.js';

// Components
export { ContextBuilder } from './context-manager.js';
export { MessageQueue } from './message-queue.js';

// Loop Strategies
export {
  LoopStrategyFactory,
  ReActLoopStrategy,
  PlanSolveLoopStrategy,
  ReflectionLoopStrategy,
  SimpleLoopStrategy,
  SelfRefineLoopStrategy,
} from './loop-strategy.js';
export type { LoopStrategy } from './loop-strategy.js';

// Proxy Streaming
export { createProxyStream, type ProxyOptions } from './proxy-stream.js';
