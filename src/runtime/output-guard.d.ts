/**
 * Output Guard - Sanitize and validate tool output
 *
 * Protects against:
 * - Binary data in text output
 * - Extremely long lines
 * - Control characters
 * - ANSI escape code injection
 * - Potential XSS in HTML contexts
 */
/**
 * Output validation result
 */
export interface OutputValidation {
    valid: boolean;
    sanitized: string;
    originalLength: number;
    sanitizedLength: number;
    warnings: string[];
    truncated?: boolean;
}
/**
 * Default maximum output size (5MB)
 */
export declare const DEFAULT_MAX_OUTPUT_SIZE: number;
/**
 * Default maximum line length
 */
export declare const DEFAULT_MAX_LINE_LENGTH = 10000;
/**
 * Sanitize output string
 */
export declare function sanitizeOutput(output: string, options?: {
    maxSize?: number;
    maxLineLength?: number;
    stripAnsi?: boolean;
    truncateIndicator?: string;
}): string;
/**
 * Validate and sanitize tool output
 */
export declare function validateOutput(output: string, options?: {
    maxSize?: number;
    maxLineLength?: number;
    stripAnsi?: boolean;
}): OutputValidation;
/**
 * Safe read file with output guard
 */
export declare function safeReadFile(filePath: string, options?: {
    maxSize?: number;
    encoding?: BufferEncoding;
}): {
    content: string;
    valid: boolean;
    warnings: string[];
};
/**
 * Cleanup temp file if exists
 */
export declare function cleanupTempFile(filePath: string): void;
//# sourceMappingURL=output-guard.d.ts.map