/**
 * LsTool - List directory contents
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Directory suffix (/)
 * - Entry sorting
 * - Limit support
 */
export interface LsToolInput {
    path?: string;
    limit?: number;
}
export declare function lsTool(input: LsToolInput, cwd: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: {
        entryCount: number;
    } | undefined;
}>;
export declare const lsToolDefinition: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            path: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
    };
};
//# sourceMappingURL=ls-tool.d.ts.map