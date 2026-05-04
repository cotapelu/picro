// SPDX-License-Identifier: Apache-2.0
/**
 * Ls tool - List directory contents
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Ls tool input
 */
export interface LsToolInput {
  path?: string;
  recursive?: boolean;
  includeHidden?: boolean;
}

/**
 * File entry
 */
export interface LsEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modified: number;
}

/**
 * Create ls tool definition
 */
export function createLsToolDefinition() {
  return {
    name: 'ls',
    description: 'List directory contents',
    schema: {},
    async execute(input: LsToolInput): Promise<any> {
      const { path: dirPath = '.', recursive = false, includeHidden = false } = input;

      const entries: LsEntry[] = [];

      const walk = (dir: string, depth: number) => {
        if (depth > 5) return;

        try {
          const files = readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            if (!includeHidden && file.name.startsWith('.')) continue;

            const fullPath = join(dir, file.name);
            try {
              const stats = statSync(fullPath);
              entries.push({
                name: file.name,
                path: fullPath,
                type: file.isDirectory() ? 'directory' : file.isSymbolicLink() ? 'symlink' : 'file',
                size: stats.size,
                modified: stats.mtimeMs,
              });

              if (recursive && file.isDirectory()) {
                walk(fullPath, depth + 1);
              }
            } catch {
              // Skip
            }
          }
        } catch (err) {
          throw new Error(`Failed to read directory ${dir}: ${err}`);
        }
      };

      walk(dirPath, 0);

      return {
        entries,
        count: entries.length,
      };
    },
  };
}
