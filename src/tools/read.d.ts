/**
 * Read tool - Read file contents
 */
/**
 * Read tool input
 */
export interface ReadToolInput {
    path: string;
    maxLines?: number;
    offset?: number;
}
/**
 * Create read tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export declare function createReadToolDefinition(cwd: string): {
    name: string;
    description: string;
    schema: {};
    execute(input: ReadToolInput): Promise<any>;
};
//# sourceMappingURL=read.d.ts.map