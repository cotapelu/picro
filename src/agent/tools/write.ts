// SPDX-License-Identifier: Apache-2.0
/**
 * Write tool - Write content to file
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

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
 */
export function createWriteToolDefinition() {
  return {
    name: 'write',
    description: 'Write content to a file',
    schema: {},
    async execute(input: WriteToolInput): Promise<any> {
      const { path: filePath, content, append = false, createDirs = true } = input;

      if (createDirs) {
        const dir = dirname(filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      writeFileSync(filePath, content, append ? { flag: 'a' } : { flag: 'w' });

      return {
        success: true,
        path: filePath,
        bytesWritten: Buffer.byteLength(content, 'utf8'),
      };
    },
  };
}
