// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/session - Session Management
 *
 * Handles session persistence, compaction, branching, and message conversion.
 * Depends on ../agent for core types and logic.
 */
// Main Session Class
export { AgentSession } from './agent-session.js';
// Services
export { createAgentSessionServices } from './agent-session-services.js';
// Session Manager
export { SessionManager } from './session-manager.js';
// Conversion utilities
export { convertSessionMessagesToLlm } from './convert-to-llm.js';
// Model Registry & Resolver
export { DefaultModelRegistry, createModelRegistry } from './model-registry.js';
export { defaultModelPerProvider, parseModelPattern, resolveModelScope, resolveCliModel, findInitialModel, restoreModelFromSession, } from './model-resolver.js';
// Auth Storage
export { AuthStorage } from './auth-storage.js';
// Defaults
export { DEFAULT_THINKING_LEVEL, DEFAULT_TOOL_TIMEOUT, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_OUTPUT_LINES, DEFAULT_COMPACTION_THRESHOLD, DEFAULT_MAX_HISTORY_TURNS, DEFAULT_TEMPERATURE, DEFAULT_TOP_P, DEFAULT_MAX_RETRIES, } from './defaults.js';
// Compaction
export { calculateContextTokens, estimateContextTokens, estimateContextUsage, shouldCompact, prepareCompaction, compact as performCompaction, } from './compaction.js';
// Branch Summarization
export { collectEntriesForBranchSummary, generateBranchSummary, } from './branch-summarization.js';
//# sourceMappingURL=index.js.map