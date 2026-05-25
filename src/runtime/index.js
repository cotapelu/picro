// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/runtime - Application Layer
 *
 * Runtime-specific utilities, UI components, and composition roots.
 * Depends on ../agent (core) and ../session (session management).
 */
// Composition Root
export { createAgentSessionRuntime } from './agent-session-runtime.js';
// Re-export core & session for convenience
export { Agent } from '../agent/index.js';
export { ToolExecutor } from '../agent/tool-executor.js';
// Session
export { AgentSession } from '../session/agent-session.js';
// Utilities
export { SettingsManager } from './settings-manager.js';
export { DefaultResourceLoader, loadProjectContextFiles } from './resource-loader.js';
export { PerformanceTracker } from './performance-tracker.js';
// Prompt & Auth (runtime-specific)
export { buildSystemPrompt } from './system-prompt.js';
export { formatNoApiKeyFoundMessage, formatNoModelSelectedMessage, formatNoModelsAvailableMessage, formatLoginInstructions, } from './auth-guidance.js';
// Stream utilities (generic)
export { collectStream, pipeStream, createStream, mergeToolCalls, supportsStreaming, } from './stream-utils.js';
// Truncation utilities
export { truncateBytes, truncateLines, truncateVisualLines, truncateMiddle, truncatePreserveEnds, } from './truncate.js';
// File mutation queue (atomic operations)
export { FileMutationQueue } from './file-mutation-queue.js';
// CLI arguments
export { parseArgs, isValidThinkingLevel } from './cli-args.js';
// Package manager
export { DefaultPackageManager } from './package-manager.js';
// Skills & Slash commands
export { loadSkills, loadSkillsFromDir, formatSkillsForPrompt } from './skills.js';
export { getSlashCommand, listSlashCommands, BUILTIN_SLASH_COMMANDS } from './slash-commands.js';
// Output guard
export { sanitizeOutput, validateOutput, DEFAULT_MAX_OUTPUT_SIZE, DEFAULT_MAX_LINE_LENGTH } from './output-guard.js';
// Telemetry
export { Telemetry } from './telemetry.js';
// Keybindings
export { KeybindingsManager, KEYBINDINGS } from './keybindings.js';
// Prompt templates
export { loadPromptTemplates, parseCommandArgs, substituteArgs } from './prompt-templates.js';
// Shell utilities
export { getShellConfig } from '../utils/shell.js';
