"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/runtime - Application Layer
 *
 * Runtime-specific utilities, UI components, and composition roots.
 * Depends on ../agent (core) and ../session (session management).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShellConfig = exports.substituteArgs = exports.parseCommandArgs = exports.loadPromptTemplates = exports.KEYBINDINGS = exports.KeybindingsManager = exports.Telemetry = exports.DEFAULT_MAX_LINE_LENGTH = exports.DEFAULT_MAX_OUTPUT_SIZE = exports.validateOutput = exports.sanitizeOutput = exports.BUILTIN_SLASH_COMMANDS = exports.listSlashCommands = exports.getSlashCommand = exports.formatSkillsForPrompt = exports.loadSkillsFromDir = exports.loadSkills = exports.DefaultPackageManager = exports.isValidThinkingLevel = exports.parseArgs = exports.FileMutationQueue = exports.truncatePreserveEnds = exports.truncateMiddle = exports.truncateVisualLines = exports.truncateLines = exports.truncateBytes = exports.supportsStreaming = exports.mergeToolCalls = exports.createStream = exports.pipeStream = exports.collectStream = exports.formatLoginInstructions = exports.formatNoModelsAvailableMessage = exports.formatNoModelSelectedMessage = exports.formatNoApiKeyFoundMessage = exports.buildSystemPrompt = exports.PerformanceTracker = exports.loadProjectContextFiles = exports.DefaultResourceLoader = exports.SettingsManager = exports.AgentSession = exports.ToolExecutor = exports.Agent = exports.createAgentSessionRuntime = void 0;
// Composition Root
var agent_session_runtime_js_1 = require("./agent-session-runtime.js");
Object.defineProperty(exports, "createAgentSessionRuntime", { enumerable: true, get: function () { return agent_session_runtime_js_1.createAgentSessionRuntime; } });
// Re-export core & session for convenience
var index_js_1 = require("../agent/index.js");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return index_js_1.Agent; } });
var tool_executor_js_1 = require("../agent/tool-executor.js");
Object.defineProperty(exports, "ToolExecutor", { enumerable: true, get: function () { return tool_executor_js_1.ToolExecutor; } });
// Session
var agent_session_js_1 = require("../session/agent-session.js");
Object.defineProperty(exports, "AgentSession", { enumerable: true, get: function () { return agent_session_js_1.AgentSession; } });
// Utilities
var settings_manager_js_1 = require("./settings-manager.js");
Object.defineProperty(exports, "SettingsManager", { enumerable: true, get: function () { return settings_manager_js_1.SettingsManager; } });
var resource_loader_js_1 = require("./resource-loader.js");
Object.defineProperty(exports, "DefaultResourceLoader", { enumerable: true, get: function () { return resource_loader_js_1.DefaultResourceLoader; } });
Object.defineProperty(exports, "loadProjectContextFiles", { enumerable: true, get: function () { return resource_loader_js_1.loadProjectContextFiles; } });
var performance_tracker_js_1 = require("./performance-tracker.js");
Object.defineProperty(exports, "PerformanceTracker", { enumerable: true, get: function () { return performance_tracker_js_1.PerformanceTracker; } });
// Prompt & Auth (runtime-specific)
var system_prompt_js_1 = require("./system-prompt.js");
Object.defineProperty(exports, "buildSystemPrompt", { enumerable: true, get: function () { return system_prompt_js_1.buildSystemPrompt; } });
var auth_guidance_js_1 = require("./auth-guidance.js");
Object.defineProperty(exports, "formatNoApiKeyFoundMessage", { enumerable: true, get: function () { return auth_guidance_js_1.formatNoApiKeyFoundMessage; } });
Object.defineProperty(exports, "formatNoModelSelectedMessage", { enumerable: true, get: function () { return auth_guidance_js_1.formatNoModelSelectedMessage; } });
Object.defineProperty(exports, "formatNoModelsAvailableMessage", { enumerable: true, get: function () { return auth_guidance_js_1.formatNoModelsAvailableMessage; } });
Object.defineProperty(exports, "formatLoginInstructions", { enumerable: true, get: function () { return auth_guidance_js_1.formatLoginInstructions; } });
// Stream utilities (generic)
var stream_utils_js_1 = require("./stream-utils.js");
Object.defineProperty(exports, "collectStream", { enumerable: true, get: function () { return stream_utils_js_1.collectStream; } });
Object.defineProperty(exports, "pipeStream", { enumerable: true, get: function () { return stream_utils_js_1.pipeStream; } });
Object.defineProperty(exports, "createStream", { enumerable: true, get: function () { return stream_utils_js_1.createStream; } });
Object.defineProperty(exports, "mergeToolCalls", { enumerable: true, get: function () { return stream_utils_js_1.mergeToolCalls; } });
Object.defineProperty(exports, "supportsStreaming", { enumerable: true, get: function () { return stream_utils_js_1.supportsStreaming; } });
// Truncation utilities
var truncate_js_1 = require("./truncate.js");
Object.defineProperty(exports, "truncateBytes", { enumerable: true, get: function () { return truncate_js_1.truncateBytes; } });
Object.defineProperty(exports, "truncateLines", { enumerable: true, get: function () { return truncate_js_1.truncateLines; } });
Object.defineProperty(exports, "truncateVisualLines", { enumerable: true, get: function () { return truncate_js_1.truncateVisualLines; } });
Object.defineProperty(exports, "truncateMiddle", { enumerable: true, get: function () { return truncate_js_1.truncateMiddle; } });
Object.defineProperty(exports, "truncatePreserveEnds", { enumerable: true, get: function () { return truncate_js_1.truncatePreserveEnds; } });
// File mutation queue (atomic operations)
var file_mutation_queue_js_1 = require("./file-mutation-queue.js");
Object.defineProperty(exports, "FileMutationQueue", { enumerable: true, get: function () { return file_mutation_queue_js_1.FileMutationQueue; } });
// CLI arguments
var cli_args_js_1 = require("./cli-args.js");
Object.defineProperty(exports, "parseArgs", { enumerable: true, get: function () { return cli_args_js_1.parseArgs; } });
Object.defineProperty(exports, "isValidThinkingLevel", { enumerable: true, get: function () { return cli_args_js_1.isValidThinkingLevel; } });
// Package manager
var package_manager_js_1 = require("./package-manager.js");
Object.defineProperty(exports, "DefaultPackageManager", { enumerable: true, get: function () { return package_manager_js_1.DefaultPackageManager; } });
// Skills & Slash commands
var skills_js_1 = require("./skills.js");
Object.defineProperty(exports, "loadSkills", { enumerable: true, get: function () { return skills_js_1.loadSkills; } });
Object.defineProperty(exports, "loadSkillsFromDir", { enumerable: true, get: function () { return skills_js_1.loadSkillsFromDir; } });
Object.defineProperty(exports, "formatSkillsForPrompt", { enumerable: true, get: function () { return skills_js_1.formatSkillsForPrompt; } });
var slash_commands_js_1 = require("./slash-commands.js");
Object.defineProperty(exports, "getSlashCommand", { enumerable: true, get: function () { return slash_commands_js_1.getSlashCommand; } });
Object.defineProperty(exports, "listSlashCommands", { enumerable: true, get: function () { return slash_commands_js_1.listSlashCommands; } });
Object.defineProperty(exports, "BUILTIN_SLASH_COMMANDS", { enumerable: true, get: function () { return slash_commands_js_1.BUILTIN_SLASH_COMMANDS; } });
// Output guard
var output_guard_js_1 = require("./output-guard.js");
Object.defineProperty(exports, "sanitizeOutput", { enumerable: true, get: function () { return output_guard_js_1.sanitizeOutput; } });
Object.defineProperty(exports, "validateOutput", { enumerable: true, get: function () { return output_guard_js_1.validateOutput; } });
Object.defineProperty(exports, "DEFAULT_MAX_OUTPUT_SIZE", { enumerable: true, get: function () { return output_guard_js_1.DEFAULT_MAX_OUTPUT_SIZE; } });
Object.defineProperty(exports, "DEFAULT_MAX_LINE_LENGTH", { enumerable: true, get: function () { return output_guard_js_1.DEFAULT_MAX_LINE_LENGTH; } });
// Telemetry
var telemetry_js_1 = require("./telemetry.js");
Object.defineProperty(exports, "Telemetry", { enumerable: true, get: function () { return telemetry_js_1.Telemetry; } });
// Keybindings
var keybindings_js_1 = require("./keybindings.js");
Object.defineProperty(exports, "KeybindingsManager", { enumerable: true, get: function () { return keybindings_js_1.KeybindingsManager; } });
Object.defineProperty(exports, "KEYBINDINGS", { enumerable: true, get: function () { return keybindings_js_1.KEYBINDINGS; } });
// Prompt templates
var prompt_templates_js_1 = require("./prompt-templates.js");
Object.defineProperty(exports, "loadPromptTemplates", { enumerable: true, get: function () { return prompt_templates_js_1.loadPromptTemplates; } });
Object.defineProperty(exports, "parseCommandArgs", { enumerable: true, get: function () { return prompt_templates_js_1.parseCommandArgs; } });
Object.defineProperty(exports, "substituteArgs", { enumerable: true, get: function () { return prompt_templates_js_1.substituteArgs; } });
// Shell utilities
var shell_js_1 = require("../utils/shell.js");
Object.defineProperty(exports, "getShellConfig", { enumerable: true, get: function () { return shell_js_1.getShellConfig; } });
//# sourceMappingURL=index.js.map