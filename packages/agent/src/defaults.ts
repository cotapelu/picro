// SPDX-License-Identifier: Apache-2.0
/**
 * Default constants used throughout the agent
 */

import type { ThinkingLevel } from './types.js';

/**
 * Default thinking level
 */
export const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'medium';

/**
 * Default timeout for tool execution (ms)
 */
export const DEFAULT_TOOL_TIMEOUT = 30000;

/**
 * Default maximum output size (bytes)
 */
export const DEFAULT_MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB

/**
 * Default maximum lines in output
 */
export const DEFAULT_MAX_OUTPUT_LINES = 10000;

/**
 * Default compaction threshold (tokens)
 */
export const DEFAULT_COMPACTION_THRESHOLD = 8000;

/**
 * Default maximum history turns
 */
export const DEFAULT_MAX_HISTORY_TURNS = 100;

/**
 * Default temperature for LLM (0-2)
 */
export const DEFAULT_TEMPERATURE = 0.7;

/**
 * Default top_p for LLM (0-1)
 */
export const DEFAULT_TOP_P = 0.9;

/**
 * Default retry attempts for failed operations
 */
export const DEFAULT_MAX_RETRIES = 3;
