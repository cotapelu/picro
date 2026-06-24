// SPDX-License-Identifier: Apache-2.0
/**
 * Core type definitions for the agent system.
 * Designed independently with a different structure from pi-agent-legacy.
 */

import type { EventEmitter } from '../events/event-emitter.js';
import type { Model, Usage, Message as LlmMessage } from '../llm/index.js';

// ============================================================================
// Basic Types
// ============================================================================

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type StopReason = 'stop' | 'length' | 'toolUse' | 'aborted' | 'error' | 'max_rounds';

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export type ToolExecutionStrategy = 'sequential' | 'parallel';

export type TransportType = 'sse' | 'websocket' | 'polling';

// ============================================================================
// Message Types
// ============================================================================

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ImageBlock {
  type: 'image';
  data: string; // base64
  mimeType?: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
  thinkingSignature?: string;
}

export interface ToolCallBlock {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type ContentBlock = TextBlock | ImageBlock | ThinkingBlock | ToolCallBlock;

export interface BaseTurn {
  timestamp: number;
}

export interface SystemTurn extends BaseTurn {
  role: 'system';
  content: TextBlock[];
}

export interface UserTurn extends BaseTurn {
  role: 'user';
  content: (TextBlock | { type: 'image'; data: string; mimeType: string })[];
}

export interface AssistantTurn extends BaseTurn {
  role: 'assistant';
  content: ContentBlock[];
  stopReason?: StopReason;
  errorMessage?: string;
  usage?: Usage;
}

export interface ToolTurn extends BaseTurn {
  role: 'tool';
  toolCallId: string;
  toolName: string;
  content: (TextBlock | ImageBlock)[];
  isError: boolean;
  details?: Record<string, unknown>;
}

export type ConversationTurn = SystemTurn | UserTurn | AssistantTurn | ToolTurn;

// Helper to check turn types
export const isSystemTurn = (turn: ConversationTurn): turn is SystemTurn => turn.role === 'system';
export const isUserTurn = (turn: ConversationTurn): turn is UserTurn => turn.role === 'user';
export const isAssistantTurn = (turn: ConversationTurn): turn is AssistantTurn => turn.role === 'assistant';
export const isToolTurn = (turn: ConversationTurn): turn is ToolTurn => turn.role === 'tool';

// ============================================================================
// Tool Types
// ============================================================================

// Tool metadata only – no handler (compatible with llm-context/ai)
// Handler is registered separately in ToolExecutor
// import type { Tool as LlmTool } from '../llm';

export type Tool = {
  name: string;
  description: string;
  parameters?: any;
};

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: any;
  handler?: ToolHandler; // optional for metadata-only definitions
  prepareArguments?: (args: Record<string, unknown>, context: ToolContext) => Promise<Record<string, unknown>>;
  /** Optional per-tool execution mode override */
  executionMode?: ToolExecutionMode;
  /** Short description for system prompt (tool usage snippet) */
  promptSnippet?: string;
  /** Detailed usage guidelines for system prompt */
  promptGuides?: string[];
  /** Display label (optional) */
  label?: string;
}

export type AgentTool = Tool & {
  /**
   * Optional per-tool execution mode override.
   * - 'sequential': this tool must execute one at a time with other tool calls.
   * - 'parallel': this tool can execute concurrently with other tool calls.
   * If omitted, the agent's default tool execution strategy applies.
   */
  executionMode?: ToolExecutionMode;
  /** Short description for system prompt */
  promptSnippet?: string;
  /** Usage guidelines for system prompt */
  promptGuides?: string[];
  /** Display label */
  label?: string;
};
export type AgentMessage = LlmMessage;

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext,
  onProgress?: (update: ToolProgressUpdate) => void | Promise<void>
) => string | (TextBlock | ImageBlock)[] | Promise<string | (TextBlock | ImageBlock)[]> | void | Promise<void>;

export type ToolRegistry = Record<string, ToolHandler>;

// ============================================================================
// Hooks and event contexts (compatible with llm-context/agent)
// ============================================================================

export type ToolExecutionMode = "sequential" | "parallel";
export type QueueMode = "all" | "one-at-a-time"; // "drain-all" -> "all", "dequeue-one" -> "one-at-a-time"

export interface BeforeToolCallContext {
  assistantMessage: AssistantTurn;
  toolCall: ToolCallBlock;
  args: Record<string, unknown>;
  context: AgentRuntimeState;
}

export interface BeforeToolCallResult {
  block?: boolean;
  reason?: string;
}

export interface AfterToolCallContext {
  assistantMessage: AssistantTurn;
  toolCall: ToolCallBlock;
  args: Record<string, unknown>;
  result: ToolResult; // SuccessfulToolResult or FailedToolResult
  isError: boolean;
  context: AgentRuntimeState;
}

export interface AfterToolCallResult {
  result?: string;
  errorMessage?: string;
  isError?: boolean;
  details?: unknown;
  terminate?: boolean;
}

export interface ShouldStopAfterTurnContext {
  message: AssistantTurn;
  toolResults: ToolTurn[];
  context: AgentRuntimeState;
  newMessages: ConversationTurn[];
}

/** Context passed to prepareNextTurn hook */
export interface PrepareNextTurnContext {
  lastAssistantMessage: AssistantTurn;
  toolResults: ToolResult[]; // raw tool results (include metadata like terminate)
  newMessages: ConversationTurn[]; // assistant + tool turns added this turn
  round: number; // round number that just completed
  state: AgentRuntimeState; // current agent state snapshot
}

/** Override values returned by prepareNextTurn hook */
export interface PrepareNextTurnOverride {
  reasoningLevel?: ThinkingLevel;
  model?: Model;
  context?: ConversationTurn[];
}

export type GetApiKeyFn = (provider: string) => Promise<string | undefined> | string | undefined;

export type ConvertToLlmFn = (turns: ConversationTurn[], signal?: AbortSignal) => Promise<LlmMessage[]>;

export type ShouldStopAfterTurnFn = (ctx: ShouldStopAfterTurnContext) => boolean | Promise<boolean>;

export type BeforeToolCallHook = (ctx: BeforeToolCallContext) => Promise<BeforeToolCallResult>;

export type AfterToolCallHook = (ctx: AfterToolCallContext) => Promise<AfterToolCallResult>;

export type TurnEndHook = (ctx: { context: AgentRuntimeState; newMessages: AgentMessage[] }) => Promise<void>;

export interface ToolContext {
  round: number;
  runtimeState: AgentRuntimeState;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface ToolProgressUpdate {
  partialResult?: string;
  details?: Record<string, unknown>;
}

export interface ToolExecutionMetadata {
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

export interface SuccessfulToolResult {
  toolCallId: string;
  toolName: string;
  content: string | (TextBlock | ImageBlock)[];
  executionTime: number;
  isError: false;
  metadata: ToolExecutionMetadata;
  /**
   * Hint that the agent should stop after the current tool batch.
   * Early termination only happens when every finalized tool result in the batch sets this to true.
   */
  terminate?: boolean;
}

export interface FailedToolResult {
  toolCallId: string;
  toolName: string;
  error: string;
  executionTime: number;
  isError: true;
  metadata: ToolExecutionMetadata;
  /**
   * Hint that the agent should stop after the current tool batch.
   * Rarely used for errors, but included for completeness.
   */
  terminate?: boolean;
}

export type ToolResult = SuccessfulToolResult | FailedToolResult;

// ============================================================================
// Event Types
// ============================================================================

export interface BaseAgentEvent {
  timestamp: number;
  round: number;
}

export interface AgentStartEvent extends BaseAgentEvent {
  type: 'agent:start';
  initialPrompt: string;
}

export interface AgentEndEvent extends BaseAgentEvent {
  type: 'agent:end';
  result: AgentRunResult;
}

export interface TurnStartEvent extends BaseAgentEvent {
  type: 'turn:start';
  promptLength: number;
}

export interface TurnEndEvent extends BaseAgentEvent {
  type: 'turn:end';
  toolCallsExecuted: number;
  hasAssistantContent: boolean;
}

export interface MessageStartEvent extends BaseAgentEvent {
  type: 'message:start';
  turn: ConversationTurn;
}

export interface MessageUpdateEvent extends BaseAgentEvent {
  type: 'message:update';
  turn: AssistantTurn;
  delta?: ContentBlock;
}

export interface MessageEndEvent extends BaseAgentEvent {
  type: 'message:end';
  turn: ConversationTurn;
}

export interface ToolCallStartEvent extends BaseAgentEvent {
  type: 'tool:call:start';
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallEndEvent extends BaseAgentEvent {
  type: 'tool:call:end';
  toolName: string;
  toolCallId: string;
  result: ToolResult;
}

export interface ToolProgressEvent extends BaseAgentEvent {
  type: 'tool:progress';
  toolName: string;
  toolCallId: string;
  partialResult?: string;
  details?: Record<string, unknown>;
}

export interface ToolErrorEvent extends BaseAgentEvent {
  type: 'tool:error';
  toolName: string;
  toolCallId: string;
  errorMessage: string;
}

export interface LLMRequestEvent extends BaseAgentEvent {
  type: 'llm:request';
  promptLength: number;
  toolsAvailable: number;
}

export interface LLMResponseEvent extends BaseAgentEvent {
  type: 'llm:response';
  tokensUsed: number;
  toolCallsCount: number;
}

export interface MemoryRetrievalEvent extends BaseAgentEvent {
  type: 'memory:retrieve';
  query: string;
  memoriesRetrieved: number;
  memories?: any[];
  scores?: number[];
}

export interface ErrorEvent extends BaseAgentEvent {
   type: 'error';
   message: string;
   stack?: string;
}

export interface DebugRoundTimingEvent extends BaseAgentEvent {
   type: 'debug:round:timing';
   round: number;
   contextBuildingTime: number;
   memoryRetrievalTime: number;
   llmRequestTime: number;
   toolExecutionTime: number;
   totalRoundTime: number;
}

export interface DebugRunTimingEvent extends BaseAgentEvent {
   type: 'debug:run:timing';
   totalRunTime: number;
   totalContextBuildingTime: number;
   totalMemoryRetrievalTime: number;
   totalLLMRequestTime: number;
   totalToolExecutionTime: number;
}

export type AgentEvent =
  | AgentStartEvent
  | AgentEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | MessageStartEvent
  | MessageUpdateEvent
  | MessageEndEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolProgressEvent
  | ToolErrorEvent
  | LLMRequestEvent
  | LLMResponseEvent
  | MemoryRetrievalEvent
  | ErrorEvent;

// ============================================================================
// Runtime State
// ============================================================================

export interface AgentRuntimeState {
  round: number;
  totalToolCalls: number;
  totalTokens: number;
  promptLength: number;
  isRunning: boolean;
  isCancelled: boolean;
  toolResults: ToolResult[];
  history: ConversationTurn[];
  metadata: Record<string, unknown>;
}

/** Alias for compatibility */
export type AgentState = AgentRuntimeState;

// ============================================================================
// Result Types
// ============================================================================

export interface AgentRunResult {
  finalAnswer: string;
  totalRounds: number;
  totalToolCalls: number;
  totalTokens: number;
  toolResults: ToolResult[];
  success: boolean;
  stopReason: StopReason;
  error?: string;
  finalState: AgentRuntimeState;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ToolExecutorConfig {
   timeout: number;
   cacheEnabled: boolean;
   cacheSize?: number; // Max cache entries (0 = unlimited, default 1000)
   toolExecutionStrategy: ToolExecutionStrategy;
   emitter?: EventEmitter;
   beforeToolCall?: BeforeToolHook;
   afterToolCall?: AfterToolHook;
   /** Whether to emit progress updates during tool execution */
   emitProgressUpdates?: boolean;
   handlers?: ToolRegistry;
   // Retry configuration for tool execution
   toolMaxRetries?: number; // default 1
   toolRetryDelayMs?: number; // default 500
 }

export interface BeforeToolHook {
  (context: {
    toolCall: ToolCallData;
    args: Record<string, unknown>;
    round: number;
  }, signal?: AbortSignal): Promise<HookResult | undefined>;
}

export interface AfterToolHook {
  (context: {
    toolCall: ToolCallData;
    args: Record<string, unknown>;
    result: ToolResult;
    isError: boolean;
    round: number;
  }, signal?: AbortSignal): Promise<AfterToolCallResult | undefined>;
}

export interface HookResult {
  block?: boolean;
  reason?: string;
  content?: string;
  isError?: boolean;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export interface ContextBuilderConfig {
  maxTokens: number;
  reservedTokens: number;
  minMessages: number;
  enableMemoryInjection: boolean;
  memoryTopK?: number; // default 5
}

/**
 * Compaction configuration
 */
export interface CompactionConfig {
  /** Whether compaction is enabled (default: true) */
  enabled?: boolean;
  /** Token threshold to trigger auto-compaction (default: 100000) */
  tokenThreshold?: number;
  /** Minimum tokens to consider compaction (default: 50000) */
  minTokens?: number;
  /** Maximum tokens after compaction (default: 50000) */
  maxTokens?: number;
  /** Reserve tokens for future context (default: 16384) */
  reserveTokens?: number;
  /** Auto-compaction after agent:end (default: true) */
  autoCompact?: boolean;
  /** Enable LLM summarization for compacted branches (default: false) */
  summarize?: boolean;
  /** Optional model ID to use for summarization (defaults to current model) */
  summaryModelId?: string;
}

export interface MemoryEntry {
  content: string;
  relevance?: number;
  created_at?: string;
}

/**
 * Memory store interface (minimal for compilation)
 */
export interface MemoryStore {
  recall(query: string, options?: { topK?: number }): Promise<{ memories: any[]; scores: number[] }>;
  remember(action: string, content: string, metadata?: any): Promise<string>;
  getAll?(): Promise<any[]>;
  count?(): Promise<number>;
  clear?(): Promise<void>;
  init?(): Promise<void>;
}

/**
 * Strategy interface for agent loop control.
 */
export interface LoopStrategy {
  shouldContinue(response: LLMResponse, state: AgentRuntimeState): boolean;
  formatResults(results: ToolResult[]): string;
  transformPrompt?(prompt: string, state: AgentRuntimeState): string;
}

export interface AgentConfig {
  // Core
  maxRounds: number;
  // Optional booleans
  verbose?: boolean;
  enableLogging?: boolean;
  cacheResults?: boolean;
  autoSaveMemories?: boolean;
  debug?: boolean;
  sessionId?: string;
  // Tool execution
  toolTimeout?: number;
  // Compatibility: both old and new names
  toolExecutionStrategy?: ToolExecutionStrategy; // old: 'sequential'|'parallel'
  toolExecutionMode?: ToolExecutionMode; // new
  // Queue modes (steering = user interjections; followUp = post-turn)
  steeringMode?: QueueMode; // old: 'drain-all'|'dequeue-one'
  followUpMode?: QueueMode; // old
  queueMode?: QueueMode; // new unified: 'all'|'one-at-a-time' (maps steeringMode)
  // Thinking / reasoning
  reasoningLevel?: ThinkingLevel;
  thinkingBudgets?: Record<ThinkingLevel, number>;
  // Context & memory
  transformContext?: (turns: ConversationTurn[], signal?: AbortSignal) => Promise<ConversationTurn[]>;
  memoryStore?: MemoryStore;
  compaction?: CompactionConfig;
  contextBuilder?: ContextBuilderConfig; // legacy – still supported
  // Loop strategy
  loopStrategy?: 'react' | 'plan-solve' | 'reflection' | 'simple' | 'self-refine';
  // LLM integration hooks (llm-context/agent compatibility)
  convertToLlm?: ConvertToLlmFn;
  getApiKey?: GetApiKeyFn;
  shouldStopAfterTurn?: ShouldStopAfterTurnFn;
  onBeforeToolCall?: BeforeToolCallHook;
  onAfterToolCall?: AfterToolCallHook;
  onTurnEnd?: TurnEndHook;
  // Follow-up & steering hooks (llm-context/agent compatibility)
  getFollowUpMessages?: () => Promise<ConversationTurn[]>;
  getSteeringMessages?: () => Promise<ConversationTurn[]>;
  /**
   * Called after a turn completes (assistant message and any tool results have been appended to history)
   * and before the next LLM request is built. Allows dynamic adjustments to model/reasoning for the next turn.
   * Return an object with optional overrides (e.g., reasoningLevel) to modify the agent config for subsequent turns.
   */
  prepareNextTurn?: (ctx: PrepareNextTurnContext) => Promise<PrepareNextTurnOverride | undefined>;
  // Tool executor options (legacy)
  executor?: ToolExecutorConfig;
  // LLM retry configuration
  maxRetries?: number; // default 2
  retryDelayMs?: number; // base delay in ms, default 1000
  // Tool execution retry configuration
  toolMaxRetries?: number; // default 1
  toolRetryDelayMs?: number; // base delay in ms, default 500
  // Smart memory retention
  memoryBoosting?: boolean; // default false – boost scores for read_file, edit_file, tool_result with code

  // Callback for dynamic model changes from prepareNextTurn
  setModel?: (model: Model) => void;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  reasoning?: ThinkingLevel;
  signal?: AbortSignal;
  apiKey?: string;
  sessionId?: string;
  thinkingBudget?: number;
  transport?: TransportType;
  onPayload?: (payload: unknown) => void;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image'; data: string }>;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCallData[];
  stopReason: StopReason;
  usage?: Usage;
  errorMessage?: string;
}

export interface ToolCallData {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Session-level metrics for profiling */
export interface SessionMetrics {
  llmCalls: number;
  llmTokensInput: number;
  llmTokensOutput: number;
  llmTotalLatencyMs: number;
  toolCalls: number;
  toolSuccesses: number;
  toolFailures: number;
  toolTotalLatencyMs: number;
  memoryRetrievals: number;
  memoryCacheHits: number;
  memoryCacheMisses: number;
  memoryAvgLatencyMs: number;
  compactions: number;
  compactionTokensSaved: number;
}

export const createSessionMetrics = (): SessionMetrics => ({
  llmCalls: 0,
  llmTokensInput: 0,
  llmTokensOutput: 0,
  llmTotalLatencyMs: 0,
  toolCalls: 0,
  toolSuccesses: 0,
  toolFailures: 0,
  toolTotalLatencyMs: 0,
  memoryRetrievals: 0,
  memoryCacheHits: 0,
  memoryCacheMisses: 0,
  memoryAvgLatencyMs: 0,
  compactions: 0,
  compactionTokensSaved: 0,
});

export type LLMStreamEvent =
  | { type: 'start'; partial: AssistantTurn }
  | { type: 'text_start'; contentIndex: number; partial: AssistantTurn }
  | { type: 'text_delta'; contentIndex: number; delta: string; partial: AssistantTurn }
  | { type: 'text_end'; contentIndex: number; content: string; partial: AssistantTurn }
  | { type: 'thinking_start'; contentIndex: number; partial: AssistantTurn }
  | { type: 'thinking_delta'; contentIndex: number; delta: string; partial: AssistantTurn }
  | { type: 'thinking_end'; contentIndex: number; content: string; partial: AssistantTurn }
  | { type: 'toolcall_start'; contentIndex: number; toolCall: ToolCallData; partial: AssistantTurn }
  | { type: 'toolcall_delta'; contentIndex: number; delta: string; partial: AssistantTurn }
  | { type: 'toolcall_end'; contentIndex: number; toolCall: ToolCallData; partial: AssistantTurn }
  | { type: 'done'; reason: StopReason; usage: Usage; message: AssistantTurn }
  | { type: 'error'; reason: StopReason; error: AssistantTurn };

export type StreamFunction = (
  model: Model,
  context: { systemPrompt: string; messages: LLMMessage[]; tools: ToolDefinition[] },
  options: StreamOptions
) => AsyncIterable<LLMStreamEvent>;
