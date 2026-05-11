// SPDX-License-Identifier: Apache-2.0
/**
 * Session CWD Management - Handle cross-project session resumption
 * Detects when a session's stored cwd no longer exists and provides fallback options.
 */

import { existsSync } from "node:fs";

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
export function getMissingSessionCwdIssue(
  sessionManager: SessionCwdSource,
  fallbackCwd: string
): SessionCwdIssue | undefined {
  const sessionFile = sessionManager.getSessionFile();
  if (!sessionFile) {
    return undefined;
  }

  const sessionCwd = sessionManager.getCwd();
  if (!sessionCwd || existsSync(sessionCwd)) {
    return undefined;
  }

  return {
    sessionFile,
    sessionCwd,
    fallbackCwd,
  };
}

/** Format error message for missing cwd */
export function formatMissingSessionCwdError(issue: SessionCwdIssue): string {
  const sessionFile = issue.sessionFile ? `\nSession file: ${issue.sessionFile}` : "";
  return `Stored session working directory does not exist: ${issue.sessionCwd}${sessionFile}\nCurrent working directory: ${issue.fallbackCwd}`;
}

/** Format prompt message asking user to choose fallback cwd */
export function formatMissingSessionCwdPrompt(issue: SessionCwdIssue): string {
  return `cwd from session file does not exist\n${issue.sessionCwd}\n\ncontinue in current cwd\n${issue.fallbackCwd}`;
}

/** Error thrown when session cwd is missing and not in interactive mode */
export class MissingSessionCwdError extends Error {
  readonly issue: SessionCwdIssue;

  constructor(issue: SessionCwdIssue) {
    super(formatMissingSessionCwdError(issue));
    this.name = "MissingSessionCwdError";
    this.issue = issue;
  }
}

/** Assert that session cwd exists; throw if not */
export function assertSessionCwdExists(
  sessionManager: SessionCwdSource,
  fallbackCwd: string
): void {
  const issue = getMissingSessionCwdIssue(sessionManager, fallbackCwd);
  if (issue) {
    throw new MissingSessionCwdError(issue);
  }
}
