// Bug Report Utils - thu thập metadata và diagnostics cho bug report
// Bắt chước pi-mono core/bug-report.ts

import { readCrashLog, type CrashEntry } from "./crash-log.js";
import { randomUUID } from "crypto";

export const BUG_REPORT_CUSTOM_ENTRY_TYPE = "pi.bug-report";

export interface BugReportMetadata {
  id: string;
  createdAt: string;
  hint?: string;
  sessionId: string;
  cwd: string;
  includeSession: boolean;
  includeSummary: boolean;
  messageCount: number;
  model: any;
  modelRuntime: any;
  thinkingLevel: string;
  extensions: any[];
  extensionErrors: any[];
  globalSettings: Record<string, any>;
  projectSettings: Record<string, any>;
}

export interface BugReportDiagnostics {
  crashes: CrashEntry[];
}

export interface BugReportBundle {
  metadata: BugReportMetadata;
  diagnostics: BugReportDiagnostics;
  summary?: string;
  sessionJsonl?: string;
}

export const bugReportArchiveFileName = (id: string) => `pi-bug-report-${id}.jsonl`;

/** Thu thập metadata cho bug report. */
export function collectBugReportMetadata(params: {
  hint?: string;
  sessionId: string;
  cwd: string;
  includeSession: boolean;
  includeSummary: boolean;
  messageCount: number;
  model: any;
  modelRuntime: any;
  thinkingLevel: string;
  extensions: any[];
  extensionErrors: any[];
  globalSettings: Record<string, any>;
  projectSettings: Record<string, any>;
}): BugReportMetadata {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    hint: params.hint,
    sessionId: params.sessionId,
    cwd: params.cwd,
    includeSession: params.includeSession,
    includeSummary: params.includeSummary,
    messageCount: params.messageCount,
    model: params.model,
    modelRuntime: params.modelRuntime,
    thinkingLevel: params.thinkingLevel,
    extensions: params.extensions,
    extensionErrors: params.extensionErrors,
    globalSettings: params.globalSettings,
    projectSettings: params.projectSettings,
  };
}

/** Thu thập diagnostics (crash logs). */
export function collectBugReportDiagnostics(
  sessionManager: { getSessionName(): string | undefined; getEntries(): any[]; getCwd(): string; setSessionName(name: string): void },
  crashLog: CrashEntry | undefined,
): BugReportDiagnostics {
  const crashes: CrashEntry[] = [];
  if (crashLog) crashes.push(crashLog);
  return { crashes };
}