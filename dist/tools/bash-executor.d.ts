/**
 * Bash Command Executor with Streaming, Cancellation, and Output Guard
 *
 * Provides reliable bash execution with:
 * - Streaming output via onChunk callback
 * - AbortSignal cancellation
 * - Automatic truncation for large outputs
 * - Full output backup to temp file when truncated
 * - Binary output sanitization
 */
/**
 * Options for bash execution
 */
export interface BashExecutorOptions {
    /** Callback for streaming output chunks (already sanitized) */
    onChunk?: (chunk: string) => void;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
    /** Working directory (default: process.cwd()) */
    cwd?: string;
    /** Timeout in milliseconds (0 = no timeout) */
    timeout?: number;
    /** Environment variables */
    env?: Record<string, string>;
    /** Maximum output bytes before truncation (default: 1MB) */
    maxBytes?: number;
    /** Maximum output lines before truncation (default: 10000) */
    maxLines?: number;
}
/**
 * Result of bash execution
 */
export interface BashResult {
    /** Combined stdout + stderr output (sanitized, possibly truncated) */
    output: string;
    /** Separate stderr output (if any) */
    stderr?: string;
    /** Process exit code (undefined if killed/cancelled) */
    exitCode: number | undefined;
    /** Whether the command was cancelled via signal */
    cancelled: boolean;
    /** Whether the output was truncated */
    truncated: boolean;
    /** Path to temp file containing full output (if output exceeded truncation threshold) */
    fullOutputPath?: string;
}
/**
 * Execute a bash command with streaming and cancellation support.
 *
 * @param command - The bash command to execute
 * @param options - Execution options
 * @returns Promise<BashResult> with execution result
 */
export declare function executeBash(command: string, options?: BashExecutorOptions): Promise<BashResult>;
/**
 * Convenience wrapper using local system bash.
 * Similar signature to tui-agent's executeBashWithOperations but simpler.
 */
export declare function executeBashLocal(command: string, cwd?: string, options?: BashExecutorOptions): Promise<BashResult>;
//# sourceMappingURL=bash-executor.d.ts.map