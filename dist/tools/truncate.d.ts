/**
 * Truncation utilities for tool output
 */
/**
 * Result of truncation
 */
export interface TruncationResult {
    truncated: boolean;
    originalSize: number;
    truncatedSize: number;
    type: 'bytes' | 'lines' | 'both';
}
export declare const DEFAULT_MAX_BYTES: number;
export declare const DEFAULT_MAX_LINES = 10000;
/**
 * Truncate text from head (keep end)
 */
export declare function truncateHead(text: string, maxBytes: number, ellipsis?: string): string;
/**
 * Truncate text from tail (keep beginning)
 */
export declare function truncateTail(text: string, maxBytes: number, ellipsis?: string): string;
/**
 * Truncate by lines
 */
export declare function truncateLines(text: string, maxLines: number, ellipsis?: string): string;
/**
 * Smart truncate: by bytes and lines
 */
export declare function truncateOutput(text: string, maxBytes?: number, maxLines?: number, ellipsis?: string): TruncationResult;
//# sourceMappingURL=truncate.d.ts.map