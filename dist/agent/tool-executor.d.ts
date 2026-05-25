/**
 * Tool executor with timeout, caching, and hooks.
 * Different architecture: single entry point, internal timeout handling.
 */
import type { ToolDefinition, ToolContext, ToolResult, ToolExecutorConfig, ToolCallData } from './types.js';
/**
 * Manages tool registration and execution.
 * Handles timeouts, caching, before/after hooks.
 */
export declare class ToolExecutor {
    private tools;
    private config;
    private cache;
    private emitter?;
    constructor(config?: Partial<ToolExecutorConfig>);
    /**
     * Register a single tool.
     */
    register(tool: ToolDefinition): void;
    /**
     * Alias for register (legacy compatibility)
     */
    registerTool(tool: ToolDefinition): void;
    /**
     * Register multiple tools.
     */
    registerAll(tools: ToolDefinition[]): void;
    /**
     * Alias for registerAll
     */
    registerTools(tools: ToolDefinition[]): void;
    /**
     * Check if a tool is available.
     */
    has(name: string): boolean;
    /**
     * Alias for has
    getTool(name: string): ToolDefinition | undefined {
      return this.getDefinition(name);
    }
     */
    hasTool(name: string): boolean;
    /**
     * Get all registered tool names.
     */
    getNames(): string[];
    /**
     * Alias for getNames (legacy)
     */
    getToolNames(): string[];
    /**
     * Get tool definition by name.
     */
    getDefinition(name: string): ToolDefinition | undefined;
    /**
     * Alias for getDefinition
     */
    getTool(name: string): ToolDefinition | undefined;
    /**
     * Execute a single tool call.
     */
    execute(toolCall: ToolCallData, context: ToolContext, signal?: AbortSignal): Promise<ToolResult>;
    /**
     * Execute multiple tool calls.
     */
    executeAll(toolCalls: ToolCallData[], context: ToolContext, signal?: AbortSignal): Promise<ToolResult[]>;
    /**
     * Clear the internal cache.
     */
    clearCache(): void;
    /**
     * Clear all tools (for testing).
     */
    reset(): void;
    private createErrorResult;
    private buildCacheKey;
    private normalizeResult;
    private executeWithTimeout;
    private emitToolCallStart;
    private emitToolCallEnd;
    private emitProgress;
    private emitToolError;
}
//# sourceMappingURL=tool-executor.d.ts.map