/**
 * ReadTool - Read files with text/image support, offset/limit
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Text + image support
 * - Offset/limit parameters
 * - Output truncation
 * - Image resizing
 */
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
export declare function readFileTool(input: ReadToolInput, cwd: string, options?: {
    autoResizeImages?: boolean;
}): Promise<{
    content: Array<{
        type: "text";
        text: string;
    } | {
        type: "image";
        data: string;
        mimeType: string;
    }>;
    details: ReadToolDetails | undefined;
}>;
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            path: {
                type: "string";
                description: "Path to the file to read";
            };
            offset?: {
                type: "number";
                description: "Line number to start reading from (1-indexed)";
            };
            limit?: {
                type: "number";
                description: "Maximum number of lines to read";
            };
        };
        required: ["path"];
    };
}
export declare const readToolDefinition: ToolDefinition;
//# sourceMappingURL=read-tool.d.ts.map