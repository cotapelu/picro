// SPDX-License-Identifier: Apache-2.0
/**
 * Read tool - Read file contents
 */

import { existsSync, readFileSync } from 'fs';

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
 */
export function createReadToolDefinition() {
  return {
    name: 'read',
    description: 'Read contents of a file',
    schema: {}, // placeholder - in full impl would use typebox
    async execute(input: ReadToolInput): Promise<any> {
      const { path: filePath, maxLines, offset = 0 } = input;

      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      let content = readFileSync(filePath, 'utf8');
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
