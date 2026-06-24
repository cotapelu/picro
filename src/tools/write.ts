// SPDX-License-Identifier: Apache-2.0
/**
 * Write tool - Write content to file
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { resolveToCwd, validatePathWithinBase } from './path-utils.js';

/**
 * Write tool input
 */
export interface WriteToolInput {
  path: string;
  content: string;
  append?: boolean;
  createDirs?: boolean;
}

/**
 * Create write tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createWriteToolDefinition(cwd: string) {
  return {
    name: 'write',
    description: 'Create or overwrite files. Use for new files, updating existing files, or appending content.',
    promptSnippet: 'Write text to a file. Example: write({ path: "newFile.txt", content: "Hello World" })',
    promptGuides: [
      'Creates parent directories automatically (createDirs: true by default)',
      'Use append: true to add to end of file without overwriting',
      'Always use UTF-8 encoding',
    ],
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to write" },
        content: { type: "string", description: "Content to write" },
        append: { type: "boolean", description: "Append instead of overwrite" },
        createDirs: { type: "boolean", description: "Create parent directories if missing" }
      },
      required: ["path", "content"]
    },
    async execute(input: WriteToolInput): Promise<any> {
      const { path: filePath, content, append = false, createDirs = true } = input;

      // Resolve path safely within cwd
      const resolvedPath = resolveToCwd(filePath, cwd);

      // Validate the resolved path is within cwd (security)
      if (!validatePathWithinBase(resolvedPath, cwd)) {
        throw new Error(`Access denied: Path outside working directory`);
      }

      if (createDirs) {
        const dir = dirname(resolvedPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      writeFileSync(resolvedPath, content, append ? { flag: 'a' } : { flag: 'w' });

      return {
        success: true,
        path: filePath,
        bytesWritten: Buffer.byteLength(content, 'utf8'),
      };
    },
  };
}
