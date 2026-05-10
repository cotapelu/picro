// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/agent - Core Agent Library (pure logic, no session persistence)
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

// Event System
export { EventEmitter, createConsoleLogger } from './event-emitter';
export { createEventBus, type EventBus, type EventBusController } from './event-bus';
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
} from './types';

// Utilities
export { isContextOverflow } from './pi-ai-shim';
export { ExtensionRunner, createExtensionRuntime } from './extensions/runner';
export { DEFAULT_TOOL_TIMEOUT } from './defaults';
export * from './utils/shell';
export * from './tools';

// Types
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
} from './types';
