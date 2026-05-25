/**
 * Truncation Strategies - Advanced output truncation utilities
 * Moved from agent/ to runtime/ as it's not core agent logic.
 */
/**
 * Truncation result
 */
export interface TruncationResult {
    /** Truncated output */
    output: string;
    /** Whether truncation occurred */
    truncated: boolean;
    /** Reason for truncation */
    reason?: "size" | "lines" | "visual";
    /** Original length in bytes */
    originalBytes: number;
    /** Truncated bytes (if truncated) */
    truncatedBytes?: number;
}
/**
 * Simple truncate by bytes (append ellipsis)
 */
export declare function truncateBytes(input: string, maxBytes: number, ellipsis?: string): TruncationResult;
/**
 * Truncate by number of lines
 */
export declare function truncateLines(input: string, maxLines: number, ellipsis?: string): TruncationResult;
/**
 * Truncate for visual display (considering wide chars, etc).
 * This is a simple implementation that approximates visual width.
 */
export declare function truncateVisualLines(input: string, maxVisualLines: number, maxCols?: number, ellipsis?: string): TruncationResult;
/**
 * Truncate a single line (middle truncation with head/tail)
 */
export declare function truncateMiddle(input: string, maxLength: number, headLen?: number, tailLen?: number, ellipsis?: string): TruncationResult;
/**
 * Truncate preserving start and end (suitable for code snippets)
 */
export declare function truncatePreserveEnds(input: string, maxLines: number, tailLines?: number, ellipsis?: string): TruncationResult;
//# sourceMappingURL=truncate.d.ts.map