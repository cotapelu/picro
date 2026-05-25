/**
 * WriteTool - Write files with auto-create directories
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Auto-create parent directories
 * - Write content to file
 */
export interface WriteToolInput {
    path: string;
    content: string;
}
export declare function writeFileTool(input: WriteToolInput, cwd: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: undefined;
}>;
export declare const writeToolDefinition: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            path: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=write-tool.d.ts.map