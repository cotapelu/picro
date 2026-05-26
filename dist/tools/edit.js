"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Edit tool - Replace text in file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEditToolDefinition = createEditToolDefinition;
const fs_1 = require("fs");
const path_utils_js_1 = require("./path-utils.js");
/**
 * Create edit tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
function createEditToolDefinition(cwd) {
    return {
        name: 'edit',
        description: 'Replace text in a file',
        schema: {},
        async execute(input) {
            const { path: filePath, oldString, newString, dryRun = false } = input;
            // Resolve path safely within cwd
            const resolvedPath = (0, path_utils_js_1.resolveToCwd)(filePath, cwd);
            // Validate the resolved path is within cwd (security)
            if (!(0, path_utils_js_1.validatePathWithinBase)(resolvedPath, cwd)) {
                throw new Error(`Access denied: Path outside working directory`);
            }
            if (!(0, fs_1.existsSync)(resolvedPath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            const original = (0, fs_1.readFileSync)(resolvedPath, 'utf8');
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
            (0, fs_1.writeFileSync)(resolvedPath, modified, 'utf8');
            return {
                success: true,
                changed: true,
                path: filePath,
            };
        },
    };
}
//# sourceMappingURL=edit.js.map