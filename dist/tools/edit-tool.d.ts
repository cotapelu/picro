/**
 * EditTool - Edit files with multiple edits, diff
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Multiple edits in one call
 * - Diff computation
 * - File mutation queue
 */
export interface EditToolInput {
    path: string;
    edits: Array<{
        oldText: string;
        newText: string;
    }>;
}
export declare function editTool(input: EditToolInput, cwd: string): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    details: {
        edited: number;
    };
}>;
export declare const editToolDefinition: {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: {
            path: {
                type: string;
                description: string;
            };
            edits: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        oldText: {
                            type: string;
                            description: string;
                        };
                        newText: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
                description: string;
            };
        };
        required: string[];
    };
};
//# sourceMappingURL=edit-tool.d.ts.map