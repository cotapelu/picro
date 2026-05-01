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
export { ContextBuilder } from './context-manager.js';
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
export { createEventBus, type EventBus, type EventBusController } from './event-bus.js';
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
export type { ResourceLoader, LoadExtensionsResult, ExtensionRuntime, ResourceDiagnostic, SourceInfo, LoadedPromptTemplate, Theme } from './resource-loader.js';

// ============================================================================
// Model Registry (NEW - Phase C)
// ============================================================================
export { DefaultModelRegistry, createModelRegistry, getModel, getProviders, getModels } from './model-registry.js';
export type { ModelRegistry, ModelEntry } from './model-registry.js';

// ============================================================================
// Defaults
// ============================================================================
export { DEFAULT_THINKING_LEVEL, DEFAULT_TOOL_TIMEOUT, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_OUTPUT_LINES, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_MAX_HISTORY_TURNS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_MAX_RETRIES } from './defaults.js';

// ============================================================================
// Bash Execution
// ============================================================================
export { executeBash, executeBashLocal } from './tools/bash-executor.js';
export type { BashExecutorOptions, BashResult } from './tools/bash-executor.js';

// ============================================================================
// Diagnostics
// ============================================================================
export { getSystemInfo, getMemoryInfo, getPerformanceMetrics, collectDiagnostics, generateDiagnosticReport, formatFileSize, isDevelopment, isTest } from './diagnostics.js';
export type { SystemInfo, MemoryInfo, PerformanceMetrics } from './diagnostics.js';

// ============================================================================
// Telemetry
// ============================================================================
export { getTelemetry, setTelemetry, track, telemetryMethod } from './telemetry.js';
export type { Telemetry, TelemetryConfig, TelemetryEvent, TelemetryPayload } from './telemetry.js';

// ============================================================================
// Output Guard
// ============================================================================
export { sanitizeOutput, validateOutput, safeReadFile, cleanupTempFile } from './output-guard.js';
export type { OutputValidation } from './output-guard.js';

// ============================================================================
// Shell Utilities
// ============================================================================
export { getShellConfig, getShellEnv, sanitizeBinaryOutput, killProcessTree, trackDetachedChildPid, untrackDetachedChildPid, killTrackedDetachedChildren } from './utils/shell.js';
export type { ShellConfig } from './utils/shell.js';

// ============================================================================
// Config Resolution
// ============================================================================
export { resolveConfigValue, resolveConfigValueUncached, resolveConfigValueOrThrow, resolveConfigValueToNumber, resolveConfigValueToBoolean, resolveConfigValueToList } from './resolve-config-value.js';

// ============================================================================
// System Prompt
// ============================================================================
export { buildSystemPrompt } from './system-prompt.js';
export type { BuildSystemPromptOptions } from './system-prompt.js';

// ============================================================================
// Package Manager
// ============================================================================
export { DefaultPackageManager, createPackageManager } from './package-manager.js';
export type { PackageSource, ResolvedPackage, PackageManagerOptions } from './package-manager.js';

// ============================================================================
// Footer DataProvider
// ============================================================================
export { DefaultFooterDataProvider, createFooterDataProvider, getGitInfo } from './footer-data-provider.js';
export type { FooterDataProvider, FooterData, GitInfo, ExtensionStatus } from './footer-data-provider.js';

// ============================================================================
// Built-in Tools
// ============================================================================
export { createBashToolDefinition, createReadToolDefinition, createWriteToolDefinition, createEditToolDefinition, createLsToolDefinition, truncateOutput, truncateTail, truncateHead, truncateLines, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from './tools/index.js';
export type { BashToolInput, BashToolDetails, ReadToolInput, WriteToolInput, EditToolInput, LsToolInput, LsEntry, TruncationResult } from './tools/index.js';

// ============================================================================
// Prompt Templates
// ============================================================================
export { expandPromptTemplate } from './prompt-templates.js';
export type { PromptTemplate } from './prompt-templates.js';

// ============================================================================
// Event Utilities
// ============================================================================
export { PrioritizedEventEmitter } from './prioritized-event-emitter.js';
export type { PrioritizedEventEmitterOptions } from './prioritized-event-emitter.js';

export { EventRecorder } from './event-recorder.js';
export type { EventRecorderOptions } from './event-recorder.js';

export { eventGuards, isAgentStartEvent, isAgentEndEvent, isTurnStartEvent, isTurnEndEvent, isMessageStartEvent, isMessageUpdateEvent, isMessageEndEvent, isToolCallStartEvent, isToolCallEndEvent, isToolProgressEvent, isToolErrorEvent, isLLMRequestEvent, isLLMResponseEvent, isMemoryRetrievalEvent, isErrorEvent } from './event-guards.js';

// ============================================================================
// Performance Monitoring
// ============================================================================
export { PerformanceTracker } from './performance-tracker.js';
export type { PerformanceTrackerOptions, PerformanceSample } from './performance-tracker.js';

// ============================================================================
// Truncation Utilities
// ============================================================================
export { truncateBytes, truncateVisualLines, truncateMiddle, truncatePreserveEnds } from './truncate.js';
// TruncationResult type already exported from './tools/index.js'

// ============================================================================
// File Mutation
// ============================================================================
export { FileMutationQueue } from './file-mutation-queue.js';
export type { FileMutation, FileMutationQueueOptions } from './file-mutation-queue.js';

// ============================================================================
// Settings Validation
// ============================================================================
export { validateSettings, validateOrThrow } from './settings-validator.js';
export type { SettingsValidationError } from './settings-validator.js';

// ============================================================================
// Auth Guidance
// ============================================================================
export { formatNoApiKeyFoundMessage, formatNoModelSelectedMessage, formatNoModelsAvailableMessage, formatLoginInstructions } from './auth-guidance.js';
