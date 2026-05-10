// SPDX-License-Identifier: Apache-2.0
/**
 * LsTool - List directory contents
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Directory suffix (/)
 * - Entry sorting
 * - Limit support
 */

import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

export interface LsToolInput {
  path?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 500;

export async function lsTool(
  input: LsToolInput,
  cwd: string
): Promise<{ content: Array<{ type: "text"; text: string }>; details: { entryCount: number } | undefined }> {
  const { path = ".", limit = DEFAULT_LIMIT } = input;
  const dirPath = resolve(cwd, path);

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    throw new Error(`Cannot read directory: ${path}`);
  }

  // Sort alphabetically (case-insensitive)
  entries.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  // Format entries with directory indicator
  const results: string[] = [];
  let entryLimitReached = false;

  for (const entry of entries) {
    if (results.length >= limit) {
      entryLimitReached = true;
      break;
    }

    const fullPath = resolve(dirPath, entry);
    let suffix = "";
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        suffix = "/";
      }
    } catch {
      // Skip entries we can't stat
      continue;
    }

    results.push(entry + suffix);
  }

  if (results.length === 0) {
    return {
      content: [{ type: "text", text: "(empty directory)" }],
      details: { entryCount: 0 },
    };
  }

  let output = results.join("\n");
  
  if (entryLimitReached) {
    output += `\n\n[Showing first ${limit} entries. Use limit parameter for more.]`;
  }

  return {
    content: [{ type: "text", text: output }],
    details: { entryCount: results.length },
  };
}

export const lsToolDefinition = {
  name: "ls",
  description: "List directory contents. Returns entries sorted alphabetically with '/' suffix for directories.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Directory to list" },
      limit: { type: "number", description: "Maximum entries to return" },
    },
  },
};