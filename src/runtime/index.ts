// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/runtime - Application Layer
 *
 * Runtime-specific utilities, UI components, and composition roots.
 * Depends on ../agent (core) and ../session (session management).
 */

// Composition Root
export { createAgentSessionRuntime } from './agent-session-runtime.js';
export type {
  AgentSessionRuntimeDiagnostic,
  CreateAgentSessionRuntimeResult,
  AgentSessionRuntime,
} from './agent-session-runtime.js';

// Session Interfaces (UI/Runtime contracts)
export type {
  AgentSessionInterface,
  AgentSessionRuntimeInterface,
  AgentSessionRuntimeEvent,
} from './agent-session-interfaces.js';

// Re-export core & session for convenience
export { Agent, AgentConfig, AgentRunResult } from '../agent/index.js';
export { ToolExecutor } from '../agent/tool-executor.js';

// Session
export { AgentSession } from '../session/agent-session.js';
export type {
  AgentSessionConfig,
  AgentSessionEventListener,
  AgentSessionEvent,
  QueueUpdateEvent,
  CompactionStartEvent,
  CompactionEndEvent,
  AutoRetryStartEvent,
  AutoRetryEndEvent,
  CompactionResult,
  PromptOptions,
  ModelCycleResult,
  SessionStats,
  ParsedSkillBlock,
} from '../session/agent-session-types.js';

// Utilities
export { SettingsManager } from './settings-manager.js';
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader.js';
export { PerformanceTracker } from './performance-tracker.js';

// Prompt & Auth (runtime-specific)
export { buildSystemPrompt } from './system-prompt.js';
export type { BuildSystemPromptOptions } from './system-prompt.js';

export {
  formatNoApiKeyFoundMessage,
  formatNoModelSelectedMessage,
  formatNoModelsAvailableMessage,
  formatLoginInstructions,
} from './auth-guidance.js';

// Stream utilities (generic)
export {
  collectStream,
  pipeStream,
  createStream,
  mergeToolCalls,
  supportsStreaming,
} from './stream-utils.js';

// Truncation utilities
export {
  truncateBytes,
  truncateLines,
  truncateVisualLines,
  truncateMiddle,
  truncatePreserveEnds,
  type TruncationResult,
} from './truncate.js';

// File mutation queue (atomic operations)
export { FileMutationQueue, type FileMutation, type FileMutationQueueOptions } from './file-mutation-queue.js';

// CLI arguments
export { parseArgs, type Args, type Mode, type ThinkingLevel as CliThinkingLevel, isValidThinkingLevel } from './cli-args.js';

// Package manager
export { DefaultPackageManager, type PackageSource, type ResolvedPackage, type PackageManagerOptions } from './package-manager.js';

// Skills & Slash commands
export { loadSkills, loadSkillsFromDir, formatSkillsForPrompt, type Skill, type LoadSkillsOptions } from './skills.js';
export { getSlashCommand, listSlashCommands, type SlashCommandInfo, BUILTIN_SLASH_COMMANDS } from './slash-commands.js';

// Output guard
export { sanitizeOutput, validateOutput, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_LINE_LENGTH, type OutputValidation } from './output-guard.js';

// Telemetry
export { Telemetry, type TelemetryEvent } from './telemetry.js';

// Keybindings
export { KeybindingsManager, KEYBINDINGS, type Keybinding, type AppKeybindings, type AppKeybinding } from './keybindings.js';

// Prompt templates
export { loadPromptTemplates, type PromptTemplate, type LoadPromptTemplatesOptions, parseCommandArgs, substituteArgs } from './prompt-templates.js';

// Shell utilities
export { getShellConfig } from '../utils/shell.js';
