// SPDX-License-Identifier: Apache-2.0
/**
 * Edit tool - Replace text in file
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolveToCwd, validatePathWithinBase } from './path-utils.js';

/**
 * Edit tool input
 */
export interface EditToolInput {
  path: string;
  oldString: string;
  newString: string;
  dryRun?: boolean;
}

/**
 * Create edit tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createEditToolDefinition(cwd: string) {
  return {
    name: 'edit',
    description: 'Replace text in files. Use for refactoring, fixing typos, updating code patterns.',
    promptSnippet: 'Edit file by replacing old text with new. Example: edit({ path: "file.ts", oldString: "foo", newString: "bar" })',
    promptGuides: [
      'oldString must match exactly including whitespace',
      'Use dryRun: true to preview changes before applying',
      'Only replace first occurrence per call',
      'Combine multiple edit calls for multiple replacements',
    ],
    schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to edit" },
        oldString: { type: "string", description: "Exact text to find" },
        newString: { type: "string", description: "Replacement text" },
        dryRun: { type: "boolean", description: "Preview without applying" }
      },
      required: ["path", "oldString", "newString"]
    },
    async execute(input: EditToolInput): Promise<any> {
      const { path: filePath, oldString, newString, dryRun = false } = input;

      // Resolve path safely within cwd
      const resolvedPath = resolveToCwd(filePath, cwd);

      // Validate the resolved path is within cwd (security)
      if (!validatePathWithinBase(resolvedPath, cwd)) {
        throw new Error(`Access denied: Path outside working directory`);
      }

      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const original = readFileSync(resolvedPath, 'utf8');
      const index = original.indexOf(oldString);

      if (index === -1) {
        return {
          success: false,
          changed: false,
          message: 'oldString not found in file',
        };
      }

      const modified = original.replace(oldString, newString);

      if (dryRun) {
        return {
          success: true,
          changed: true,
          dryRun: true,
        };
      }

      writeFileSync(resolvedPath, modified, 'utf8');

      return {
        success: true,
        changed: true,
        path: filePath,
      };
    },
  };
}
