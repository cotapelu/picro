"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * GrepTool - Search content using ripgrep
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Pattern matching (regex + literal)
 * - Glob filtering
 * - Context lines
 * - Output truncation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.grepToolDefinition = void 0;
exports.grepTool = grepTool;
const node_child_process_1 = require("node:child_process");
const node_readline_1 = require("node:readline");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DEFAULT_LIMIT = 100;
async function grepTool(input, cwd) {
    const { pattern, path = ".", glob, ignoreCase, literal, context, limit = DEFAULT_LIMIT } = input;
    const searchPath = (0, node_path_1.resolve)(cwd, path);
    if (!(0, node_fs_1.existsSync)(searchPath)) {
        throw new Error(`Path not found: ${path}`);
    }
    return new Promise((resolvePromise, reject) => {
        const args = ["--json", "--line-number", "--color=never", "--hidden"];
        if (ignoreCase)
            args.push("--ignore-case");
        if (literal)
            args.push("--fixed-strings");
        if (glob)
            args.push("--glob", glob);
        if (context && context > 0) {
            args.push(`--context=${context}`);
        }
        args.push(pattern, searchPath);
        const child = (0, node_child_process_1.spawn)("rg", args, { stdio: ["ignore", "pipe", "pipe"] });
        const rl = (0, node_readline_1.createInterface)({ input: child.stdout });
        let output = "";
        let matchCount = 0;
        rl.on("line", (line) => {
            if (!line.trim())
                return;
            try {
                const event = JSON.parse(line);
                if (event.type === "match") {
                    matchCount++;
                    const filePath = event.data?.path?.text;
                    const lineNumber = event.data?.line_number;
                    const lineText = event.data?.lines?.text;
                    if (filePath && lineNumber !== undefined) {
                        output += `${filePath}:${lineNumber}: ${lineText || ""}\n`;
                    }
                }
            }
            catch {
                // Skip malformed lines
            }
        });
        child.on("close", (code) => {
            if (matchCount === 0) {
                resolvePromise({
                    content: [{ type: "text", text: "No matches found" }],
                    details: { matchCount: 0 },
                });
                return;
            }
            // Truncate if needed
            if (matchCount > limit) {
                const lines = output.split("\n").slice(0, limit);
                output = lines.join("\n") + `\n\n[${matchCount} matches found, showing first ${limit}. Use limit parameter for more.]`;
            }
            resolvePromise({
                content: [{ type: "text", text: output.trim() }],
                details: { matchCount },
            });
        });
        child.on("error", (error) => {
            reject(new Error(`ripgrep not found: ${error.message}`));
        });
    });
}
exports.grepToolDefinition = {
    name: "grep",
    description: "Search file contents for a pattern. Returns matching lines with file paths and line numbers.",
    parameters: {
        type: "object",
        properties: {
            pattern: { type: "string", description: "Search pattern (regex or literal string)" },
            path: { type: "string", description: "Directory or file to search" },
            glob: { type: "string", description: "Filter files by glob pattern" },
            ignoreCase: { type: "boolean", description: "Case-insensitive search" },
            literal: { type: "boolean", description: "Treat pattern as literal string" },
            context: { type: "number", description: "Lines of context to show" },
            limit: { type: "number", description: "Maximum matches to return" },
        },
        required: ["pattern"],
    },
};
//# sourceMappingURL=grep-tool.js.map