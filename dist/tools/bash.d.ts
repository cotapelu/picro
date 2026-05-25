/**
 * Bash tool - Execute shell commands
 */
/**
 * Bash tool input
 */
export interface BashToolInput {
    command: string;
    timeout?: number;
}
/**
 * Bash tool details
 */
export interface BashToolDetails {
    truncated?: boolean;
    fullOutputPath?: string;
}
/**
 * Create bash tool definition
 */
export declare function createBashToolDefinition(): {
    name: string;
    description: string;
    schema: {};
    execute(input: BashToolInput): Promise<any>;
};
//# sourceMappingURL=bash.d.ts.map