"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * LsTool - List directory contents
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Directory suffix (/)
 * - Entry sorting
 * - Limit support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lsToolDefinition = void 0;
exports.lsTool = lsTool;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const DEFAULT_LIMIT = 500;
async function lsTool(input, cwd) {
    const { path = ".", limit = DEFAULT_LIMIT } = input;
    const dirPath = (0, node_path_1.resolve)(cwd, path);
    let entries;
    try {
        entries = await (0, promises_1.readdir)(dirPath);
    }
    catch {
        throw new Error(`Cannot read directory: ${path}`);
    }
    // Sort alphabetically (case-insensitive)
    entries.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    // Format entries with directory indicator
    const results = [];
    let entryLimitReached = false;
    for (const entry of entries) {
        if (results.length >= limit) {
            entryLimitReached = true;
            break;
        }
        const fullPath = (0, node_path_1.resolve)(dirPath, entry);
        let suffix = "";
        try {
            const stats = await (0, promises_1.stat)(fullPath);
            if (stats.isDirectory()) {
                suffix = "/";
            }
        }
        catch {
            // Skip entries we can't stat
            continue;
        }
        results.push(entry + suffix);
    }
    if (results.length === 0) {
        return {
            content: [{ type: "text", text: "(empty directory)" }],
            details: { entryCount: 0 },
        };
    }
    let output = results.join("\n");
    if (entryLimitReached) {
        output += `\n\n[Showing first ${limit} entries. Use limit parameter for more.]`;
    }
    return {
        content: [{ type: "text", text: output }],
        details: { entryCount: results.length },
    };
}
exports.lsToolDefinition = {
    name: "ls",
    description: "List directory contents. Returns entries sorted alphabetically with '/' suffix for directories.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Directory to list" },
            limit: { type: "number", description: "Maximum entries to return" },
        },
    },
};
//# sourceMappingURL=ls-tool.js.map