/**
 * Default constants used throughout the agent
 * Moved from agent/ to session/ because it's used by session services.
 */
import type { ThinkingLevel } from '../agent/types.js';
/**
 * Default thinking level
 */
export declare const DEFAULT_THINKING_LEVEL: ThinkingLevel;
/**
 * Default timeout for tool execution (ms)
 */
export declare const DEFAULT_TOOL_TIMEOUT = 30000;
/**
 * Default maximum output size (bytes)
 */
export declare const DEFAULT_MAX_OUTPUT_SIZE: number;
/**
 * Default maximum lines in output
 */
export declare const DEFAULT_MAX_OUTPUT_LINES = 10000;
/**
 * Default compaction threshold (tokens)
 */
export declare const DEFAULT_COMPACTION_THRESHOLD = 8000;
/**
 * Default maximum history turns
 */
export declare const DEFAULT_MAX_HISTORY_TURNS = 100;
/**
 * Default temperature for LLM (0-2)
 */
export declare const DEFAULT_TEMPERATURE = 0.7;
/**
 * Default top_p for LLM (0-1)
 */
export declare const DEFAULT_TOP_P = 0.9;
/**
 * Default retry attempts for failed operations
 */
export declare const DEFAULT_MAX_RETRIES = 3;
//# sourceMappingURL=defaults.d.ts.map