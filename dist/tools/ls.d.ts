/**
 * Ls tool - List directory contents
 */
/**
 * Ls tool input
 */
export interface LsToolInput {
    path?: string;
    recursive?: boolean;
    includeHidden?: boolean;
}
/**
 * File entry
 */
export interface LsEntry {
    name: string;
    path: string;
    type: 'file' | 'directory' | 'symlink';
    size: number;
    modified: number;
}
/**
 * Create ls tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export declare function createLsToolDefinition(cwd: string): {
    name: string;
    description: string;
    schema: {};
    execute(input: LsToolInput): Promise<any>;
};
//# sourceMappingURL=ls.d.ts.map