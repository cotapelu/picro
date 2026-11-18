// Bug Report - tạo bundle báo cáo lỗi
// Bắt chước pi-mono core/bug-report.ts

import { collectBugReportMetadata, collectBugReportDiagnostics, type BugReportBundle, type BugReportMetadata, type BugReportDiagnostics, BUG_REPORT_CUSTOM_ENTRY_TYPE, bugReportArchiveFileName } from "./bug-report-utils.js";
import type { AgentSessionInterface } from "../runtime/agent-session-interfaces.js";
import { readCrashLog, clearCrashLog } from "./crash-log.js";
import { serializeSessionBranch } from "./session-export.js";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

export interface BugReportOptions {
  hint?: string;
  includeSession: boolean;
  includeSummary: boolean;
}

/** Build bug report bundle từ session. */
export function buildBugReportBundle(
  session: AgentSessionInterface,
  options: BugReportOptions,
  summary?: string,
): BugReportBundle {
  const metadata = collectBugReportMetadata({
    hint: options.hint,
    sessionId: session.sessionManager.getSessionName?.() ?? "unknown",
    cwd: session.sessionManager.getCwd?.() ?? process.cwd(),
    includeSession: options.includeSession,
    includeSummary: options.includeSummary,
    messageCount: session.messages.length,
    model: (session as any).model,
    modelRuntime: (session as any).modelRuntime,
    thinkingLevel: session.thinkingLevel,
    extensions: (session as any).extensionRunner?.getRegisteredCommands?.() ?? [],
    extensionErrors: (session as any).extensionRunner?.getErrors?.() ?? [],
    globalSettings: (session as any).settingsManager?.getGlobalSettings?.() ?? {},
    projectSettings: (session as any).settingsManager?.getProjectSettings?.() ?? {},
  });

  const diagnostics = collectBugReportDiagnostics(session.sessionManager, readCrashLog());

  return {
    metadata,
    diagnostics,
    summary,
    sessionJsonl: options.includeSession
      ? serializeSessionBranch(session.sessionManager as any, (parentId, timestamp) =>
          createShareTrailingEntries(session, parentId, timestamp),
        )
      : undefined,
  };
}

/** Tạo entry trailing pi.share cho session viewer. */
export function createShareTrailingEntries(
  session: AgentSessionInterface,
  parentId: string | null,
  timestamp: string,
): object[] {
  return [
    {
      type: "custom",
      customType: "pi.share",
      id: randomUUID().slice(0, 8),
      parentId,
      timestamp,
      data: {
        systemPrompt: (session as any).state?.systemPrompt ?? "",
        tools: (session as any).state?.tools?.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })) ?? [],
      },
    },
  ];
}

/** Ghi bug report archive ra file. */
export async function writeBugReportArchive(bundle: BugReportBundle, filePath: string): Promise<void> {
  // For now, just write JSONL (zip would require additional dependency)
  const lines: string[] = [];
  lines.push(JSON.stringify(bundle.metadata));
  lines.push(JSON.stringify(bundle.diagnostics));
  if (bundle.summary) lines.push(JSON.stringify({ type: "summary", content: bundle.summary }));
  if (bundle.sessionJsonl) {
    lines.push(...bundle.sessionJsonl.split("\n").filter(Boolean));
  }
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}