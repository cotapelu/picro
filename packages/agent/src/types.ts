// SPDX-License-Identifier: Apache-2.0
/**
 * Core type definitions for the agent system.
 * Designed independently with a different structure from pi-agent-legacy.
 */

import type { EventEmitter } from './event-emitter.js';

// ============================================================================
// Basic Types
// ============================================================================

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type StopReason = 'stop' | 'length' | 'toolUse' | 'aborted' | 'error' | 'max_rounds';

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export type QueueMode = 'drain-all' | 'dequeue-one';

export type ToolExecutionStrategy = 'sequential' | 'parallel';

export type TransportType = 'sse' | 'websocket' | 'polling';

// ============================================================================
// Message Types
// ============================================================================

export interface TextBlock {
  type: 'text';
  text: string;
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

export type ContentBlock = TextBlock | ThinkingBlock | ToolCallBlock;

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
  content: TextBlock[];
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

export interface ToolParameter {
  type: string;
  description?: string;
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  handler: ToolHandler;
}

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

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext,
  onProgress?: (update: ToolProgressUpdate) => void | Promise<void>
) => string | Promise<string> | void | Promise<void>;

export interface ToolExecutionMetadata {
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

export interface SuccessfulToolResult {
  toolCallId: string;
  toolName: string;
  result: string;
  executionTime: number;
  isError: false;
  metadata: ToolExecutionMetadata;
}

export interface FailedToolResult {
  toolCallId: string;
  toolName: string;
  error: string;
  executionTime: number;
  isError: true;
  metadata: ToolExecutionMetadata;
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
   toolExecutionStrategy: ToolExecutionStrategy;
   emitter?: EventEmitter;
   beforeToolCall?: BeforeToolHook;
   afterToolCall?: AfterToolHook;
   /** Whether to emit progress updates during tool execution */
   emitProgressUpdates?: boolean;
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
  }, signal?: AbortSignal): Promise<HookResult | undefined>;
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
   maxRounds: number;
   verbose: boolean;
   toolTimeout: number;
   cacheResults: boolean;
   toolExecutionStrategy: ToolExecutionStrategy;
   contextBuilder: ContextBuilderConfig;
   executor: ToolExecutorConfig;
   enableLogging: boolean;
   sessionId?: string;
   thinkingBudgets?: Record<ThinkingLevel, number>;
   reasoningLevel?: ThinkingLevel;
   transformContext?: (turns: ConversationTurn[], signal?: AbortSignal) => Promise<ConversationTurn[]>;
   steeringMode: QueueMode;
   followUpMode: QueueMode;
   autoSaveMemories?: boolean;
   memoryStore?: MemoryStore;
   /** Loop strategy to use (react, plan-solve, reflection, simple, self-refine) */
   loopStrategy?: 'react' | 'plan-solve' | 'reflection' | 'simple' | 'self-refine';
   /** Enable debug mode with detailed timing and metrics */
   debug?: boolean;
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

export interface AIModel {
  id: string;
  name: string;
  api: string;
  provider: string;
  baseUrl?: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost?: number;
  cacheWriteCost?: number;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
    total: number;
  };
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
  model: AIModel,
  context: { systemPrompt: string; messages: LLMMessage[]; tools: ToolDefinition[] },
  options: StreamOptions
) => AsyncIterable<LLMStreamEvent>;
