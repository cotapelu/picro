"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Session CWD Management - Handle cross-project session resumption
 * Detects when a session's stored cwd no longer exists and provides fallback options.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingSessionCwdError = void 0;
exports.getMissingSessionCwdIssue = getMissingSessionCwdIssue;
exports.formatMissingSessionCwdError = formatMissingSessionCwdError;
exports.formatMissingSessionCwdPrompt = formatMissingSessionCwdPrompt;
exports.assertSessionCwdExists = assertSessionCwdExists;
const node_fs_1 = require("node:fs");
/**
 * Check if the session's cwd is missing and needs resolution.
 * Returns undefined if session file not set, or cwd exists, or sessionCwd is falsy.
 */
function getMissingSessionCwdIssue(sessionManager, fallbackCwd) {
    const sessionFile = sessionManager.getSessionFile();
    if (!sessionFile) {
        return undefined;
    }
    const sessionCwd = sessionManager.getCwd();
    if (!sessionCwd || (0, node_fs_1.existsSync)(sessionCwd)) {
        return undefined;
    }
    return {
        sessionFile,
        sessionCwd,
        fallbackCwd,
    };
}
/** Format error message for missing cwd */
function formatMissingSessionCwdError(issue) {
    const sessionFile = issue.sessionFile ? `\nSession file: ${issue.sessionFile}` : "";
    return `Stored session working directory does not exist: ${issue.sessionCwd}${sessionFile}\nCurrent working directory: ${issue.fallbackCwd}`;
}
/** Format prompt message asking user to choose fallback cwd */
function formatMissingSessionCwdPrompt(issue) {
    return `cwd from session file does not exist\n${issue.sessionCwd}\n\ncontinue in current cwd\n${issue.fallbackCwd}`;
}
/** Error thrown when session cwd is missing and not in interactive mode */
class MissingSessionCwdError extends Error {
    issue;
    constructor(issue) {
        super(formatMissingSessionCwdError(issue));
        this.name = "MissingSessionCwdError";
        this.issue = issue;
    }
}
exports.MissingSessionCwdError = MissingSessionCwdError;
/** Assert that session cwd exists; throw if not */
function assertSessionCwdExists(sessionManager, fallbackCwd) {
    const issue = getMissingSessionCwdIssue(sessionManager, fallbackCwd);
    if (issue) {
        throw new MissingSessionCwdError(issue);
    }
}
//# sourceMappingURL=session-cwd.js.map