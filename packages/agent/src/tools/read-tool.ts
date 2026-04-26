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

import { constants, readFile as fsReadFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// ============================================================================
// Types
// ============================================================================

export interface ReadToolInput {
  path: string;
  offset?: number;
  limit?: number;
}

export interface ReadToolDetails {
  truncation?: {
    truncated: boolean;
    truncatedBy?: "lines" | "bytes";
    outputLines: number;
    totalLines: number;
    maxBytes?: number;
    maxLines?: number;
    firstLineExceedsLimit?: boolean;
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_LINES = 10000;
const DEFAULT_MAX_BYTES = 512 * 1024; // 512KB

// ============================================================================
// Helper Functions
// ============================================================================

function truncateHead(text: string, options: { maxLines?: number; maxBytes?: number } = {}): {
  content: string;
  truncated: boolean;
  truncatedBy?: "lines" | "bytes";
  outputLines: number;
  totalLines: number;
  maxBytes?: number;
  maxLines?: number;
} {
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

function resolvePath(path: string, cwd: string): string {
  return resolve(cwd, path);
}

// ============================================================================
// ReadTool Implementation
// ============================================================================

export async function readFileTool(
  input: ReadToolInput,
  cwd: string,
  options: { autoResizeImages?: boolean } = {}
): Promise<{ content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }>; details: ReadToolDetails | undefined }> {
  const { path, offset, limit } = input;
  const absolutePath = resolvePath(path, cwd);

  try {
    // Check if file is readable
    await fsReadFile(absolutePath, { flag: constants.O_RDONLY });
  } catch (error) {
    throw new Error(`File not found: ${path}`);
  }

  // Read the file
  const buffer = await fsReadFile(absolutePath);
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
  let selectedContent: string;
  let userLimitedLines: number | undefined;
  
  if (limit !== undefined) {
    const endLine = Math.min(startLine + limit, allLines.length);
    selectedContent = allLines.slice(startLine, endLine).join("\n");
    userLimitedLines = endLine - startLine;
  } else {
    selectedContent = allLines.slice(startLine).join("\n");
  }

  // Apply truncation
  const truncation = truncateHead(selectedContent);
  let outputText: string;
  let details: ReadToolDetails | undefined;

  if (truncation.truncated) {
    const startLineDisplay = startLine + 1;
    const endLineDisplay = startLineDisplay + truncation.outputLines - 1;

    if ((truncation as any).firstLineExceedsLimit) {
      const firstLineSize = buffer.slice(0, DEFAULT_MAX_BYTES).toString("utf-8").split("\n")[0]?.length || 0;
      outputText = `[Line ${startLineDisplay} exceeds ${DEFAULT_MAX_BYTES} bytes limit. Use offset to read portion of file.]`;
      details = { truncation: { truncated: true, truncatedBy: "bytes", outputLines: 1, totalLines: truncation.totalLines, maxBytes: DEFAULT_MAX_BYTES } };
    } else if (truncation.truncatedBy === "lines") {
      outputText = truncation.content;
      if (userLimitedLines !== undefined && startLine + userLimitedLines < totalFileLines) {
        const remaining = totalFileLines - (startLine + userLimitedLines);
        const nextOffset = startLine + userLimitedLines + 1;
        outputText += `\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
      } else {
        const nextOffset = endLineDisplay + 1;
        outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue.]`;
      }
      details = { truncation };
    } else {
      outputText = truncation.content;
      const nextOffset = endLineDisplay + 1;
      outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines} (${DEFAULT_MAX_BYTES} bytes limit). Use offset=${nextOffset} to continue.]`;
      details = { truncation };
    }
  } else if (userLimitedLines !== undefined && startLine + userLimitedLines < totalFileLines) {
    // User-specified limit stopped early, but file still has more content
    const remaining = totalFileLines - (startLine + userLimitedLines);
    const nextOffset = startLine + userLimitedLines + 1;
    outputText = `${truncation.content}\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
    details = { truncation: { truncated: false, outputLines: truncation.outputLines, totalLines: truncation.totalLines } };
  } else {
    outputText = truncation.content;
    details = truncation.truncated ? { truncation } : undefined;
  }

  return {
    content: [{ type: "text" as const, text: outputText }],
    details,
  };
}

// ============================================================================
// Tool Definition
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: {
      path: { type: "string"; description: "Path to the file to read" };
      offset?: { type: "number"; description: "Line number to start reading from (1-indexed)" };
      limit?: { type: "number"; description: "Maximum number of lines to read" };
    };
    required: ["path"];
  };
}

export const readToolDefinition: ToolDefinition = {
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