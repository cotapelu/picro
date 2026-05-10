// SPDX-License-Identifier: Apache-2.0
/**
 * Shared utilities for session operations (compaction, branch summarization)
 */

export interface FileOperations {
  read: Set<string>;
  written: Set<string>;
  edited: Set<string>;
}

export function createFileOps(): FileOperations {
  return { read: new Set(), written: new Set(), edited: new Set() };
}

/**
 * Extract file operations from assistant message tool calls.
 */
export function extractFileOpsFromMessage(message: any, fileOps: FileOperations): void {
  if (message.role !== "assistant") return;
  const content = message.content as any[];
  for (const block of content) {
    if (block.type === "toolCall") {
      const args = block.arguments as Record<string, unknown> | undefined;
      if (!args) continue;
      const path = typeof args.path === "string" ? args.path : undefined;
      if (!path) continue;
      switch (block.name) {
        case "read":
          fileOps.read.add(path);
          break;
        case "write":
          fileOps.written.add(path);
          break;
        case "edit":
          fileOps.edited.add(path);
          break;
      }
    }
  }
}

export function computeFileLists(fileOps: FileOperations): { readFiles: string[]; modifiedFiles: string[] } {
  const modified = new Set([...fileOps.edited, ...fileOps.written]);
  const readOnly = [...fileOps.read].filter((f) => !modified.has(f)).sort();
  const modifiedFiles = [...modified].sort();
  return { readFiles: readOnly, modifiedFiles };
}

export function formatFileOperations(readFiles: string[], modifiedFiles: string[]): string {
  const sections: string[] = [];
  if (readFiles.length > 0) sections.push(`<read-files>\n${readFiles.join("\n")}\n</read-files>`);
  if (modifiedFiles.length > 0) sections.push(`<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`);
  return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}
