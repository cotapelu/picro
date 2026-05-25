/**
 * Write tool - Write content to file
 */
/**
 * Write tool input
 */
export interface WriteToolInput {
    path: string;
    content: string;
    append?: boolean;
    createDirs?: boolean;
}
/**
 * Create write tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export declare function createWriteToolDefinition(cwd: string): {
    name: string;
    description: string;
    schema: {};
    execute(input: WriteToolInput): Promise<any>;
};
//# sourceMappingURL=write.d.ts.map