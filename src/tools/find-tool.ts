// SPDX-License-Identifier: Apache-2.0
/**
 * FindTool - Find files using fd
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Glob pattern matching
 * - Output truncation
 */

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface FindToolInput {
  pattern: string;
  path?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 1000;

export async function findTool(
  input: FindToolInput,
  cwd: string
): Promise<{ content: Array<{ type: "text"; text: string }>; details: { resultCount: number } | undefined }> {
  const { pattern, path = ".", limit = DEFAULT_LIMIT } = input;
  const searchPath = resolve(cwd, path);

  if (!existsSync(searchPath)) {
    throw new Error(`Path not found: ${path}`);
  }

  return new Promise((resolvePromise, reject) => {
    const args = [
      "--glob", pattern,
      "--color=never",
      "--hidden",
      "--no-require-git",
      "--max-results", String(limit),
      searchPath
    ];

    const child = spawn("fd", args, { stdio: ["ignore", "pipe", "pipe"] });
    const rl = createInterface({ input: child.stdout });
    let output = "";

    rl.on("line", (line) => {
      if (line.trim()) {
        output += line + "\n";
      }
    });

    child.on("close", () => {
      if (!output.trim()) {
        resolvePromise({
          content: [{ type: "text", text: "No files found matching pattern" }],
          details: { resultCount: 0 },
        });
        return;
      }

      const lines = output.trim().split("\n");
      const resultCount = lines.length;

      if (resultCount >= limit) {
        output = lines.slice(0, limit).join("\n");
        output += `\n\n[${resultCount} files found, showing first ${limit}.]`;
      }

      resolvePromise({
        content: [{ type: "text", text: output.trim() }],
        details: { resultCount },
      });
    });

    child.on("error", (error) => {
      reject(new Error(`fd not found: ${error.message}`));
    });
  });
}

export const findToolDefinition = {
  name: "find",
  description: "Search for files by glob pattern. Returns matching file paths.",
  parameters: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Glob pattern to match files" },
      path: { type: "string", description: "Directory to search in" },
      limit: { type: "number", description: "Maximum number of results" },
    },
    required: ["pattern"],
  },
};