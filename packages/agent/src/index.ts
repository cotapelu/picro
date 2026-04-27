// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/agent - Core Agent Library
 *
 * A professional, extensible agent framework for building AI agents
 * with tool execution capabilities.
 *
 * This implementation is a clean-room reimplementation designed
 * to be compatible with the pi-agent-legacy API while using
 * different internal architecture.
 */

// ============================================================================
// Core Agent
// ============================================================================
export { Agent } from './agent.js';
export type { AgentConfig, AgentRuntimeState, AgentRunResult } from './types.js';

// ============================================================================
// Tool Execution
// ============================================================================
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

// ============================================================================
// Context Building
// ============================================================================
export { ContextBuilder } from './context-builder.js';
export type { ContextBuilderConfig, MemoryEntry, MemoryStore } from './types.js';

// ============================================================================
// Loop Strategies
// ============================================================================
export {
  ReActLoopStrategy,
  PlanSolveLoopStrategy,
  ReflectionLoopStrategy,
  SimpleLoopStrategy,
  SelfRefineLoopStrategy,
  LoopStrategyFactory,
} from './loop-strategy.js';
export type { LoopStrategy } from './loop-strategy.js';

// ============================================================================
// Event System
// ============================================================================
export { EventEmitter, createConsoleLogger } from './event-emitter.js';
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
} from './types.js';

// ============================================================================
// Message Queue
// ============================================================================
export { MessageQueue } from './message-queue.js';
export type { QueueMode } from './types.js';

// ============================================================================
// Streaming & Utilities
// ============================================================================
export {
  collectStream,
  pipeStream,
  createStream,
  mergeToolCalls,
  supportsStreaming,
} from './stream-utils.js';

export { createProxyStream } from './proxy-stream.js';
export type { ProxyOptions } from './proxy-stream.js';

// ============================================================================
// Types (common)
// ============================================================================
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
  AIModel,
  Usage,
  LLMMessage,
  LLMResponse,
  LLMStreamEvent,
  StreamOptions,
  StreamFunction,
} from './types.js';

// ============================================================================
// Agent Session (NEW - Phase A)
// ============================================================================
export { AgentSession, parseSkillBlock } from './agent-session.js';
export type { AgentSessionConfig, AgentSessionEventListener, AgentSessionEvent } from './agent-session-types.js';
export type { QueueUpdateEvent, CompactionStartEvent, CompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, CompactionResult, PromptOptions, ModelCycleResult, SessionStats, ParsedSkillBlock } from './agent-session-types.js';

// ============================================================================
// Agent Session Runtime (NEW - Phase A)
// ============================================================================
export { AgentSessionRuntime, createAgentSessionRuntime } from './agent-session-runtime.js';
export type { AgentSessionRuntimeDiagnostic, CreateAgentSessionRuntimeFactory, CreateAgentSessionRuntimeResult, SessionStartEvent } from './agent-session-runtime.js';

// ============================================================================
// Agent Session Services (NEW - Phase A)
// ============================================================================
export { createAgentSessionServices, createAgentSessionFromServices } from './agent-session-services.js';
export type { CreateAgentSessionServicesOptions, CreateAgentSessionFromServicesOptions, AgentSessionServices } from './agent-session-services.js';

// ============================================================================
// Resource Loader (NEW - Phase B)
// ============================================================================
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader.js';
export type { ResourceLoader, LoadExtensionsResult, ExtensionRuntime, ResourceDiagnostic, SourceInfo, PromptTemplate, Theme } from './resource-loader.js';

// ============================================================================
// Model Registry (NEW - Phase C)
// ============================================================================
export { DefaultModelRegistry, createModelRegistry, getModel, getProviders, getModels } from './model-registry.js';
export type { ModelRegistry, ModelEntry } from './model-registry.js';
