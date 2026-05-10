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
export { Agent } from './agent';
export type { AgentConfig, AgentRuntimeState, AgentRunResult } from './types';

// Tool Execution
export { ToolExecutor } from './tool-executor';
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
} from './types';

// Event System (Agent emits events)
export { EventEmitter, createConsoleLogger } from '../events/event-emitter';
export { createEventBus, type EventBus, type EventBusController } from '../events/event-bus';
export { PrioritizedEventEmitter } from '../events/prioritized-event-emitter';
export { EventRecorder } from '../events/event-recorder';
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
} from '../events/events';
export * from '../events/event-guards';

// Utilities (agent-specific)
export { isContextOverflow } from './pi-ai-shim';
export { ExtensionRunner, createExtensionRuntime } from '../extensions/runner';

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
} from './types';

// Components
export { ContextBuilder } from './context-manager';
export { MessageQueue } from './message-queue';

// Loop Strategies
export {
  LoopStrategyFactory,
  ReActLoopStrategy,
  PlanSolveLoopStrategy,
  ReflectionLoopStrategy,
  SimpleLoopStrategy,
  SelfRefineLoopStrategy,
} from './loop-strategy';
export type { LoopStrategy } from './loop-strategy';

// Proxy Streaming
export { createProxyStream, type ProxyOptions } from './proxy-stream';
