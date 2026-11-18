// Session Export - xuất phiên ra JSONL
// Bắt chước pi-mono core/session-export.ts

import { writeFileSync } from "fs";
import { randomUUID } from "crypto";

interface SessionManagerSubset {
  getEntries(): any[];
  getHeader?(): any;
  getLeafId?(): string | null;
}

export interface ShareTrailingEntry {
  type: "custom";
  customType: "pi.share";
  id: string;
  parentId: string | null;
  timestamp: string;
  data: {
    systemPrompt: string;
    tools: Array<{ name: string; description: string; parameters: unknown }>;
  };
}

/** Tạo entry trailing pi.share cho session viewer. */
export function createShareTrailingEntries(
  sessionManager: SessionManagerSubset,
  parentId: string | null,
  timestamp: string,
  systemPrompt: string,
  tools: Array<{ name: string; description: string; parameters: unknown }>,
): object[] {
  return [
    {
      type: "custom",
      customType: "pi.share",
      id: randomUUID().slice(0, 8),
      parentId,
      timestamp,
      data: {
        systemPrompt,
        tools,
      },
    },
  ];
}

/** Xuất phiên ra file JSONL. */
export function exportSessionToJsonl(
  sessionManager: SessionManagerSubset,
  filePath: string,
  trailingEntriesGenerator: (parentId: string | null, timestamp: string) => object[],
): void {
  const entries = sessionManager.getEntries();
  const header = sessionManager.getHeader?.();
  const lines = [JSON.stringify(header), ...entries.map((e) => JSON.stringify(e))];
  
  // Add trailing entries
  const leafId = sessionManager.getLeafId?.();
  const timestamp = new Date().toISOString();
  const trailingEntries = trailingEntriesGenerator(leafId ?? "", timestamp);
  for (const entry of trailingEntries) {
    lines.push(JSON.stringify(entry));
  }
  
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

/** Xuất nhánh phiên ra JSONL (dùng cho fork/branch). */
export function serializeSessionBranch(
  sessionManager: SessionManagerSubset,
  trailingEntriesGenerator: (parentId: string | null, timestamp: string) => object[],
): string {
  const entries = sessionManager.getEntries();
  const header = sessionManager.getHeader?.();
  const lines = [JSON.stringify(header), ...entries.map((e) => JSON.stringify(e))];
  
  const leafId = sessionManager.getLeafId?.();
  const timestamp = new Date().toISOString();
  const trailingEntries = trailingEntriesGenerator(leafId ?? "", timestamp);
  for (const entry of trailingEntries) {
    lines.push(JSON.stringify(entry));
  }
  
  return `${lines.join("\n")}\n`;
}