/**
 * GrepTool - Search content using ripgrep
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Pattern matching (regex + literal)
 * - Glob filtering
 * - Context lines
 * - Output truncation
 */
export interface GrepToolInput {
    pattern: string;
    path?: string;
    glob?: string;
    ignoreCase?: boolean;
    literal?: boolean;
    context?: number;
    limit?: number;
}
export declare function grepTool(input: GrepToolInput, cwd: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: {
        matchCount: number;
    } | undefined;
}>;
export declare const grepToolDefinition: {
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
            glob: {
                type: string;
                description: string;
            };
            ignoreCase: {
                type: string;
                description: string;
            };
            literal: {
                type: string;
                description: string;
            };
            context: {
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
//# sourceMappingURL=grep-tool.d.ts.map