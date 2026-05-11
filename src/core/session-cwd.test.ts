// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for session-cwd.ts
 */

import { describe, it, expect } from "vitest";
import {
  getMissingSessionCwdIssue,
  formatMissingSessionCwdError,
  formatMissingSessionCwdPrompt,
  MissingSessionCwdError,
  SessionCwdSource
} from "./session-cwd";

class FakeSessionManager implements SessionCwdSource {
  constructor(
    private cwd: string,
    private sessionFile: string | undefined
  ) {}
  getCwd() { return this.cwd; }
  getSessionFile() { return this.sessionFile; }
}

describe("getMissingSessionCwdIssue", () => {
  it("should return undefined when sessionFile is not set", () => {
    const mgr = new FakeSessionManager(process.cwd(), undefined);
    expect(getMissingSessionCwdIssue(mgr, process.cwd())).toBeUndefined();
  });

  it("should return undefined when session cwd exists", () => {
    const existingCwd = process.cwd();
    const mgr = new FakeSessionManager(existingCwd, "/path/to/session.jsonl");
    expect(getMissingSessionCwdIssue(mgr, process.cwd())).toBeUndefined();
  });

  it("should return issue when session cwd missing and sessionFile set", () => {
    const missingCwd = "/nonexistent/path";
    const mgr = new FakeSessionManager(missingCwd, "/path/to/session.jsonl");
    const issue = getMissingSessionCwdIssue(mgr, process.cwd());
    expect(issue).toEqual({
      sessionFile: "/path/to/session.jsonl",
      sessionCwd: missingCwd,
      fallbackCwd: process.cwd(),
    });
  });

  it("should return undefined when session cwd is empty string", () => {
    const mgr = new FakeSessionManager("", "/path/to/session.jsonl");
    expect(getMissingSessionCwdIssue(mgr, process.cwd())).toBeUndefined();
  });
});

describe("formatMissingSessionCwdError", () => {
  it("should format error with session file", () => {
    const issue = {
      sessionFile: "/sessions/abc.jsonl",
      sessionCwd: "/old/project",
      fallbackCwd: process.cwd(),
    };
    const msg = formatMissingSessionCwdError(issue);
    expect(msg).toContain("does not exist: /old/project");
    expect(msg).toContain("Session file: /sessions/abc.jsonl");
    expect(msg).toContain("Current working directory: " + process.cwd());
  });

  it("should format error without session file", () => {
    const issue = {
      sessionCwd: "/old/project",
      fallbackCwd: process.cwd(),
    } as any;
    const msg = formatMissingSessionCwdError(issue);
    expect(msg).toContain("does not exist: /old/project");
    expect(msg).not.toContain("Session file:");
  });
});

describe("formatMissingSessionCwdPrompt", () => {
  it("should format compact prompt", () => {
    const issue = {
      sessionCwd: "/missing/cwd",
      fallbackCwd: process.cwd(),
    } as any;
    const msg = formatMissingSessionCwdPrompt(issue);
    expect(msg).toContain("cwd from session file does not exist");
    expect(msg).toContain("/missing/cwd");
    expect(msg).toContain("continue in current cwd");
    expect(msg).toContain(process.cwd());
  });
});

describe("MissingSessionCwdError", () => {
  it("should have proper message and name", () => {
    const issue = {
      sessionCwd: "/missing",
      fallbackCwd: process.cwd(),
    } as any;
    const err = new MissingSessionCwdError(issue);
    expect(err.name).toBe("MissingSessionCwdError");
    expect(err.message).toContain("does not exist");
    expect(err.issue).toBe(issue);
  });
});
