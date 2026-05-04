// SPDX-License-Identifier: Apache-2.0
/**
 * AgentSession Types - Type definitions for AgentSession module
 */

import type { AgentRuntimeState } from "./types";
import type { ModelEntry } from "./model-registry";
import type { ToolDefinition } from "./types";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for creating an AgentSession
 */
export interface AgentSessionConfig {
  /** The Agent instance */
  agent: any;

  /** Session manager for persistence */
  sessionManager: any;

  /** Settings manager */
  settingsManager: any;

  /** Working directory */
  cwd: string;

  /** Models to cycle through with Ctrl+P */
  scopedModels?: Array<{ model: ModelEntry; thinkingLevel?: any }>;

  /** Resource loader */
  resourceLoader: any;

  /** SDK custom tools */
  customTools?: ToolDefinition[];

  /** Model registry */
  modelRegistry: any;

  /** Initial active tool names */
  initialActiveToolNames?: string[];

  /** Optional allowlist of tool names */
  allowedToolNames?: string[];

  /** Compaction configuration */
  compaction?: any;

  /** Extension runner for managing extensions */
  extensionRunner?: any;

  /** Max steering queue size (0 = unlimited) */
  maxSteeringQueueSize?: number;

  /** Max follow-up queue size (0 = unlimited) */
  maxFollowUpQueueSize?: number;

  /** Enable performance tracking (default false) */
  enablePerformanceTracking?: boolean;
}


/**
 * Parsed skill block from a user message
 */
export interface ParsedSkillBlock {
  name: string;
  location: string;
  content: string;
  userMessage: string | undefined;
}

/**
 * Options for AgentSession.prompt()
 */
export interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: Array<{ type: "image"; data: string; mimeType: string }>;
  streamingBehavior?: "steer" | "followUp";
}

/**
 * Result from cycleModel()
 */
export interface ModelCycleResult {
  model: ModelEntry;
  thinkingLevel: any;
  isScoped: boolean;
}

/**
 * Session statistics
 */
export interface SessionStats {
  sessionFile: string | undefined;
  sessionId: string;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: number;
  contextUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Tool definition entry with metadata
 */
export interface ToolDefinitionEntry {
  definition: ToolDefinition;
  sourceInfo?: SourceInfo;
}

/**
 * Source information for tools/commands
 */
export interface SourceInfo {
  path: string;
  source: "local" | "builtin" | "extension" | "temporary";
  scope: "user" | "project" | "temporary";
  origin: "top-level" | "package";
  baseDir?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Session-specific events
 */
export type AgentSessionEvent =
  | { type: string; [key: string]: any };

/**
 * Queue update event
 */
export interface QueueUpdateEvent {
  type: "queue_update";
  steering: readonly string[];
  followUp: readonly string[];
}

/**
 * Compaction start event
 */
export interface CompactionStartEvent {
  type: "compaction_start";
  reason: "manual" | "threshold" | "overflow";
}

/**
 * Compaction end event
 */
export interface CompactionEndEvent {
  type: "compaction_end";
  reason: "manual" | "threshold" | "overflow";
  result?: CompactionResult;
  aborted: boolean;
  willRetry: boolean;
  errorMessage?: string;
}

/**
 * Auto-retry start event
 */
export interface AutoRetryStartEvent {
  type: "auto_retry_start";
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  errorMessage: string;
}

/**
 * Auto-retry end event
 */
export interface AutoRetryEndEvent {
  type: "auto_retry_end";
  success: boolean;
  attempt: number;
  finalError?: string;
}

/**
 * Compaction result
 */
export interface CompactionResult {
  messages: any[];
  systemPrompt?: string;
  removedCount: number;
  estimatedSavings: number;
}

/**
 * Listener function for agent session events
 */
export type AgentSessionEventListener = (event: AgentSessionEvent) => void;