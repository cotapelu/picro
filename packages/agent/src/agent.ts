// SPDX-License-Identifier: Apache-2.0
/**
 * Agent: main public API.
 * Different design: separates concerns with AgentRunner.
 */

import type {
  ConversationTurn,
  AgentConfig,
  AgentRuntimeState,
  AgentRunResult,
  ToolDefinition,
  LoopStrategy,
  MemoryStore,
  AIModel,
  LLMResponse,
} from './types.js';
import { EventEmitter } from './event-emitter.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-builder.js';
import { AgentRunner } from './agent-runner.js';
import { LoopStrategyFactory } from './loop-strategy.js';
import { MessageQueue } from './message-queue.js';

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
  private readonly contextBuilder: ContextBuilder;
  private readonly strategy: LoopStrategy;
  private readonly runner: AgentRunner;
  private readonly steeringQueue: MessageQueue;
  private readonly followUpQueue: MessageQueue;
  private memoryStore?: MemoryStore;
  private model: AIModel;
  private llmProvider?: (prompt: string, tools: any[], options?: any) => Promise<LLMResponse>;
  private streamProvider?: (prompt: string, tools: any[], options?: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>;

  /**
   * Constructs a new Agent instance.
   * @param model - The AI model configuration.
   * @param tools - Array of tool definitions.
   * @param config - Optional configuration (maxRounds, verbose, memoryStore, etc.).
   */
  constructor(
    model: AIModel,
    tools: ToolDefinition[],
    config?: Partial<AgentConfig>
  ) {
    this.model = model;
    this.config = this.resolveConfig(config);
    this.emitter = this.config.enableLogging
      ? this.createLogger(this.config.verbose)
      : new EventEmitter();

     this.toolExecutor = new ToolExecutor({
       timeout: this.config.toolTimeout,
       cacheEnabled: this.config.cacheResults,
       toolExecutionStrategy: this.config.toolExecutionStrategy,
       emitter: this.emitter,
       beforeToolCall: this.config.executor.beforeToolCall,
       afterToolCall: this.config.executor.afterToolCall,
       emitProgressUpdates: this.config.debug, // Emit progress updates in debug mode
     });

    this.contextBuilder = new ContextBuilder({
      maxTokens: this.config.contextBuilder.maxTokens,
      reservedTokens: this.config.contextBuilder.reservedTokens,
      minMessages: this.config.contextBuilder.minMessages,
      enableMemoryInjection: this.config.contextBuilder.enableMemoryInjection,
    });

    // Determine loop strategy: explicit loopStrategy takes precedence, else fallback to toolExecutionStrategy heuristic
    let strategyName: 'react' | 'plan-solve' | 'reflection' | 'simple' | 'self-refine';
    if (config?.loopStrategy) {
      strategyName = config.loopStrategy;
    } else {
      strategyName = config?.toolExecutionStrategy === 'sequential' ? 'simple' : 'react';
    }
    this.strategy = LoopStrategyFactory.create(strategyName);

    this.steeringQueue = new MessageQueue(
      this.config.steeringMode === 'drain-all' ? 'drain-all' : 'dequeue-one'
    );
    this.followUpQueue = new MessageQueue(
      this.config.followUpMode === 'drain-all' ? 'drain-all' : 'dequeue-one'
    );

    if (config?.memoryStore) {
      this.memoryStore = config.memoryStore;
    }

    this.runner = new AgentRunner(
      this.config,
      this.emitter,
      this.toolExecutor,
      this.contextBuilder,
      this.strategy,
      this.memoryStore
    );

    this.toolExecutor.registerAll(tools);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Subscribe to all agent events.
   */
  subscribe(
    handler: (event: any) => Promise<void> | void
  ): () => void {
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

  /**
   * Set the LLM provider for non-streaming calls.
   */
  setLLMProvider(
    provider: (prompt: string, tools: any[], options?: any) => Promise<LLMResponse>
  ): void {
    this.llmProvider = provider;
  }

  /**
   * Set the stream provider for streaming calls.
   */
  setStreamProvider(
    provider: (prompt: string, tools: any[], options?: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>
  ): void {
    this.streamProvider = provider;
  }

  /**
   * Run the agent with a text prompt (non-streaming).
   * This starts a fresh execution with the given prompt.
   * @param prompt - The user's input prompt.
   * @param signal - Optional AbortSignal to cancel execution.
   * @returns A promise that resolves with the final result.
   */
  async run(prompt: string, signal?: AbortSignal): Promise<AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error('Agent is already running');
    }

    if (!this.llmProvider) {
      throw new Error('LLM provider not set. Call setLLMProvider() first.');
    }

    const userTurn: ConversationTurn = {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
      timestamp: Date.now(),
    };

    return this.execute([userTurn], signal);
  }

  /**
   * Resume execution from the current state.
   * Used after steering/follow-up messages have been queued.
   * @param signal - Optional AbortSignal to cancel execution.
   * @returns A promise that resolves with the final result.
   */
  async resume(signal?: AbortSignal): Promise<AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error('Agent is already running');
    }

    if (!this.llmProvider) {
      throw new Error('LLM provider not set. Call setLLMProvider() first.');
    }

    const state = this.runner.getState();
    const lastTurn = state.history[state.history.length - 1];

    if (!lastTurn) {
      throw new Error('No conversation history to resume from');
    }

    if (lastTurn.role === 'assistant') {
      // Check steering queue first
      if (this.steeringQueue.hasPending) {
        const steering = this.steeringQueue.drainAll();
        return this.execute(steering, signal);
      }
      // Then check follow-up queue
      if (this.followUpQueue.hasPending) {
        const followUps = this.followUpQueue.drainAll();
        return this.execute(followUps, signal);
      }
      throw new Error('Cannot resume: last message is assistant and no queued messages');
    }

    // Continue with empty initial turns (uses existing history)
    return this.execute([], signal);
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
    signal?: AbortSignal
  ): AsyncGenerator<any, AgentRunResult> {
    if (this.runner.getState().isRunning) {
      throw new Error('Agent is already running');
    }

    if (!this.streamProvider) {
      throw new Error('Stream provider not set. Call setStreamProvider() first.');
    }

    const userTurn: ConversationTurn = {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
      timestamp: Date.now(),
    };

    const result = yield* this.streamExecute([userTurn], signal);
    return result;
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

  // ============================================================================
  // Private methods
  // ============================================================================

  private async execute(
    initialTurns: ConversationTurn[],
    signal?: AbortSignal
  ): Promise<AgentRunResult> {
    return this.runner.run(
      '',
      this.steeringQueue,
      this.followUpQueue,
      this.llmProvider!,
      signal
    );
  }

  private async *streamExecute(
    initialTurns: ConversationTurn[],
    signal?: AbortSignal
  ): AsyncGenerator<any, AgentRunResult> {
    const result = yield* this.runner.stream(
      '',
      this.steeringQueue,
      this.followUpQueue,
      this.streamProvider!,
      signal
    );
    return result;
  }

   private resolveConfig(config?: Partial<AgentConfig>): AgentConfig {
     return {
       maxRounds: config?.maxRounds ?? 10,
       verbose: config?.verbose ?? false,
       toolTimeout: config?.toolTimeout ?? 30000,
       cacheResults: config?.cacheResults ?? false,
       toolExecutionStrategy: config?.toolExecutionStrategy ?? 'parallel',
       loopStrategy: config?.loopStrategy,
       contextBuilder: {
         maxTokens: config?.contextBuilder?.maxTokens ?? 128000,
         reservedTokens: config?.contextBuilder?.reservedTokens ?? 4096,
         minMessages: config?.contextBuilder?.minMessages ?? 5,
         enableMemoryInjection: config?.contextBuilder?.enableMemoryInjection ?? true,
       },
       executor: {
         timeout: config?.executor?.timeout ?? 30000,
         cacheEnabled: config?.executor?.cacheEnabled ?? false,
         toolExecutionStrategy: config?.executor?.toolExecutionStrategy ?? 'parallel',
         beforeToolCall: config?.executor?.beforeToolCall,
         afterToolCall: config?.executor?.afterToolCall,
       },
       enableLogging: config?.enableLogging ?? true,
       sessionId: config?.sessionId,
       thinkingBudgets: config?.thinkingBudgets,
       reasoningLevel: config?.reasoningLevel,
       transformContext: config?.transformContext,
       steeringMode: config?.steeringMode ?? 'dequeue-one',
       followUpMode: config?.followUpMode ?? 'dequeue-one',
       autoSaveMemories: config?.autoSaveMemories,
       debug: config?.debug ?? false,
     };
   }

  private createLogger(verbose: boolean): EventEmitter {
    const emitter = new EventEmitter();

    if (verbose) {
      emitter.onAny((event) => {
        const time = new Date(event.timestamp).toISOString();
        const round = `[R${event.round}]`;
        switch (event.type) {
          case 'agent:start':
            console.log(`${time} ${round} 🚀 Agent started`);
            break;
          case 'agent:end':
            console.log(`${time} ${round} ✅ Agent finished`);
            break;
          case 'turn:end': {
            const tc = (event as any).toolCallsExecuted;
            console.log(`${time} ${round} ⏹️ Turn (${tc} tools)`);
            break;
          }
          case 'tool:error':
            console.error(`${time} ${round} 💥 Tool error: ${(event as any).toolName}`);
            break;
          case 'error':
            console.error(`${time} ${round} 💥 Error: ${(event as any).message}`);
            break;
        }
      });
    }

    return emitter;
  }
}
