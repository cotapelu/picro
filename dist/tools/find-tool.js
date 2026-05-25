"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * FindTool - Find files using fd
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Glob pattern matching
 * - Output truncation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findToolDefinition = void 0;
exports.findTool = findTool;
const node_child_process_1 = require("node:child_process");
const node_readline_1 = require("node:readline");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_LIMIT = 1000;
async function findTool(input, cwd) {
    const { pattern, path = ".", limit = DEFAULT_LIMIT } = input;
    const searchPath = (0, node_path_1.resolve)(cwd, path);
    if (!(0, node_fs_1.existsSync)(searchPath)) {
        throw new Error(`Path not found: ${path}`);
    }
    return new Promise((resolvePromise, reject) => {
        const args = [
            "--glob", pattern,
            "--color=never",
            "--hidden",
            "--no-require-git",
            "--max-results", String(limit),
            searchPath
        ];
        const child = (0, node_child_process_1.spawn)("fd", args, { stdio: ["ignore", "pipe", "pipe"] });
        const rl = (0, node_readline_1.createInterface)({ input: child.stdout });
        let output = "";
        rl.on("line", (line) => {
            if (line.trim()) {
                output += line + "\n";
            }
        });
        child.on("close", () => {
            if (!output.trim()) {
                resolvePromise({
                    content: [{ type: "text", text: "No files found matching pattern" }],
                    details: { resultCount: 0 },
                });
                return;
            }
            const lines = output.trim().split("\n");
            const resultCount = lines.length;
            if (resultCount >= limit) {
                output = lines.slice(0, limit).join("\n");
                output += `\n\n[${resultCount} files found, showing first ${limit}.]`;
            }
            resolvePromise({
                content: [{ type: "text", text: output.trim() }],
                details: { resultCount },
            });
        });
        child.on("error", (error) => {
            reject(new Error(`fd not found: ${error.message}`));
        });
    });
}
exports.findToolDefinition = {
    name: "find",
    description: "Search for files by glob pattern. Returns matching file paths.",
    parameters: {
        type: "object",
        properties: {
            pattern: { type: "string", description: "Glob pattern to match files" },
            path: { type: "string", description: "Directory to search in" },
            limit: { type: "number", description: "Maximum number of results" },
        },
        required: ["pattern"],
    },
};
//# sourceMappingURL=find-tool.js.map