// SPDX-License-Identifier: Apache-2.0
/**
 * Read tool - Read file contents
 */

import { existsSync, readFileSync } from 'fs';
import { resolveReadPath, validatePathWithinBase } from './path-utils.js';

/**
 * Read tool input
 */
export interface ReadToolInput {
  path: string;
  maxLines?: number;
  offset?: number;
}

/**
 * Create read tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createReadToolDefinition(cwd: string) {
  return {
    name: 'read',
    description: 'Read file contents. Use to examine source code, config files, or any text file.',
    promptSnippet: 'Read a file. Example: read({ path: "src/agent/agent.ts" })',
    promptGuides: [
      'Always specify the full path relative to cwd',
      'Use maxLines and offset to read large files incrementally',
      'Check if file exists before reading',
    ],
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
        maxLines: { type: "number", description: "Maximum number of lines to return" },
        offset: { type: "number", description: "Number of lines to skip from start" }
      },
      required: ["path"]
    }, // placeholder - in full impl would use typebox
    async execute(input: ReadToolInput): Promise<any> {
      const { path: filePath, maxLines, offset = 0 } = input;

      // Resolve path safely within cwd
      const resolvedPath = resolveReadPath(filePath, cwd);

      // Validate the resolved path is within cwd (security)
      if (!validatePathWithinBase(resolvedPath, cwd)) {
        throw new Error(`Access denied: Path outside working directory`);
      }

      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      let content = readFileSync(resolvedPath, 'utf8');
      const lines = content.split('\n');

      // Apply offset and maxLines
      if (offset > 0 || maxLines !== undefined) {
        const start = Math.min(offset, lines.length);
        const end = maxLines !== undefined ? Math.min(start + maxLines, lines.length) : lines.length;
        lines.splice(0, start);
        if (end < lines.length) {
          lines.splice(end - start);
        }
        content = lines.join('\n');
      }

      return {
        content,
        path: filePath,
        size: content.length,
        lineCount: lines.length,
      };
    },
  };
}
