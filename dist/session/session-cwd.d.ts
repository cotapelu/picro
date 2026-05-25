/**
 * Session CWD Management - Handle cross-project session resumption
 * Detects when a session's stored cwd no longer exists and provides fallback options.
 */
/** Issue detected: session cwd does not exist */
export interface SessionCwdIssue {
    sessionFile?: string;
    sessionCwd: string;
    fallbackCwd: string;
}
/** Interface for objects that can provide cwd and session file */
export interface SessionCwdSource {
    getCwd(): string;
    getSessionFile(): string | undefined;
}
/**
 * Check if the session's cwd is missing and needs resolution.
 * Returns undefined if session file not set, or cwd exists, or sessionCwd is falsy.
 */
export declare function getMissingSessionCwdIssue(sessionManager: SessionCwdSource, fallbackCwd: string): SessionCwdIssue | undefined;
/** Format error message for missing cwd */
export declare function formatMissingSessionCwdError(issue: SessionCwdIssue): string;
/** Format prompt message asking user to choose fallback cwd */
export declare function formatMissingSessionCwdPrompt(issue: SessionCwdIssue): string;
/** Error thrown when session cwd is missing and not in interactive mode */
export declare class MissingSessionCwdError extends Error {
    readonly issue: SessionCwdIssue;
    constructor(issue: SessionCwdIssue);
}
/** Assert that session cwd exists; throw if not */
export declare function assertSessionCwdExists(sessionManager: SessionCwdSource, fallbackCwd: string): void;
//# sourceMappingURL=session-cwd.d.ts.map