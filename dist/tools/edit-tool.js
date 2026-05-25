"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * EditTool - Edit files with multiple edits, diff
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Multiple edits in one call
 * - Diff computation
 * - File mutation queue
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.editToolDefinition = void 0;
exports.editTool = editTool;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
function resolvePath(path, cwd) {
    return (0, node_path_1.resolve)(cwd, path);
}
function normalizeNewlines(text) {
    return text.replace(/\r\n/g, "\n");
}
async function editTool(input, cwd) {
    const { path, edits } = input;
    const absolutePath = resolvePath(path, cwd);
    if (!edits || edits.length === 0) {
        throw new Error("Edit tool requires at least one edit");
    }
    // Read the file
    let content;
    try {
        content = await (0, promises_1.readFile)(absolutePath, "utf-8");
    }
    catch {
        throw new Error(`File not found: ${path}`);
    }
    // Normalize newlines
    let normalizedContent = normalizeNewlines(content);
    const originalContent = normalizedContent;
    // Apply edits
    for (const edit of edits) {
        const normalizedOldText = normalizeNewlines(edit.oldText);
        const index = normalizedContent.indexOf(normalizedOldText);
        if (index === -1) {
            throw new Error(`Could not find text to replace: ${edit.oldText.substring(0, 50)}...`);
        }
        normalizedContent = normalizedContent.slice(0, index) + edit.newText + normalizedContent.slice(index + normalizedOldText.length);
    }
    // Write the file
    await (0, promises_1.writeFile)(absolutePath, normalizedContent, "utf-8");
    return {
        content: [{ type: "text", text: `Successfully edited ${edits.length} location(s) in ${path}` }],
        details: { edited: edits.length },
    };
}
exports.editToolDefinition = {
    name: "edit",
    description: "Edit a file using exact text replacement. Each edit specifies oldText to find and newText to replace it with.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Path to the file to edit" },
            edits: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        oldText: { type: "string", description: "Text to find" },
                        newText: { type: "string", description: "Replacement text" },
                    },
                    required: ["oldText", "newText"],
                },
                description: "One or more edits to apply",
            },
        },
        required: ["path", "edits"],
    },
};
//# sourceMappingURL=edit-tool.js.map