/**
 * Edit tool - Replace text in file
 */
/**
 * Edit tool input
 */
export interface EditToolInput {
    path: string;
    oldString: string;
    newString: string;
    dryRun?: boolean;
}
/**
 * Create edit tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export declare function createEditToolDefinition(cwd: string): {
    name: string;
    description: string;
    schema: {};
    execute(input: EditToolInput): Promise<any>;
};
//# sourceMappingURL=edit.d.ts.map