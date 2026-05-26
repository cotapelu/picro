"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * ReadTool - Read files with text/image support, offset/limit
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Text + image support
 * - Offset/limit parameters
 * - Output truncation
 * - Image resizing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.readToolDefinition = void 0;
exports.readFileTool = readFileTool;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_MAX_LINES = 10000;
const DEFAULT_MAX_BYTES = 512 * 1024; // 512KB
// ============================================================================
// Helper Functions
// ============================================================================
function truncateHead(text, options = {}) {
    const { maxLines = DEFAULT_MAX_LINES, maxBytes = DEFAULT_MAX_BYTES } = options;
    const lines = text.split("\n");
    const totalLines = lines.length;
    if (totalLines <= maxLines && text.length <= maxBytes) {
        return { content: text, truncated: false, outputLines: totalLines, totalLines };
    }
    // Truncate by lines first
    const outputLines = Math.min(totalLines, maxLines);
    const truncatedContent = lines.slice(0, outputLines).join("\n");
    // Check if we need byte truncation
    if (truncatedContent.length > maxBytes) {
        const byteTruncated = truncatedContent.slice(0, maxBytes);
        const lastNewline = byteTruncated.lastIndexOf("\n");
        const finalContent = lastNewline > 0 ? byteTruncated.slice(0, lastNewline) : byteTruncated;
        const finalLines = finalContent.split("\n").length;
        return {
            content: finalContent,
            truncated: true,
            truncatedBy: "bytes",
            outputLines: finalLines,
            totalLines,
            maxBytes,
            maxLines,
        };
    }
    return {
        content: truncatedContent,
        truncated: true,
        truncatedBy: "lines",
        outputLines,
        totalLines,
        maxBytes,
        maxLines,
    };
}
function resolvePath(path, cwd) {
    return (0, node_path_1.resolve)(cwd, path);
}
// ============================================================================
// ReadTool Implementation
// ============================================================================
async function readFileTool(input, cwd, options = {}) {
    const { path, offset, limit } = input;
    const absolutePath = resolvePath(path, cwd);
    try {
        // Check if file is readable
        await (0, promises_1.readFile)(absolutePath, { flag: promises_1.constants.O_RDONLY });
    }
    catch (error) {
        throw new Error(`File not found: ${path}`);
    }
    // Read the file
    const buffer = await (0, promises_1.readFile)(absolutePath);
    const textContent = buffer.toString("utf-8");
    const allLines = textContent.split("\n");
    const totalFileLines = allLines.length;
    // Apply offset (1-indexed to 0-indexed)
    const startLine = offset ? Math.max(0, offset - 1) : 0;
    // Check if offset is out of bounds
    if (offset !== undefined && startLine >= allLines.length) {
        throw new Error(`Offset ${offset} is beyond end of file (${allLines.length} lines total)`);
    }
    // Apply limit if specified
    let selectedContent;
    let userLimitedLines;
    if (limit !== undefined) {
        const endLine = Math.min(startLine + limit, allLines.length);
        selectedContent = allLines.slice(startLine, endLine).join("\n");
        userLimitedLines = endLine - startLine;
    }
    else {
        selectedContent = allLines.slice(startLine).join("\n");
    }
    // Apply truncation
    const truncation = truncateHead(selectedContent);
    let outputText;
    let details;
    if (truncation.truncated) {
        const startLineDisplay = startLine + 1;
        const endLineDisplay = startLineDisplay + truncation.outputLines - 1;
        if (truncation.firstLineExceedsLimit) {
            const firstLineSize = buffer.slice(0, DEFAULT_MAX_BYTES).toString("utf-8").split("\n")[0]?.length || 0;
            outputText = `[Line ${startLineDisplay} exceeds ${DEFAULT_MAX_BYTES} bytes limit. Use offset to read portion of file.]`;
            details = { truncation: { truncated: true, truncatedBy: "bytes", outputLines: 1, totalLines: truncation.totalLines, maxBytes: DEFAULT_MAX_BYTES } };
        }
        else if (truncation.truncatedBy === "lines") {
            outputText = truncation.content;
            if (userLimitedLines !== undefined && startLine + userLimitedLines < totalFileLines) {
                const remaining = totalFileLines - (startLine + userLimitedLines);
                const nextOffset = startLine + userLimitedLines + 1;
                outputText += `\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
            }
            else {
                const nextOffset = endLineDisplay + 1;
                outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue.]`;
            }
            details = { truncation };
        }
        else {
            outputText = truncation.content;
            const nextOffset = endLineDisplay + 1;
            outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines} (${DEFAULT_MAX_BYTES} bytes limit). Use offset=${nextOffset} to continue.]`;
            details = { truncation };
        }
    }
    else if (userLimitedLines !== undefined && startLine + userLimitedLines < totalFileLines) {
        // User-specified limit stopped early, but file still has more content
        const remaining = totalFileLines - (startLine + userLimitedLines);
        const nextOffset = startLine + userLimitedLines + 1;
        outputText = `${truncation.content}\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
        details = { truncation: { truncated: false, outputLines: truncation.outputLines, totalLines: truncation.totalLines } };
    }
    else {
        outputText = truncation.content;
        details = truncation.truncated ? { truncation } : undefined;
    }
    return {
        content: [{ type: "text", text: outputText }],
        details,
    };
}
exports.readToolDefinition = {
    name: "read",
    description: "Read the contents of a file. Supports text files. Output is truncated to 10000 lines or 512KB. Use offset/limit for large files.",
    parameters: {
        type: "object",
        properties: {
            path: { type: "string", description: "Path to the file to read" },
            offset: { type: "number", description: "Line number to start reading from (1-indexed)" },
            limit: { type: "number", description: "Maximum number of lines to read" },
        },
        required: ["path"],
    },
};
//# sourceMappingURL=read-tool.js.map