"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * WriteTool - Write files with auto-create directories
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Auto-create parent directories
 * - Write content to file
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeToolDefinition = void 0;
exports.writeFileTool = writeFileTool;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
function resolvePath(path, cwd) {
    return (0, node_path_1.resolve)(cwd, path);
}
async function writeFileTool(input, cwd) {
    const { path, content } = input;
    const absolutePath = resolvePath(path, cwd);
    const dir = (0, node_path_1.dirname)(absolutePath);
    // Create parent directories if needed
    await (0, promises_1.mkdir)(dir, { recursive: true });
    // Write the file
    await (0, promises_1.writeFile)(absolutePath, content, "utf-8");
    return {
        content: [{ type: "text", text: `Successfully wrote ${content.length} bytes to ${path}` }],
        details: undefined,
    };
}
exports.writeToolDefinition = {
    name: "write",
    description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Path to the file to write" },
            content: { type: "string", description: "Content to write to the file" },
        },
        required: ["path", "content"],
    },
};
//# sourceMappingURL=write-tool.js.map