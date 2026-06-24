// SPDX-License-Identifier: Apache-2.0
/**
 * Ls tool - List directory contents
 */

import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { resolveToCwd, validatePathWithinBase } from './path-utils.js';

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
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createLsToolDefinition(cwd: string) {
  return {
    name: 'ls',
    description: 'List directory contents with details (permissions, size, date). Use to explore project structure.',
    promptSnippet: 'List files and directories in current location. Example: ls() or ls({ path: "src" })',
    promptGuides: [
      'Use ls() to see current directory',
      'Use ls({ path: "src" }) to list specific directory',
      'Use ls({ recursive: true }) to list recursively (limited depth)',
      'Use ls({ includeHidden: true }) to see dotfiles',
    ],
    schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path to list (default: current directory)",
        },
        recursive: {
          type: "boolean",
          description: "List recursively",
        },
        includeHidden: {
          type: "boolean",
          description: "Include hidden files",
        },
      },
      required: [],
    },
    handler: async (input: LsToolInput) => {
      const { path: dirPath = '.', recursive = false, includeHidden = false } = input;

      // Resolve directory path safely within cwd
      const resolvedDir = resolveToCwd(dirPath, cwd);

      // Validate the resolved directory is within cwd (security)
      if (!validatePathWithinBase(resolvedDir, cwd)) {
        throw new Error(`Access denied: Path outside working directory (resolved: ${resolvedDir}, cwd: ${cwd})`);
      }

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
            } catch (e: any) {
              // Skip file that can't be stat'ed
              console.warn(`ls: cannot stat ${fullPath}:`, e?.message || e);
            }
          }
        } catch (err: any) {
          throw new Error(`Failed to read directory ${dir}: ${err.message || err}`);
        }
      };

      walk(resolvedDir, 0);

      // Format entries as text for the agent
      const lines: string[] = [];
      for (const entry of entries) {
        const type = entry.type === 'directory' ? 'd' : entry.type === 'symlink' ? 'l' : '-';
        const size = entry.size.toString();
        const date = new Date(entry.modified).toISOString().split('T')[0];
        lines.push(`${type} ${size} ${date} ${entry.name}`);
      }
      const output = lines.join('\n') + `\n\nTotal: ${entries.length} entries`;
      return [{ type: 'text', text: output }];
    },
  };
}
