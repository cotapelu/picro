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
export { Agent } from './agent';
export type { AgentConfig, AgentRuntimeState, AgentRunResult } from './types';

// ============================================================================
// Tool Execution
// ============================================================================
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

// ============================================================================
// Context Building
// ============================================================================
export { ContextBuilder } from './context-manager';
export type { ContextBuilderConfig, MemoryEntry, MemoryStore } from './types';

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
} from './loop-strategy';
export type { LoopStrategy } from './loop-strategy';

// ============================================================================
// Event System
// ============================================================================
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

// ============================================================================
// Message Queue
// ============================================================================
export { MessageQueue } from './message-queue';
export type { QueueMode } from './types';

// ============================================================================
// Streaming & Utilities
// ============================================================================
export {
  collectStream,
  pipeStream,
  createStream,
  mergeToolCalls,
  supportsStreaming,
} from './stream-utils';

export { createProxyStream } from './proxy-stream';
export type { ProxyOptions } from './proxy-stream';

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
} from './types';

// ============================================================================
// Agent Session (NEW - Phase A)
// ============================================================================
export { AgentSession, parseSkillBlock } from './agent-session';
export type { AgentSessionConfig, AgentSessionEventListener, AgentSessionEvent } from './agent-session-types';
export type { QueueUpdateEvent, CompactionStartEvent, CompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, CompactionResult, PromptOptions, ModelCycleResult, SessionStats, ParsedSkillBlock } from './agent-session-types';

// ============================================================================
// Agent Session Runtime (NEW - Phase A)
// ============================================================================
export { AgentSessionRuntime, createAgentSessionRuntime } from './agent-session-runtime';
export type { AgentSessionRuntimeDiagnostic, CreateAgentSessionRuntimeFactory, CreateAgentSessionRuntimeResult, SessionStartEvent } from './agent-session-runtime';

// ============================================================================
// Agent Session Services (NEW - Phase A)
// ============================================================================
export { createAgentSessionServices, createAgentSessionFromServices } from './agent-session-services';
export type { CreateAgentSessionServicesOptions, CreateAgentSessionFromServicesOptions, AgentSessionServices } from './agent-session-services';

// ============================================================================
// Resource Loader (NEW - Phase B)
// ============================================================================
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader';
export type { ResourceLoader, LoadExtensionsResult, ExtensionRuntime, ResourceDiagnostic, SourceInfo, LoadedPromptTemplate, Theme } from './resource-loader';

// ============================================================================
// Model Registry (NEW - Phase C)
// ============================================================================
export { DefaultModelRegistry, createModelRegistry, getModel, getProviders, getModels } from './model-registry';
export type { ModelRegistry, ModelEntry } from './model-registry';

// ============================================================================
// Defaults
// ============================================================================
export { DEFAULT_THINKING_LEVEL, DEFAULT_TOOL_TIMEOUT, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_OUTPUT_LINES, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_MAX_HISTORY_TURNS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_MAX_RETRIES } from './defaults';

// ============================================================================
// Bash Execution
// ============================================================================
export { executeBash, executeBashLocal } from './tools/bash-executor';
export type { BashExecutorOptions, BashResult } from './tools/bash-executor';

// ============================================================================
// Diagnostics
// ============================================================================
export { getSystemInfo, getMemoryInfo, getPerformanceMetrics, collectDiagnostics, generateDiagnosticReport, formatFileSize, isDevelopment, isTest } from './diagnostics';
export type { SystemInfo, MemoryInfo, PerformanceMetrics } from './diagnostics';

// ============================================================================
// Telemetry
// ============================================================================
export { getTelemetry, setTelemetry, track, telemetryMethod } from './telemetry';
export type { Telemetry, TelemetryConfig, TelemetryEvent, TelemetryPayload } from './telemetry';

// ============================================================================
// Output Guard
// ============================================================================
export { sanitizeOutput, validateOutput, safeReadFile, cleanupTempFile } from './output-guard';
export type { OutputValidation } from './output-guard';

// ============================================================================
// Shell Utilities
// ============================================================================
export { getShellConfig, getShellEnv, sanitizeBinaryOutput, killProcessTree, trackDetachedChildPid, untrackDetachedChildPid, killTrackedDetachedChildren } from './utils/shell';
export type { ShellConfig } from './utils/shell';

// ============================================================================
// Config Resolution
// ============================================================================
export { resolveConfigValue, resolveConfigValueUncached, resolveConfigValueOrThrow, resolveConfigValueToNumber, resolveConfigValueToBoolean, resolveConfigValueToList } from './resolve-config-value';

// ============================================================================
// System Prompt
// ============================================================================
export { buildSystemPrompt } from './system-prompt';
export type { BuildSystemPromptOptions } from './system-prompt';

// ============================================================================
// Package Manager
// ============================================================================
export { DefaultPackageManager, createPackageManager } from './package-manager';
export type { PackageSource, ResolvedPackage, PackageManagerOptions } from './package-manager';

// ============================================================================
// Footer DataProvider
// ============================================================================
export { DefaultFooterDataProvider, createFooterDataProvider, getGitInfo } from './footer-data-provider';
export type { FooterDataProvider, FooterData, GitInfo, ExtensionStatus } from './footer-data-provider';

// ============================================================================
// Built-in Tools
// ============================================================================
export { createBashToolDefinition, createReadToolDefinition, createWriteToolDefinition, createEditToolDefinition, createLsToolDefinition, truncateOutput, truncateTail, truncateHead, truncateLines, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from './tools/index';
export type { BashToolInput, BashToolDetails, ReadToolInput, WriteToolInput, EditToolInput, LsToolInput, LsEntry, TruncationResult } from './tools/index';

// ============================================================================
// Prompt Templates
// ============================================================================
export { expandPromptTemplate } from './prompt-templates';
export type { PromptTemplate } from './prompt-templates';

// ============================================================================
// Event Utilities
// ============================================================================
export { PrioritizedEventEmitter } from './prioritized-event-emitter';
export type { PrioritizedEventEmitterOptions } from './prioritized-event-emitter';

export { EventRecorder } from './event-recorder';
export type { EventRecorderOptions } from './event-recorder';

export { eventGuards, isAgentStartEvent, isAgentEndEvent, isTurnStartEvent, isTurnEndEvent, isMessageStartEvent, isMessageUpdateEvent, isMessageEndEvent, isToolCallStartEvent, isToolCallEndEvent, isToolProgressEvent, isToolErrorEvent, isLLMRequestEvent, isLLMResponseEvent, isMemoryRetrievalEvent, isErrorEvent } from './event-guards';

// ============================================================================
// Performance Monitoring
// ============================================================================
export { PerformanceTracker } from './performance-tracker';
export type { PerformanceTrackerOptions, PerformanceSample } from './performance-tracker';

// ============================================================================
// Truncation Utilities
// ============================================================================
export { truncateBytes, truncateVisualLines, truncateMiddle, truncatePreserveEnds } from './truncate';
// TruncationResult type already exported from './tools/index'

// ============================================================================
// File Mutation
// ============================================================================
export { FileMutationQueue } from './file-mutation-queue';
export type { FileMutation, FileMutationQueueOptions } from './file-mutation-queue';

// ============================================================================
// Settings Validation
// ============================================================================
export { validateSettings, validateOrThrow } from './settings-validator';
export type { SettingsValidationError } from './settings-validator';

// ============================================================================
// Auth Guidance
// ============================================================================
export { formatNoApiKeyFoundMessage, formatNoModelSelectedMessage, formatNoModelsAvailableMessage, formatLoginInstructions } from './auth-guidance';
