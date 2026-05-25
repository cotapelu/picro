/**
 * @picro/session - Session Management
 *
 * Handles session persistence, compaction, branching, and message conversion.
 * Depends on ../agent for core types and logic.
 */
export { AgentSession } from './agent-session.js';
export type { AgentSessionConfig, AgentSessionEventListener, AgentSessionEvent, QueueUpdateEvent, CompactionStartEvent, CompactionEndEvent, AutoRetryStartEvent, AutoRetryEndEvent, PromptOptions, ModelCycleResult, SessionStats, ParsedSkillBlock, } from './agent-session-types.js';
export type { AgentMessage, SystemMessage, UserMessage, AssistantMessage, ToolMessage, ContentBlock, TextContent, ImageContent, ThinkingContent, ToolCallContent, ToolResultContent, } from './agent-types.js';
export type { ThinkingLevel } from './agent-types.js';
export { createAgentSessionServices, type AgentSessionServices } from './agent-session-services.js';
export { SessionManager } from './session-manager.js';
export type { SessionEntry, BranchSummaryEntry, CompactionEntry, SessionHeader, } from './session-manager.js';
export { convertSessionMessagesToLlm } from './convert-to-llm.js';
export { DefaultModelRegistry, type ModelRegistry, type ModelEntry, createModelRegistry } from './model-registry.js';
export { type Model as LlmModel } from '../llm/index.js';
export { defaultModelPerProvider, parseModelPattern, resolveModelScope, resolveCliModel, findInitialModel, restoreModelFromSession, } from './model-resolver.js';
export { AuthStorage, type AuthCredential, type ApiKeyCredential, type OAuthCredential, type AuthStorageData, type AuthStatus } from './auth-storage.js';
export { DEFAULT_THINKING_LEVEL, DEFAULT_TOOL_TIMEOUT, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_OUTPUT_LINES, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_MAX_HISTORY_TURNS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_MAX_RETRIES, } from './defaults.js';
export { type CompactionPreparation, type FileOperations, calculateContextTokens, estimateContextTokens, estimateContextUsage, shouldCompact, prepareCompaction, compact as performCompaction, type CompactionResult, } from './compaction.js';
export { type BranchSummaryDetails, type CollectEntriesResult, type BranchPreparation, collectEntriesForBranchSummary, generateBranchSummary, } from './branch-summarization.js';
//# sourceMappingURL=index.d.ts.map