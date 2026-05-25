"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Ls tool - List directory contents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLsToolDefinition = createLsToolDefinition;
const fs_1 = require("fs");
const path_1 = require("path");
const path_utils_js_1 = require("./path-utils.js");
/**
 * Create ls tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
function createLsToolDefinition(cwd) {
    return {
        name: 'ls',
        description: 'List directory contents',
        schema: {},
        async execute(input) {
            const { path: dirPath = '.', recursive = false, includeHidden = false } = input;
            // Resolve directory path safely within cwd
            const resolvedDir = (0, path_utils_js_1.resolveToCwd)(dirPath, cwd);
            // Validate the resolved directory is within cwd (security)
            if (!(0, path_utils_js_1.validatePathWithinBase)(resolvedDir, cwd)) {
                throw new Error(`Access denied: Path outside working directory`);
            }
            const entries = [];
            const walk = (dir, depth) => {
                if (depth > 5)
                    return;
                try {
                    const files = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
                    for (const file of files) {
                        if (!includeHidden && file.name.startsWith('.'))
                            continue;
                        const fullPath = (0, path_1.join)(dir, file.name);
                        try {
                            const stats = (0, fs_1.statSync)(fullPath);
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
                        }
                        catch {
                            // Skip
                        }
                    }
                }
                catch (err) {
                    throw new Error(`Failed to read directory ${dir}: ${err}`);
                }
            };
            walk(resolvedDir, 0);
            return {
                entries,
                count: entries.length,
            };
        },
    };
}
//# sourceMappingURL=ls.js.map