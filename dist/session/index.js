"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/session - Session Management
 *
 * Handles session persistence, compaction, branching, and message conversion.
 * Depends on ../agent for core types and logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBranchSummary = exports.collectEntriesForBranchSummary = exports.performCompaction = exports.prepareCompaction = exports.shouldCompact = exports.estimateContextUsage = exports.estimateContextTokens = exports.calculateContextTokens = exports.DEFAULT_MAX_RETRIES = exports.DEFAULT_TOP_P = exports.DEFAULT_TEMPERATURE = exports.DEFAULT_MAX_HISTORY_TURNS = exports.DEFAULT_COMPACTION_THRESHOLD = exports.DEFAULT_MAX_OUTPUT_LINES = exports.DEFAULT_MAX_OUTPUT_SIZE = exports.DEFAULT_TOOL_TIMEOUT = exports.DEFAULT_THINKING_LEVEL = exports.AuthStorage = exports.restoreModelFromSession = exports.findInitialModel = exports.resolveCliModel = exports.resolveModelScope = exports.parseModelPattern = exports.defaultModelPerProvider = exports.createModelRegistry = exports.DefaultModelRegistry = exports.convertSessionMessagesToLlm = exports.SessionManager = exports.createAgentSessionServices = exports.AgentSession = void 0;
// Main Session Class
var agent_session_js_1 = require("./agent-session.js");
Object.defineProperty(exports, "AgentSession", { enumerable: true, get: function () { return agent_session_js_1.AgentSession; } });
// Services
var agent_session_services_js_1 = require("./agent-session-services.js");
Object.defineProperty(exports, "createAgentSessionServices", { enumerable: true, get: function () { return agent_session_services_js_1.createAgentSessionServices; } });
// Session Manager
var session_manager_js_1 = require("./session-manager.js");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return session_manager_js_1.SessionManager; } });
// Conversion utilities
var convert_to_llm_js_1 = require("./convert-to-llm.js");
Object.defineProperty(exports, "convertSessionMessagesToLlm", { enumerable: true, get: function () { return convert_to_llm_js_1.convertSessionMessagesToLlm; } });
// Model Registry & Resolver
var model_registry_js_1 = require("./model-registry.js");
Object.defineProperty(exports, "DefaultModelRegistry", { enumerable: true, get: function () { return model_registry_js_1.DefaultModelRegistry; } });
Object.defineProperty(exports, "createModelRegistry", { enumerable: true, get: function () { return model_registry_js_1.createModelRegistry; } });
var model_resolver_js_1 = require("./model-resolver.js");
Object.defineProperty(exports, "defaultModelPerProvider", { enumerable: true, get: function () { return model_resolver_js_1.defaultModelPerProvider; } });
Object.defineProperty(exports, "parseModelPattern", { enumerable: true, get: function () { return model_resolver_js_1.parseModelPattern; } });
Object.defineProperty(exports, "resolveModelScope", { enumerable: true, get: function () { return model_resolver_js_1.resolveModelScope; } });
Object.defineProperty(exports, "resolveCliModel", { enumerable: true, get: function () { return model_resolver_js_1.resolveCliModel; } });
Object.defineProperty(exports, "findInitialModel", { enumerable: true, get: function () { return model_resolver_js_1.findInitialModel; } });
Object.defineProperty(exports, "restoreModelFromSession", { enumerable: true, get: function () { return model_resolver_js_1.restoreModelFromSession; } });
// Auth Storage
var auth_storage_js_1 = require("./auth-storage.js");
Object.defineProperty(exports, "AuthStorage", { enumerable: true, get: function () { return auth_storage_js_1.AuthStorage; } });
// Defaults
var defaults_js_1 = require("./defaults.js");
Object.defineProperty(exports, "DEFAULT_THINKING_LEVEL", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_THINKING_LEVEL; } });
Object.defineProperty(exports, "DEFAULT_TOOL_TIMEOUT", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TOOL_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_MAX_OUTPUT_SIZE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MAX_OUTPUT_SIZE; } });
Object.defineProperty(exports, "DEFAULT_MAX_OUTPUT_LINES", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MAX_OUTPUT_LINES; } });
Object.defineProperty(exports, "DEFAULT_COMPACTION_THRESHOLD", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_COMPACTION_THRESHOLD; } });
Object.defineProperty(exports, "DEFAULT_MAX_HISTORY_TURNS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MAX_HISTORY_TURNS; } });
Object.defineProperty(exports, "DEFAULT_TEMPERATURE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TEMPERATURE; } });
Object.defineProperty(exports, "DEFAULT_TOP_P", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TOP_P; } });
Object.defineProperty(exports, "DEFAULT_MAX_RETRIES", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MAX_RETRIES; } });
// Compaction
var compaction_js_1 = require("./compaction.js");
Object.defineProperty(exports, "calculateContextTokens", { enumerable: true, get: function () { return compaction_js_1.calculateContextTokens; } });
Object.defineProperty(exports, "estimateContextTokens", { enumerable: true, get: function () { return compaction_js_1.estimateContextTokens; } });
Object.defineProperty(exports, "estimateContextUsage", { enumerable: true, get: function () { return compaction_js_1.estimateContextUsage; } });
Object.defineProperty(exports, "shouldCompact", { enumerable: true, get: function () { return compaction_js_1.shouldCompact; } });
Object.defineProperty(exports, "prepareCompaction", { enumerable: true, get: function () { return compaction_js_1.prepareCompaction; } });
Object.defineProperty(exports, "performCompaction", { enumerable: true, get: function () { return compaction_js_1.compact; } });
// Branch Summarization
var branch_summarization_js_1 = require("./branch-summarization.js");
Object.defineProperty(exports, "collectEntriesForBranchSummary", { enumerable: true, get: function () { return branch_summarization_js_1.collectEntriesForBranchSummary; } });
Object.defineProperty(exports, "generateBranchSummary", { enumerable: true, get: function () { return branch_summarization_js_1.generateBranchSummary; } });
//# sourceMappingURL=index.js.map