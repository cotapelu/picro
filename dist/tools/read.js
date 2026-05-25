"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Read tool - Read file contents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReadToolDefinition = createReadToolDefinition;
const fs_1 = require("fs");
const path_utils_js_1 = require("./path-utils.js");
/**
 * Create read tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
function createReadToolDefinition(cwd) {
    return {
        name: 'read',
        description: 'Read contents of a file',
        schema: {}, // placeholder - in full impl would use typebox
        async execute(input) {
            const { path: filePath, maxLines, offset = 0 } = input;
            // Resolve path safely within cwd
            const resolvedPath = (0, path_utils_js_1.resolveReadPath)(filePath, cwd);
            // Validate the resolved path is within cwd (security)
            if (!(0, path_utils_js_1.validatePathWithinBase)(resolvedPath, cwd)) {
                throw new Error(`Access denied: Path outside working directory`);
            }
            if (!(0, fs_1.existsSync)(resolvedPath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            let content = (0, fs_1.readFileSync)(resolvedPath, 'utf8');
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
//# sourceMappingURL=read.js.map