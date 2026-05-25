"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Default constants used throughout the agent
 * Moved from agent/ to session/ because it's used by session services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_RETRIES = exports.DEFAULT_TOP_P = exports.DEFAULT_TEMPERATURE = exports.DEFAULT_MAX_HISTORY_TURNS = exports.DEFAULT_COMPACTION_THRESHOLD = exports.DEFAULT_MAX_OUTPUT_LINES = exports.DEFAULT_MAX_OUTPUT_SIZE = exports.DEFAULT_TOOL_TIMEOUT = exports.DEFAULT_THINKING_LEVEL = void 0;
/**
 * Default thinking level
 */
exports.DEFAULT_THINKING_LEVEL = 'medium';
/**
 * Default timeout for tool execution (ms)
 */
exports.DEFAULT_TOOL_TIMEOUT = 30000;
/**
 * Default maximum output size (bytes)
 */
exports.DEFAULT_MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
/**
 * Default maximum lines in output
 */
exports.DEFAULT_MAX_OUTPUT_LINES = 10000;
/**
 * Default compaction threshold (tokens)
 */
exports.DEFAULT_COMPACTION_THRESHOLD = 8000;
/**
 * Default maximum history turns
 */
exports.DEFAULT_MAX_HISTORY_TURNS = 100;
/**
 * Default temperature for LLM (0-2)
 */
exports.DEFAULT_TEMPERATURE = 0.7;
/**
 * Default top_p for LLM (0-1)
 */
exports.DEFAULT_TOP_P = 0.9;
/**
 * Default retry attempts for failed operations
 */
exports.DEFAULT_MAX_RETRIES = 3;
//# sourceMappingURL=defaults.js.map