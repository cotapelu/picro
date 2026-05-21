// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/runtime - Application Layer
 *
 * Runtime-specific utilities, UI components, and composition roots.
 * Depends on ../agent (core) and ../session (session management).
 */

// Composition Root
export { createAgentSessionRuntime } from './agent-session-runtime';
export type {
  AgentSessionRuntimeDiagnostic,
  CreateAgentSessionRuntimeResult,
  AgentSessionRuntime,
} from './agent-session-runtime';

// Session Interfaces (UI/Runtime contracts)
export type {
  AgentSessionInterface,
  AgentSessionRuntimeInterface,
  AgentSessionRuntimeEvent,
} from './agent-session-interfaces';

// Re-export core & session for convenience
export { Agent, AgentConfig, AgentRunResult } from '../agent';
export { ToolExecutor } from '../agent/tool-executor';

// Session
export { AgentSession } from '../session/agent-session';
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
} from '../session/agent-session-types';

// Utilities
export { SettingsManager } from './settings-manager';
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader';
export { PerformanceTracker } from './performance-tracker';

// Prompt & Auth (runtime-specific)
export { buildSystemPrompt } from './system-prompt';
export type { BuildSystemPromptOptions } from './system-prompt';

export {
  formatNoApiKeyFoundMessage,
  formatNoModelSelectedMessage,
  formatNoModelsAvailableMessage,
  formatLoginInstructions,
} from './auth-guidance';

// Stream utilities (generic)
export {
  collectStream,
  pipeStream,
  createStream,
  mergeToolCalls,
  supportsStreaming,
} from './stream-utils';

// Truncation utilities
export {
  truncateBytes,
  truncateLines,
  truncateVisualLines,
  truncateMiddle,
  truncatePreserveEnds,
  type TruncationResult,
} from './truncate';

// File mutation queue (atomic operations)
export { FileMutationQueue, type FileMutation, type FileMutationQueueOptions } from './file-mutation-queue';

// CLI arguments
export { parseArgs, type Args, type Mode, type ThinkingLevel as CliThinkingLevel, isValidThinkingLevel } from './cli-args';

// Package manager
export { DefaultPackageManager, type PackageSource, type ResolvedPackage, type PackageManagerOptions } from './package-manager';

// Skills & Slash commands
export { loadSkills, loadSkillsFromDir, formatSkillsForPrompt, type Skill, type LoadSkillsOptions } from './skills';
export { getSlashCommand, listSlashCommands, type SlashCommandInfo, BUILTIN_SLASH_COMMANDS } from './slash-commands';

// Output guard
export { sanitizeOutput, validateOutput, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_LINE_LENGTH, type OutputValidation } from './output-guard';

// Telemetry
export { Telemetry, type TelemetryEvent } from './telemetry';

// Keybindings
export { KeybindingsManager, KEYBINDINGS, type Keybinding, type AppKeybindings, type AppKeybinding } from './keybindings';

// Prompt templates
export { loadPromptTemplates, type PromptTemplate, type LoadPromptTemplatesOptions, parseCommandArgs, substituteArgs } from './prompt-templates';

// Shell utilities
export { getShellConfig } from '../utils/shell';
