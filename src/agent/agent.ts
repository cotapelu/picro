// SPDX-License-Identifier: Apache-2.0
/**
 * Agent: main public API.
 * Different design: separates concerns with AgentLoop.
 */

import type {
  ConversationTurn,
  AgentConfig,
  AgentRuntimeState,
  AgentRunResult,
  AgentTool,
  LoopStrategy,
  MemoryStore,
  LLMResponse,
  ToolHandler,
  ToolRegistry,
  QueueMode,
  ToolDefinition,
} from "./types.js";
import { EventEmitter } from "../events/event-emitter.js";
import { ToolExecutor } from "./tool-executor.js";
import { ContextBuilder } from "./context-manager.js";
import { AgentLoop } from "./agent-loop.js";
import { LoopStrategyFactory } from "./loop-strategy.js";
import { MessageQueue } from "./message-queue.js";

// Import from llm
import { complete, stream } from "../llm/index.js";
import type {
  Model,
  Context,
  Message,
  Tool,
  StreamOptions,
} from "../llm/index.js";

/**
 * Agent orchestrates AI interactions with tools.
 */
export class Agent {
  // ============================================================================
  // Properties (all declared before methods)
  // ============================================================================

  private readonly config: AgentConfig;
  private readonly emitter: EventEmitter;
  private readonly toolExecutor: ToolExecutor;
  private readonly contextBuilder?: ContextBuilder | null;
  private readonly strategy: LoopStrategy;
  private readonly runner: AgentLoop;
  private readonly steeringQueue: MessageQueue;
  private readonly followUpQueue: MessageQueue;
  private memoryStore?: MemoryStore;
  private model?: Model;
  private llmComplete?: (
    context: Context,
    options?: any,
  ) => Promise<LLMResponse>;
  private llmStream?: (
    context: Context,
    options?: any,
  ) => AsyncIterable<any> | Promise<AsyncIterable<any>>;
  private _currentRunIdlePromise: Promise<void> | null = null;
  private toolRegistry: ToolRegistry = {};
  private tools: AgentTool[];

  /**
   * Constructs a new Agent instance.
   * @param model - The AI model configuration.
   * @param tools - Array of tool definitions.
   * @param config - Optional configuration (maxRounds, verbose, memoryStore, etc.).
   */
  constructor(
    model?: Model,
    tools: AgentTool[] = [],
    config: AgentConfig = { maxRounds: 10 },
  ) {
    this.model = model;
    this.tools = tools;
    this.config = this._resolveConfig(config);
    // Provide setModel callback for dynamic model changes from prepareNextTurn
    this.config.setModel = (model: Model) => this.setModel(model);
    this.emitter = this.config.enableLogging
      ? this.createLogger(this.config.verbose ?? false)
      : new EventEmitter();

    // Tool executor with config and registry
    this.toolExecutor = new ToolExecutor({
      timeout: this.config.toolTimeout ?? 30000,
      cacheEnabled: this.config.cacheResults ?? false,
      cacheSize: 1000,
      toolExecutionStrategy: this.config.toolExecutionStrategy ?? 'parallel',
      // Note: beforeToolCall/afterToolCall hooks are not passed to ToolExecutor currently due to type differences
    });
    // Register any handlers from legacy executor config
    if (this.config.executor?.handlers) {
      for (const [name, handler] of Object.entries(this.config.executor.handlers)) {
        (this.toolRegistry as any)[name] = handler as ToolHandler;
        this.toolExecutor.register({
          name,
          description: "",
          parameters: {},
          handler: handler as ToolHandler,
        } as ToolDefinition);
      }
    }
    // Register provided tools (built-in tools)
    for (const tool of this.tools) {
      // Only register if a handler is present
      const anyTool = tool as any;
      if (anyTool.handler) {
        // Also add to toolRegistry for legacy checks if needed
        (this.toolRegistry as any)[tool.name] = anyTool.handler as ToolHandler;
        const toolDef: ToolDefinition = {
          name: tool.name,
          description: tool.description || "",
          parameters: tool.parameters || {},
          handler: anyTool.handler as ToolHandler,
          executionMode: tool.executionMode,
          prepareArguments: anyTool.prepareArguments,
        };
        this.toolExecutor.register(toolDef);
      }
    }

    // Context builder if no custom convertToLlm
    if (!this.config.convertToLlm) {
      this.contextBuilder = new ContextBuilder({
        maxTokens: this.config.contextBuilder?.maxTokens ?? 128000,
        reservedTokens: this.config.contextBuilder?.reservedTokens ?? 4096,
        minMessages: this.config.contextBuilder?.minMessages ?? 1,
        enableMemoryInjection:
          this.config.contextBuilder?.enableMemoryInjection ?? true,
      });
    } else {
      this.contextBuilder = undefined;
    }

    // Loop strategy
    let strategyName:
      | "react"
      | "plan-solve"
      | "reflection"
      | "simple"
      | "self-refine";
    if (this.config.loopStrategy) {
      strategyName = this.config.loopStrategy;
    } else {
      strategyName =
        this.config.toolExecutionMode === "sequential" ? "simple" : "react";
    }
    this.strategy = LoopStrategyFactory.create(strategyName);

    // Queues: map queueMode to internal MessageQueue modes
    const mapQueue = (mode: QueueMode) =>
      mode === "all" ? "drain-all" : "dequeue-one";
    this.steeringQueue = new MessageQueue(
      mapQueue(this.config.queueMode ?? "all"),
    );
    this.followUpQueue = new MessageQueue(
      mapQueue(this.config.followUpMode ?? "all"),
    );

    if (this.config.memoryStore) {
      this.memoryStore = this.config.memoryStore;
    }

    // Runner – pass wrappers that forward to the current llmComplete/llmStream providers.
    this.runner = new AgentLoop(
      this.config,
      this.emitter,
      this.toolExecutor,
      this.contextBuilder ?? null,
      this.strategy,
      async (context: Context, options?: any): Promise<LLMResponse> => {
        if (!this.llmComplete) throw new Error("LLM provider not set");
        return this.llmComplete(context, options);
      },
      async (context: Context, options?: any): Promise<AsyncIterable<any>> => {
        if (!this.llmStream) throw new Error("LLM stream provider not set");
        // llmStream may return AsyncIterable directly or a Promise of it.
        return this.llmStream(context, options) as Promise<AsyncIterable<any>>;
      },
      this.memoryStore,
      this.tools,
    );

    // Set model if provided
    if (model) {
      this.setModel(model);
    }
  }

  /**
   * Convert agent's Tool metadata to llm's Tool format
   */
  private _convertToolsToLlm(tools: AgentTool[]): Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      parameters: tool.parameters || {},
    }));
  }

  // LLM call implementations using src/llm
  private _isRetryableError(err: any): boolean {
    // AbortError not retryable
    if (err.name === 'AbortError' || err.message?.includes('aborted')) return false;
    // Network error codes
    const code = err.code;
    if (code && ['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENETUNREACH','EPIPE','ECONNABORTED'].includes(code)) return true;
    // HTTP status from provider (e.g., 5xx, 429)
    const status = err.status as number | undefined;
    if (status && (status >= 500 || status === 429)) return true;
    return false;
  }

  private async _callWithRetry<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 2;
    const baseDelay = this.config.retryDelayMs ?? 1000;
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        // Convert AbortError to a standard abort signal
        if (err.name === 'AbortError') throw new Error('Aborted');
        if (attempt === maxRetries) break;
        if (!this._isRetryableError(err)) break;
        if (signal?.aborted) throw new Error('Aborted');
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 0.5 * baseDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  private _llmComplete = async (
    context: Context,
    options?: any,
  ): Promise<LLMResponse> => {
    if (!this.model) throw new Error("Model not set");
    const signal = options?.signal;
    const model = this.model; // capture to avoid undefined during retries
    return this._callWithRetry(async () => {
      const llmOptions: any = { ...options };
      if (this.config.getApiKey) {
        const apiKey = await this.config.getApiKey(model.provider);
        if (apiKey) llmOptions.apiKey = apiKey;
      }
      const result = await complete(model, context, llmOptions);
      const content = Array.isArray(result.content)
        ? result.content
            .map((c: any) => (c as any).text || (c as any).thinking || "")
            .join("")
        : (result.content as string) || "";
      return {
        content,
        stopReason: result.stopReason ?? "stop",
        usage: result.usage,
        toolCalls: [],
      } as LLMResponse;
    }, signal);
  };

  private _llmStream = async (
    context: Context,
    options?: any,
  ): Promise<AsyncIterable<any>> => {
    if (!this.model) throw new Error("Model not set");
    const signal = options?.signal;
    const model = this.model;
    return this._callWithRetry(async () => {
      const llmOptions: any = { ...options };
      if (this.config.getApiKey) {
        const apiKey = await this.config.getApiKey(model.provider);
        if (apiKey) llmOptions.apiKey = apiKey;
      }
      return await stream(model, context, llmOptions);
    }, signal);
  };

  private _resolveConfig(input: Partial<AgentConfig>): AgentConfig {
    return {
      maxRounds: input.maxRounds ?? 10,
      toolTimeout: input.toolTimeout ?? 30000,
      cacheResults: input.cacheResults ?? true,
      enableLogging: input.enableLogging ?? false,
      verbose: input.verbose ?? false,
      toolExecutionMode:
        input.toolExecutionMode ?? input.toolExecutionStrategy ?? "sequential",
      queueMode:
        input.queueMode ??
        (input.steeringMode === "all"
          ? "all"
          : input.steeringMode === "one-at-a-time"
            ? "one-at-a-time"
            : "all"),
      followUpMode: input.followUpMode ?? input.queueMode ?? "all",
      convertToLlm: input.convertToLlm,
      getApiKey: input.getApiKey,
      shouldStopAfterTurn: input.shouldStopAfterTurn,
      onBeforeToolCall: input.onBeforeToolCall,
      onAfterToolCall: input.onAfterToolCall,
      onTurnEnd: input.onTurnEnd,
      reasoningLevel: input.reasoningLevel,
      thinkingBudgets: input.thinkingBudgets,
      transformContext: input.transformContext,
      memoryStore: input.memoryStore,
      compaction: input.compaction,
      contextBuilder: input.contextBuilder,
      executor: input.executor,
      loopStrategy: input.loopStrategy,
      debug: input.debug,
      sessionId: input.sessionId,
      autoSaveMemories: input.autoSaveMemories,
      maxRetries: input.maxRetries,
      retryDelayMs: input.retryDelayMs,
    };
  }

  /** Prepare model for llm functions */
  private _prepareModel(model: Model): Model {
    return {
      id: model.id || model.name,
      name: model.name || model.id,
      api: "openai-completions",
      provider: (model as any).provider || "openai",
      baseUrl: (model as any).baseUrl || "",
      reasoning: (model as any).reasoning || false,
      input: (model as any).input || ["text"],
      cost: (model as any).cost || {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
      contextWindow: (model as any).contextWindow || 128000,
      maxTokens: (model as any).maxTokens || 8192,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Subscribe to all agent events.
   */
  subscribe(handler: (event: any) => Promise<void> | void): () => void {
    return this.emitter.onAny(handler);
  }

  /**
   * Get current runtime state.
   */
  getState(): Readonly<AgentRuntimeState> {
    return this.runner.getState();
  }

  /**
   * Get current loop strategy.
   */
  getStrategy(): LoopStrategy {
    return this.strategy;
  }

  /**
   * Get configured max rounds.
   */
  getMaxRounds(): number {
    return this.config.maxRounds;
  }

  /**
   * Get the event emitter.
   */
  getEmitter(): EventEmitter {
    return this.emitter;
  }

  /**
   * Register a new tool dynamically.
   */
  registerTool(tool: ToolDefinition): void {
    this.toolExecutor.register(tool);
    // Add to tools array for LLM context, replacing if exists
    const existingIndex = this.tools.findIndex(t => t.name === tool.name);
    const toolMeta: AgentTool = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      executionMode: tool.executionMode,
    };
    if (existingIndex >= 0) {
      this.tools[existingIndex] = toolMeta;
    } else {
      this.tools.push(toolMeta);
    }
  }

  /**
   * Get all registered tools (for LLM context).
   */
  getTools(): AgentTool[] {
    return this.tools;
  }

  /**
   * Get all available tool names.
   */
  getToolNames(): string[] {
    return this.toolExecutor.getNames();
  }

  /**
   * Check if a tool is registered.
   */
  hasTool(name: string): boolean {
    return this.toolExecutor.has(name);
  }

  /** (legacy) Set LLM provider using old signature; wraps into llmComplete */
  setLLMProvider(
    provider: (
      prompt: string,
      tools: any[],
      options?: any,
    ) => Promise<LLMResponse>,
  ): void {
    this.llmComplete = async (context: Context, options?: any) => {
      const prompt = context.messages.map((m) => (m as any).content).join(""); // simplistic
      const toolDefs = context.tools || [];
      return provider(prompt, toolDefs, options);
    };
  }

  /** (legacy) Set stream provider using old signature; wraps into llmStream */
  setStreamProvider(
    provider: (
      prompt: string,
      tools: any[],
      options?: any,
    ) => AsyncIterable<any> | Promise<AsyncIterable<any>>,
  ): void {
    this.llmStream = async (context: Context, options?: any) => {
      const prompt = context.messages.map((m) => (m as any).content).join("");
      const toolDefs = context.tools || [];
      return provider(prompt, toolDefs, options);
    };
  }

  /**
   * Run the agent (non-streaming).
   * Accepts either a simple text prompt or an array of conversation turns.
   * @param arg - The user's input prompt (string) or array of ConversationTurn.
   * @param signal - Optional AbortSignal to cancel execution.
   * @returns A promise that resolves with the final result.
   */
  async run(
    arg: string | ConversationTurn[],
    signal?: AbortSignal,
  ): Promise<AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error("Agent is already running");
    }

    if (!this.llmComplete) {
      throw new Error(
        "LLM provider not set. Provide a model or setModel() first.",
      );
    }

    const turns: ConversationTurn[] =
      typeof arg === "string"
        ? [
            {
              role: "user",
              content: [{ type: "text", text: arg }],
              timestamp: Date.now(),
            },
          ]
        : arg;


    // Track completion for waitForIdle()
    const p = this.execute(turns, signal);
    const idle = p.then(() => undefined);
    this._currentRunIdlePromise = idle;
    p.finally(() => {
      if (this._currentRunIdlePromise === idle)
        this._currentRunIdlePromise = null;
    });
    return p;
  }

  /**
   * Resume execution from the current state.
   * Used after steering/follow-up messages have been queued.
   * @param signal - Optional AbortSignal to cancel execution.
   * @returns A promise that resolves with the final result.
   */
  async resume(signal?: AbortSignal): Promise<AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error("Agent is already running");
    }

    if (!this.llmComplete) {
      throw new Error(
        "LLM provider not set. Provide a model or setModel() first.",
      );
    }

    const state = this.runner.getState();
    const lastTurn = state.history[state.history.length - 1];

    if (!lastTurn) {
      throw new Error("No conversation history to resume from");
    }

    let initialTurns: ConversationTurn[];
    if (lastTurn.role === "assistant") {
      // Check steering queue first
      if (this.steeringQueue.hasPending) {
        initialTurns = this.steeringQueue.drainAll();
      } else if (this.followUpQueue.hasPending) {
        // Then check follow-up queue
        initialTurns = this.followUpQueue.drainAll();
      } else {
        throw new Error(
          "Cannot resume: last message is assistant and no queued messages",
        );
      }
    } else {
      // Continue with empty initial turns (uses existing history)
      initialTurns = [];
    }

    // Track completion for waitForIdle()
    const p = this.runner.resume(
      initialTurns,
      this.steeringQueue,
      this.followUpQueue,
      signal,
    );
    const idle = p.then(() => undefined);
    this._currentRunIdlePromise = idle;
    p.finally(() => {
      if (this._currentRunIdlePromise === idle)
        this._currentRunIdlePromise = null;
    });
    return p;
  }

  /**
   * Stream agent execution in real-time.
   * Yields LLMStreamEvent deltas as they arrive, then returns the final result.
   * @param prompt - The user's input prompt.
   * @param signal - Optional AbortSignal to cancel execution.
   * @returns An async generator that yields stream events and final result.
   */
  async *stream(
    prompt: string,
    signal?: AbortSignal,
  ): AsyncGenerator<any, AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error("Agent is already running");
    }

    if (!this.llmStream) {
      throw new Error(
        "LLM stream provider not set. Provide a model or setModel() first.",
      );
    }

    const userTurn: ConversationTurn = {
      role: "user",
      content: [{ type: "text", text: prompt }],
      timestamp: Date.now(),
    };

    // Track completion for waitForIdle()
    let resolveIdle!: () => void;
    const idlePromise = new Promise<void>((resolve) => {
      resolveIdle = resolve;
    });
    this._currentRunIdlePromise = idlePromise;
    try {
      const result = yield* this.streamExecute([userTurn], signal);
      return result;
    } finally {
      resolveIdle();
      if (this._currentRunIdlePromise === idlePromise)
        this._currentRunIdlePromise = null;
    }
  }

  /**
   * Queue a steering message (injected during next turn).
   */
  steer(turn: ConversationTurn): void {
    this.steeringQueue.enqueue(turn);
  }

  /**
   * Queue a follow-up message (runs after agent stops).
   */
  followUp(turn: ConversationTurn): void {
    this.followUpQueue.enqueue(turn);
  }

  /**
   * Clear steering queue.
   */
  clearSteeringQueue(): void {
    this.steeringQueue.clear();
  }

  /**
   * Clear follow-up queue.
   */
  clearFollowUpQueue(): void {
    this.followUpQueue.clear();
  }

  /**
   * Clear all queues.
   */
  clearAllQueues(): void {
    this.clearSteeringQueue();
    this.clearFollowUpQueue();
  }

  /**
   * Check if any queue has pending messages.
   */
  hasQueuedMessages(): boolean {
    return this.steeringQueue.hasPending || this.followUpQueue.hasPending;
  }

  /**
   * Abort current execution.
   */
  abort(): void {
    this.runner.abort();
  }

  /**
   * Reset agent state to pristine, clearing history and queues.
   * Throws if the agent is currently running.
   */
  reset(): void {
    const state = this.runner.getState();
    if (state.isRunning) {
      throw new Error("Cannot reset agent while it is running");
    }
    this.runner.reset();
    this.clearAllQueues();
    this._currentRunIdlePromise = null;
  }

  /**
   * Wait until the agent becomes idle (no active run and all listeners settled).
   * Returns a promise that resolves immediately if the agent is already idle.
   */
  waitForIdle(): Promise<void> {
    return this._currentRunIdlePromise ?? Promise.resolve();
  }

  /**
   * Set the model for the agent.
   * Updates the LLM providers for both streaming and non-streaming calls.
   * @param model - The model to use, or undefined to clear.
   */
  setModel(model: Model | undefined): void {
    this.model = model;
    if (model) {
      this.llmComplete = this._llmComplete;
      this.llmStream = this._llmStream;
    } else {
      this.llmComplete = undefined;
      this.llmStream = undefined;
    }
  }

  // ============================================================================
  // Interactive Mode Compatibility
  // ============================================================================

  /** Get abort signal for current operation (if any) */
  get signal(): AbortSignal | undefined {
    return undefined;
  }

  /** Get transport (unused) */
  /** Get agent config (for session integration) */
  getConfig(): any {
    return this.config;
  }

  get transport(): any {
    return null;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private async execute(
    initialTurns: ConversationTurn[],
    signal?: AbortSignal,
  ): Promise<AgentRunResult> {
    return this.runner.run(
      "",
      this.steeringQueue,
      this.followUpQueue,
      signal,
      initialTurns,
    );
  }

  private async *streamExecute(
    initialTurns: ConversationTurn[],
    signal?: AbortSignal,
  ): AsyncGenerator<any, AgentRunResult> {
    const result = yield* this.runner.stream(
      "",
      this.steeringQueue,
      this.followUpQueue,
      signal,
      initialTurns,
    );
    return result;
  }

  private resolveConfig(config?: Partial<AgentConfig>): AgentConfig {
    return {
      maxRounds: config?.maxRounds ?? 10,
      verbose: config?.verbose ?? false,
      toolTimeout: config?.toolTimeout ?? 30000,
      cacheResults: config?.cacheResults ?? false,
      toolExecutionStrategy: config?.toolExecutionStrategy ?? "parallel",
      loopStrategy: config?.loopStrategy,
      contextBuilder: {
        maxTokens: config?.contextBuilder?.maxTokens ?? 128000,
        reservedTokens: config?.contextBuilder?.reservedTokens ?? 4096,
        minMessages: config?.contextBuilder?.minMessages ?? 5,
        enableMemoryInjection:
          config?.contextBuilder?.enableMemoryInjection ?? true,
      },
      executor: {
        timeout: config?.executor?.timeout ?? 30000,
        cacheEnabled: config?.executor?.cacheEnabled ?? false,
        cacheSize: config?.executor?.cacheSize ?? 1000,
        toolExecutionStrategy:
          config?.executor?.toolExecutionStrategy ?? "parallel",
        beforeToolCall: config?.executor?.beforeToolCall,
        afterToolCall: config?.executor?.afterToolCall,
      },
      enableLogging: config?.enableLogging ?? true,
      sessionId: config?.sessionId,
      thinkingBudgets: config?.thinkingBudgets,
      reasoningLevel: config?.reasoningLevel,
      transformContext: config?.transformContext,
      steeringMode: config?.steeringMode ?? "one-at-a-time",
      followUpMode: config?.followUpMode ?? "one-at-a-time",
      autoSaveMemories: config?.autoSaveMemories,
      debug: config?.debug ?? false,
      compaction: config?.compaction ?? { enabled: true, autoCompact: true },
    };
  }

  private createLogger(verbose: boolean): EventEmitter {
    const emitter = new EventEmitter();

    if (verbose) {
      emitter.onAny((event) => {
        const time = new Date(event.timestamp).toISOString();
        const round = `[R${event.round}]`;
        switch (event.type) {
          case "agent:start":
            console.log(`${time} ${round} 🚀 Agent started`);
            break;
          case "agent:end":
            console.log(`${time} ${round} ✅ Agent finished`);
            break;
          case "turn:end": {
            const tc = (event as any).toolCallsExecuted;
            console.log(`${time} ${round} ⏹️ Turn (${tc} tools)`);
            break;
          }
          case "tool:error":
            console.error(
              `${time} ${round} 💥 Tool error: ${(event as any).toolName}`,
            );
            break;
          case "error":
            console.error(
              `${time} ${round} 💥 Error: ${(event as any).message}`,
            );
            break;
        }
      });
    }

    return emitter;
  }
}
