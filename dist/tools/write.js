"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Write tool - Write content to file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWriteToolDefinition = createWriteToolDefinition;
const fs_1 = require("fs");
const path_1 = require("path");
const path_utils_js_1 = require("./path-utils.js");
/**
 * Create write tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
function createWriteToolDefinition(cwd) {
    return {
        name: 'write',
        description: 'Write content to a file',
        schema: {},
        async execute(input) {
            const { path: filePath, content, append = false, createDirs = true } = input;
            // Resolve path safely within cwd
            const resolvedPath = (0, path_utils_js_1.resolveToCwd)(filePath, cwd);
            // Validate the resolved path is within cwd (security)
            if (!(0, path_utils_js_1.validatePathWithinBase)(resolvedPath, cwd)) {
                throw new Error(`Access denied: Path outside working directory`);
            }
            if (createDirs) {
                const dir = (0, path_1.dirname)(resolvedPath);
                if (!(0, fs_1.existsSync)(dir)) {
                    (0, fs_1.mkdirSync)(dir, { recursive: true });
                }
            }
            (0, fs_1.writeFileSync)(resolvedPath, content, append ? { flag: 'a' } : { flag: 'w' });
            return {
                success: true,
                path: filePath,
                bytesWritten: Buffer.byteLength(content, 'utf8'),
            };
        },
    };
}
//# sourceMappingURL=write.js.map