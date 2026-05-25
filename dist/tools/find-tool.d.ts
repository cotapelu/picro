/**
 * FindTool - Find files using fd
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Glob pattern matching
 * - Output truncation
 */
export interface FindToolInput {
    pattern: string;
    path?: string;
    limit?: number;
}
export declare function findTool(input: FindToolInput, cwd: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: {
        resultCount: number;
    } | undefined;
}>;
export declare const findToolDefinition: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            pattern: {
                type: string;
                description: string;
            };
            path: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=find-tool.d.ts.map