// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/session - Session Management
 *
 * Handles session persistence, compaction, branching, and message conversion.
 * Depends on ../agent for core types and logic.
 */

// Main Session Class
export { AgentSession } from './agent-session';
export type {
  AgentSessionConfig,
  AgentSessionEventListener,
  AgentSessionEvent,
  QueueUpdateEvent,
  CompactionStartEvent,
  CompactionEndEvent,
  AutoRetryStartEvent,
  AutoRetryEndEvent,
  PromptOptions,
  ModelCycleResult,
  SessionStats,
  ParsedSkillBlock,
} from './agent-session-types';

// Session Message Types (Message-based types)
export type {
  AgentMessage,
  SystemMessage,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  ContentBlock,
  TextContent,
  ImageContent,
  ThinkingContent,
  ToolCallContent,
  ToolResultContent,
} from './agent-types';
export type { ThinkingLevel } from './agent-types';

// Services
export { createAgentSessionServices, type AgentSessionServices } from './agent-session-services';

// Session Manager
export { SessionManager } from './session-manager';
export type {
  SessionEntry,
  BranchSummaryEntry,
  CompactionEntry,
  SessionHeader,
} from './session-manager';

// Conversion utilities
export { convertSessionMessagesToLlm } from './convert-to-llm';

// Model Registry & Resolver
export { DefaultModelRegistry, type ModelRegistry, type ModelEntry, createModelRegistry } from './model-registry';
export { type Model as LlmModel } from '../llm'; // re-export for convenience
export {
  defaultModelPerProvider,
  parseModelPattern,
  resolveModelScope,
  resolveCliModel,
  findInitialModel,
  restoreModelFromSession,
} from './model-resolver';

// Auth Storage
export { AuthStorage, type AuthCredential, type ApiKeyCredential, type OAuthCredential, type AuthStorageData, type AuthStatus } from './auth-storage';

// Defaults
export {
  DEFAULT_THINKING_LEVEL,
  DEFAULT_TOOL_TIMEOUT,
  DEFAULT_MAX_OUTPUT_SIZE,
  DEFAULT_MAX_OUTPUT_LINES,
  DEFAULT_COMPACTION_THRESHOLD,
  DEFAULT_MAX_HISTORY_TURNS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  DEFAULT_MAX_RETRIES,
} from './defaults';

// Compaction
export {
  type CompactionPreparation,
  type FileOperations,
  calculateContextTokens,
  estimateContextTokens,
  estimateContextUsage,
  shouldCompact,
  prepareCompaction,
  compact as performCompaction,
  type CompactionResult,
} from './compaction';

// Branch Summarization
export {
  type BranchSummaryDetails,
  type CollectEntriesResult,
  type BranchPreparation,
  collectEntriesForBranchSummary,
  generateBranchSummary,
} from './branch-summarization';
