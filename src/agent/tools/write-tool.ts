// SPDX-License-Identifier: Apache-2.0
/**
 * WriteTool - Write files with auto-create directories
 * 
 * Học từ legacy mà KHÔNG copy code:
 * - Auto-create parent directories
 * - Write content to file
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface WriteToolInput {
  path: string;
  content: string;
}

function resolvePath(path: string, cwd: string): string {
  return resolve(cwd, path);
}

export async function writeFileTool(
  input: WriteToolInput,
  cwd: string
): Promise<{ content: Array<{ type: "text"; text: string }>; details: undefined }> {
  const { path, content } = input;
  const absolutePath = resolvePath(path, cwd);
  const dir = dirname(absolutePath);

  // Create parent directories if needed
  await mkdir(dir, { recursive: true });

  // Write the file
  await writeFile(absolutePath, content, "utf-8");

  return {
    content: [{ type: "text" as const, text: `Successfully wrote ${content.length} bytes to ${path}` }],
    details: undefined,
  };
}

export const writeToolDefinition = {
  name: "write",
  description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file to write" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
  },
};