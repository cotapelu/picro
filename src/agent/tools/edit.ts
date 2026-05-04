// SPDX-License-Identifier: Apache-2.0
/**
 * Edit tool - Replace text in file
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

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
 */
export function createEditToolDefinition() {
  return {
    name: 'edit',
    description: 'Replace text in a file',
    schema: {},
    async execute(input: EditToolInput): Promise<any> {
      const { path: filePath, oldString, newString, dryRun = false } = input;

      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const original = readFileSync(filePath, 'utf8');
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

      writeFileSync(filePath, modified, 'utf8');

      return {
        success: true,
        changed: true,
        path: filePath,
      };
    },
  };
}
