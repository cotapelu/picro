// SPDX-License-Identifier: Apache-2.0
/**
 * Tool executor with timeout, caching, and hooks.
 * Different architecture: single entry point, internal timeout handling.
 */
import { validateToolArguments } from '../llm/validation.js';
/**
 * Manages tool registration and execution.
 * Handles timeouts, caching, before/after hooks.
 */
export class ToolExecutor {
    tools = new Map();
    config;
    cache = new Map();
    emitter;
    constructor(config) {
        this.config = {
            timeout: config?.timeout ?? 30000,
            cacheEnabled: config?.cacheEnabled ?? false,
            cacheSize: config?.cacheSize ?? 1000,
            toolExecutionStrategy: config?.toolExecutionStrategy ?? 'parallel',
            emitter: config?.emitter,
            beforeToolCall: config?.beforeToolCall,
            afterToolCall: config?.afterToolCall,
            emitProgressUpdates: config?.emitProgressUpdates ?? false,
        };
        this.emitter = config?.emitter;
    }
    /**
     * Register a single tool.
     */
    register(tool) {
        if (this.tools.has(tool.name)) {
            console.warn(`Tool '${tool.name}' is already registered, overwriting.`);
        }
        this.tools.set(tool.name, tool);
    }
    /**
     * Alias for register (legacy compatibility)
     */
    registerTool(tool) {
        this.register(tool);
    }
    /**
     * Register multiple tools.
     */
    registerAll(tools) {
        for (const tool of tools) {
            this.register(tool);
        }
    }
    /**
     * Alias for registerAll
     */
    registerTools(tools) {
        this.registerAll(tools);
    }
    /**
     * Check if a tool is available.
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * Alias for has
    getTool(name: string): ToolDefinition | undefined {
      return this.getDefinition(name);
    }
     */
    hasTool(name) {
        return this.has(name);
    }
    /**
     * Get all registered tool names.
     */
    getNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * Alias for getNames (legacy)
     */
    getToolNames() {
        return this.getNames();
    }
    /**
     * Get tool definition by name.
     */
    getDefinition(name) {
        return this.tools.get(name);
    }
    /**
     * Alias for getDefinition
     */
    getTool(name) {
        return this.getDefinition(name);
    }
    /**
     * Execute a single tool call.
     */
    async execute(toolCall, context, signal) {
        const startTime = Date.now();
        const tool = this.tools.get(toolCall.name);
        if (!tool) {
            return this.createErrorResult(toolCall, `Tool '${toolCall.name}' not found`, startTime);
        }
        // Build metadata
        const metadata = {
            toolName: toolCall.name,
            toolCallId: toolCall.id,
            arguments: toolCall.arguments,
        };
        // Validate tool arguments against schema if available
        if (tool.parameters) {
            const validation = validateToolArguments(tool.parameters, toolCall.arguments);
            if (!validation.valid) {
                const errorMsg = `Invalid arguments for tool '${toolCall.name}': ${validation.errors?.join('; ') || 'validation failed'}`;
                return this.createErrorResult(toolCall, errorMsg, startTime);
            }
        }
        // Before hook
        if (this.config.beforeToolCall) {
            const before = await this.config.beforeToolCall({
                toolCall: toolCall,
                args: toolCall.arguments,
                round: context.round,
            }, signal);
            if (before?.block) {
                return this.createErrorResult(toolCall, before.reason ?? 'Tool execution blocked by before hook', startTime);
            }
        }
        // Cache check
        if (this.config.cacheEnabled) {
            const cacheKey = this.buildCacheKey(toolCall);
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        try {
            // Emit tool call start
            await this.emitToolCallStart(metadata);
            // Execute with timeout and signal
            const rawResult = await this.executeWithTimeout(async () => {
                // Check if the tool handler accepts an onProgress callback
                if (tool.handler.length > 2) {
                    // Create a wrapper for onProgress that emits events
                    const onProgressWrapper = (update) => {
                        if (this.config.emitProgressUpdates !== false) {
                            this.emitProgress(metadata, update);
                        }
                        // Call original onProgress if provided, but don't return its value
                        // We just call it for side effects
                        return;
                    };
                    return await tool.handler(toolCall.arguments, context, onProgressWrapper);
                }
                else {
                    // Tool handler doesn't accept onProgress, call it normally
                    return await tool.handler(toolCall.arguments, context);
                }
            }, this.config.timeout, signal);
            // Normalize result to string
            const resultString = this.normalizeResult(rawResult);
            let result = {
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                result: resultString,
                executionTime: Date.now() - startTime,
                isError: false,
                metadata,
            };
            // After hook (success)
            if (this.config.afterToolCall) {
                const after = await this.config.afterToolCall({
                    toolCall: toolCall,
                    args: toolCall.arguments,
                    result,
                    isError: false,
                    round: context.round,
                }, signal);
                if (after) {
                    if (after.content !== undefined)
                        result.result = after.content;
                    if (after.isError) {
                        result = {
                            ...result,
                            isError: true,
                            error: after.errorMessage ?? 'Tool marked as error by after hook',
                        };
                    }
                    if (after.details)
                        result.metadata = { ...metadata, ...after.details };
                }
            }
            // Cache if enabled
            if (this.config.cacheEnabled) {
                const cacheKey = this.buildCacheKey(toolCall);
                // LRU eviction: remove oldest entry if at capacity
                const maxSize = this.config.cacheSize ?? 1000;
                if (maxSize !== 0 && this.cache.size >= maxSize) {
                    const firstKey = this.cache.keys().next().value;
                    if (firstKey !== undefined) {
                        this.cache.delete(firstKey);
                    }
                }
                this.cache.set(cacheKey, result);
            }
            await this.emitToolCallEnd(metadata, result, false);
            return result;
        }
        catch (error) {
            const errorMessage = error?.message ?? String(error);
            const result = {
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                error: errorMessage,
                executionTime: Date.now() - startTime,
                isError: true,
                metadata,
            };
            // After hook (error)
            if (this.config.afterToolCall) {
                const after = await this.config.afterToolCall({
                    toolCall: toolCall,
                    args: toolCall.arguments,
                    result,
                    isError: true,
                    round: context.round,
                }, signal);
                if (after) {
                    if (after.content !== undefined)
                        result.result = after.content;
                    if (after.errorMessage !== undefined)
                        result.error = after.errorMessage;
                    if (after.details)
                        result.metadata = { ...metadata, ...after.details };
                }
            }
            await this.emitToolError(metadata, errorMessage);
            return result;
        }
    }
    /**
     * Execute multiple tool calls.
     */
    async executeAll(toolCalls, context, signal) {
        if (toolCalls.length === 0) {
            return [];
        }
        if (this.config.toolExecutionStrategy === 'sequential') {
            const results = [];
            for (const call of toolCalls) {
                if (signal?.aborted) {
                    break;
                }
                const result = await this.execute(call, context, signal);
                results.push(result);
            }
            return results;
        }
        // Parallel execution
        const promises = toolCalls.map((call) => this.execute(call, context, signal));
        return Promise.all(promises);
    }
    /**
     * Clear the internal cache.
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Clear all tools (for testing).
     */
    reset() {
        this.tools.clear();
        this.cache.clear();
    }
    // ============================================================================
    // Private helpers
    // ============================================================================
    createErrorResult(toolCall, message, startTime) {
        return {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            error: message,
            executionTime: Date.now() - startTime,
            isError: true,
            metadata: {
                toolName: toolCall.name,
                toolCallId: toolCall.id,
                arguments: toolCall.arguments,
            },
        };
    }
    buildCacheKey(toolCall) {
        return `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
    }
    normalizeResult(result) {
        if (result === undefined || result === null) {
            return '';
        }
        if (typeof result === 'string') {
            return result;
        }
        if (result instanceof Error) {
            return result.message;
        }
        // Convert objects to JSON string
        try {
            return JSON.stringify(result);
        }
        catch {
            return String(result);
        }
    }
    async executeWithTimeout(fn, timeoutMs, signal) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Execution timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            const onAbort = () => {
                clearTimeout(timeoutId);
                reject(new Error('Execution aborted'));
            };
            if (signal) {
                if (signal.aborted) {
                    clearTimeout(timeoutId);
                    reject(new Error('Execution aborted'));
                    return;
                }
                signal.addEventListener('abort', onAbort, { once: true });
            }
            fn()
                .then((result) => {
                clearTimeout(timeoutId);
                if (signal)
                    signal.removeEventListener('abort', onAbort);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                if (signal)
                    signal.removeEventListener('abort', onAbort);
                reject(error);
            });
        });
    }
    async emitToolCallStart(metadata) {
        await this.emitter?.emit({
            type: 'tool:call:start',
            timestamp: Date.now(),
            round: 0,
            toolName: metadata.toolName,
            toolCallId: metadata.toolCallId,
            arguments: metadata.arguments,
        });
    }
    async emitToolCallEnd(metadata, result, isError) {
        await this.emitter?.emit({
            type: 'tool:call:end',
            timestamp: Date.now(),
            round: 0,
            toolName: metadata.toolName,
            toolCallId: metadata.toolCallId,
            result,
        });
    }
    async emitProgress(metadata, update) {
        await this.emitter?.emit({
            type: 'tool:progress',
            timestamp: Date.now(),
            round: 0,
            toolName: metadata.toolName,
            toolCallId: metadata.toolCallId,
            partialResult: update.partialResult,
            details: update.details,
        });
    }
    async emitToolError(metadata, errorMessage) {
        await this.emitter?.emit({
            type: 'tool:error',
            timestamp: Date.now(),
            round: 0,
            toolName: metadata.toolName,
            toolCallId: metadata.toolCallId,
            errorMessage,
        });
    }
}
//# sourceMappingURL=tool-executor.js.map