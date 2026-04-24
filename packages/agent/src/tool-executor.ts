// SPDX-License-Identifier: Apache-2.0
/**
 * Tool executor with timeout, caching, and hooks.
 * Different architecture: single entry point, internal timeout handling.
 */

import type {
  ToolDefinition,
  ToolHandler,
  ToolContext,
  ToolResult,
  SuccessfulToolResult,
  FailedToolResult,
  ToolExecutionMetadata,
  ToolProgressUpdate,
  ToolExecutorConfig,
  BeforeToolHook,
  AfterToolHook,
  HookResult,
  ToolCallData,
} from './types.js';
import { EventEmitter } from './event-emitter.js';

/**
 * Manages tool registration and execution.
 * Handles timeouts, caching, before/after hooks.
 */
export class ToolExecutor {
  private tools: Map<string, ToolDefinition> = new Map();
  private config: ToolExecutorConfig;
  private cache: Map<string, ToolResult> = new Map();
  private emitter?: EventEmitter;

  constructor(config?: Partial<ToolExecutorConfig>) {
    this.config = {
      timeout: config?.timeout ?? 30000,
      cacheEnabled: config?.cacheEnabled ?? false,
      toolExecutionStrategy: config?.toolExecutionStrategy ?? 'parallel',
      emitter: config?.emitter,
      beforeToolCall: config?.beforeToolCall,
      afterToolCall: config?.afterToolCall,
    };
    this.emitter = config?.emitter;
  }

  /**
   * Register a single tool.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool '${tool.name}' is already registered, overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Alias for register (legacy compatibility)
   */
  registerTool(tool: ToolDefinition): void {
    this.register(tool);
  }

  /**
   * Register multiple tools.
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Alias for registerAll
   */
  registerTools(tools: ToolDefinition[]): void {
    this.registerAll(tools);
  }

  /**
   * Check if a tool is available.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Alias for has
  getTool(name: string): ToolDefinition | undefined {
    return this.getDefinition(name);
  }
   */
  hasTool(name: string): boolean {
    return this.has(name);
  }

  /**
   * Get all registered tool names.
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Alias for getNames (legacy)
   */
  getToolNames(): string[] {
    return this.getNames();
  }

  /**
   * Get tool definition by name.
   */
  getDefinition(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Alias for getDefinition
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.getDefinition(name);
  }

  /**
   * Execute a single tool call.
   */
  async execute(
    toolCall: ToolCallData,
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      return this.createErrorResult(toolCall, `Tool '${toolCall.name}' not found`, startTime);
    }

    // Build metadata
    const metadata: ToolExecutionMetadata = {
      toolName: toolCall.name,
      toolCallId: toolCall.id,
      arguments: toolCall.arguments,
    };

    // Before hook
    if (this.config.beforeToolCall) {
      const before = await this.config.beforeToolCall(
        {
          toolCall: toolCall,
          args: toolCall.arguments,
          round: context.round,
        },
        signal
      );
      if (before?.block) {
        return this.createErrorResult(
          toolCall,
          before.reason ?? 'Tool execution blocked by before hook',
          startTime
        );
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
      const rawResult = await this.executeWithTimeout(
        async () => await tool.handler(toolCall.arguments, context),
        this.config.timeout,
        signal
      );

      // Normalize result to string
      const resultString = this.normalizeResult(rawResult);

      let result: SuccessfulToolResult = {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        result: resultString,
        executionTime: Date.now() - startTime,
        isError: false,
        metadata,
      };

      // After hook (success)
      if (this.config.afterToolCall) {
        const after = await this.config.afterToolCall(
          {
            toolCall: toolCall,
            args: toolCall.arguments,
            result,
            isError: false,
            round: context.round,
          },
          signal
        );
        if (after) {
          if (after.content !== undefined) result.result = after.content;
          if (after.isError) {
            result = {
              ...result,
              isError: true,
              error: after.errorMessage ?? 'Tool marked as error by after hook',
            } as any;
          }
          if (after.details) result.metadata = { ...metadata, ...after.details };
        }
      }

      // Cache if enabled
      if (this.config.cacheEnabled) {
        const cacheKey = this.buildCacheKey(toolCall);
        this.cache.set(cacheKey, result);
      }

      await this.emitToolCallEnd(metadata, result, false);
      return result;
    } catch (error: any) {
      const errorMessage = error?.message ?? String(error);
      const result: FailedToolResult = {
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        isError: true,
        metadata,
      };

      // After hook (error)
      if (this.config.afterToolCall) {
        const after = await this.config.afterToolCall(
          {
            toolCall: toolCall,
            args: toolCall.arguments,
            result,
            isError: true,
            round: context.round,
          },
          signal
        );
        if (after) {
          if (after.content !== undefined) (result as any).result = after.content;
          if (after.errorMessage !== undefined) (result as any).error = after.errorMessage;
          if (after.details) result.metadata = { ...metadata, ...after.details };
        }
      }

      await this.emitToolError(metadata, errorMessage);
      return result;
    }
  }

  /**
   * Execute multiple tool calls.
   */
  async executeAll(
    toolCalls: ToolCallData[],
    context: ToolContext,
    signal?: AbortSignal
  ): Promise<ToolResult[]> {
    if (toolCalls.length === 0) {
      return [];
    }

    if (this.config.toolExecutionStrategy === 'sequential') {
      const results: ToolResult[] = [];
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
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear all tools (for testing).
   */
  reset(): void {
    this.tools.clear();
    this.cache.clear();
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private createErrorResult(
    toolCall: ToolCallData,
    message: string,
    startTime: number
  ): FailedToolResult {
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

  private buildCacheKey(toolCall: ToolCallData): string {
    return `${toolCall.name}:${JSON.stringify(toolCall.arguments)}`;
  }

  private normalizeResult(result: unknown): string {
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
    } catch {
      return String(result);
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<T> {
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
          if (signal) signal.removeEventListener('abort', onAbort);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (signal) signal.removeEventListener('abort', onAbort);
          reject(error);
        });
    });
  }

  private async emitToolCallStart(metadata: ToolExecutionMetadata): Promise<void> {
    await this.emitter?.emit({
      type: 'tool:call:start',
      timestamp: Date.now(),
      round: 0,
      toolName: metadata.toolName,
      toolCallId: metadata.toolCallId,
      arguments: metadata.arguments,
    } as any);
  }

  private async emitToolCallEnd(
    metadata: ToolExecutionMetadata,
    result: ToolResult,
    isError: boolean
  ): Promise<void> {
    await this.emitter?.emit({
      type: 'tool:call:end',
      timestamp: Date.now(),
      round: 0,
      toolName: metadata.toolName,
      toolCallId: metadata.toolCallId,
      result,
    } as any);
  }

  private async emitProgress(
    metadata: ToolExecutionMetadata,
    update: ToolProgressUpdate
  ): Promise<void> {
    await this.emitter?.emit({
      type: 'tool:progress',
      timestamp: Date.now(),
      round: 0,
      toolName: metadata.toolName,
      toolCallId: metadata.toolCallId,
      partialResult: update.partialResult,
      details: update.details,
    } as any);
  }

  private async emitToolError(metadata: ToolExecutionMetadata, errorMessage: string): Promise<void> {
    await this.emitter?.emit({
      type: 'tool:error',
      timestamp: Date.now(),
      round: 0,
      toolName: metadata.toolName,
      toolCallId: metadata.toolCallId,
      errorMessage,
    } as any);
  }
}
