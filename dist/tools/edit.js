// SPDX-License-Identifier: Apache-2.0
/**
 * Edit tool - Replace text in file
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolveToCwd, validatePathWithinBase } from './path-utils.js';
/**
 * Create edit tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createEditToolDefinition(cwd) {
    return {
        name: 'edit',
        description: 'Replace text in a file',
        schema: {},
        async execute(input) {
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
//# sourceMappingURL=edit.js.map