/**
 * Bash Tool - Execute bash commands
 *
 * This tool allows the agent to execute shell commands.
 */
import type { ToolDefinition, ToolHandler } from "../agent/types.js";
/**
 * Bash tool input type
 */
export interface BashToolInput {
    command: string;
    timeout?: number;
}
/**
 * Bash tool options
 */
export interface BashToolOptions {
    /** Working directory */
    cwd?: string;
    /** Maximum bytes to capture */
    maxBytes?: number;
}
/**
 * Create bash tool handler
 */
export declare function createBashHandler(cwd: string, options?: BashToolOptions): ToolHandler;
/**
 * Create a bash tool definition.
 */
export declare function createBashToolDefinition(cwd: string, options?: BashToolOptions): ToolDefinition;
/**
 * Create a bash tool instance.
 */
export declare function createBashTool(cwd: string, options?: BashToolOptions): {
    execute: ToolHandler;
    name: string;
    description: string;
    parameters?: {
        type: "object";
        properties: Record<string, import("../agent/types.js").ToolParameter>;
        required?: string[];
    };
    handler: ToolHandler;
};
/**
 * Check if result is a bash tool result
 */
export declare function isBashToolResult(result: unknown): boolean;
//# sourceMappingURL=bash-tool.d.ts.map