/**
 * Shell utilities for cross-platform command execution
 */
/**
 * Shell configuration
 */
export interface ShellConfig {
    shell: string;
    args: string[];
}
/**
 * Resolve shell configuration based on platform and optional custom shell path.
 */
export declare function getShellConfig(customShellPath?: string): ShellConfig;
/**
 * Get shell environment with updated PATH
 */
export declare function getShellEnv(): NodeJS.ProcessEnv;
/**
 * Sanitize binary output for display/storage.
 * Removes characters that could crash string-width or cause display issues.
 */
export declare function sanitizeBinaryOutput(str: string): string;
export declare function trackDetachedChildPid(pid: number): void;
export declare function untrackDetachedChildPid(pid: number): void;
/**
 * Kill a process and all its children (cross-platform)
 */
export declare function killProcessTree(pid: number): void;
export declare function killTrackedDetachedChildren(): void;
//# sourceMappingURL=shell.d.ts.map