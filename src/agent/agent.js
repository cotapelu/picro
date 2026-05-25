// SPDX-License-Identifier: Apache-2.0
/**
 * Agent: main public API.
 * Different design: separates concerns with AgentLoop.
 */
import { EventEmitter } from '../events/event-emitter.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-manager.js';
import { AgentLoop } from './agent-loop.js';
import { LoopStrategyFactory } from './loop-strategy.js';
import { MessageQueue } from './message-queue.js';
// Import from llm
import { complete, stream } from "../llm/index.js";
/**
 * Agent orchestrates AI interactions with tools.
 */
export class Agent {
    // ============================================================================
    // Properties (all declared before methods)
    // ============================================================================
    config;
    emitter;
    toolExecutor;
    contextBuilder;
    strategy;
    runner;
    steeringQueue;
    followUpQueue;
    memoryStore;
    model;
    llmProvider;
    streamProvider;
    _currentRunIdlePromise = null;
    /**
     * Constructs a new Agent instance.
     * @param model - The AI model configuration.
     * @param tools - Array of tool definitions.
     * @param config - Optional configuration (maxRounds, verbose, memoryStore, etc.).
     */
    constructor(model, tools = [], config) {
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
        let strategyName;
        if (config?.loopStrategy) {
            strategyName = config.loopStrategy;
        }
        else {
            strategyName = config?.toolExecutionStrategy === 'sequential' ? 'simple' : 'react';
        }
        this.strategy = LoopStrategyFactory.create(strategyName);
        this.steeringQueue = new MessageQueue(this.config.steeringMode === 'drain-all' ? 'drain-all' : 'dequeue-one');
        this.followUpQueue = new MessageQueue(this.config.followUpMode === 'drain-all' ? 'drain-all' : 'dequeue-one');
        if (config?.memoryStore) {
            this.memoryStore = config.memoryStore;
        }
        this.runner = new AgentLoop(this.config, this.emitter, this.toolExecutor, this.contextBuilder, this.strategy, this.memoryStore);
        this.toolExecutor.registerAll(tools);
        // Auto-set LLM provider using llm if model provided
        if (model) {
            this.llmProvider = this._createLlmProvider(model);
            this.streamProvider = this._createStreamProvider(model);
        }
    }
    /**
     * Convert agent's ToolDefinition to llm's Tool format
     */
    _convertToolsToLlm(tools) {
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description || '',
            parameters: tool.parameters || {},
        }));
    }
    /** Prepare model for llm functions */
    _prepareModel(model) {
        return {
            id: model.id || model.name,
            name: model.name || model.id,
            api: 'openai-completions',
            provider: model.provider || 'openai',
            baseUrl: model.baseUrl || '',
            reasoning: model.reasoning || false,
            input: model.input || ['text'],
            cost: model.cost || { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: model.contextWindow || 128000,
            maxTokens: model.maxTokens || 8192,
        };
    }
    /**
     * Create LLM provider using llm's complete function
     */
    _createLlmProvider(model) {
        const llmModel = this._prepareModel(model);
        return async (prompt, tools, options) => {
            const context = {
                messages: [
                    { role: 'user', content: prompt, timestamp: Date.now() }
                ],
                tools: tools.length > 0 ? this._convertToolsToLlm(tools) : undefined,
            };
            const llmOptions = {
                ...options,
                temperature: options?.temperature,
                maxTokens: options?.maxTokens,
                signal: options?.signal,
            };
            const result = await complete(llmModel, context, llmOptions);
            // Convert llm result to LLMResponse format
            const content = Array.isArray(result.content)
                ? result.content.map((c) => c.text || c.thinking || '').join('')
                : result.content || '';
            return {
                content,
                stopReason: result.stopReason || 'stop',
                usage: result.usage,
                toolCalls: [],
            };
        };
    }
    /**
     * Create stream provider using llm's stream function
     */
    _createStreamProvider(model) {
        const llmModel = this._prepareModel(model);
        const convert = this._convertToolsToLlm.bind(this);
        return async function* (prompt, tools, options) {
            const context = {
                messages: [
                    { role: 'user', content: prompt, timestamp: Date.now() }
                ],
                tools: tools.length > 0 ? convert(tools) : undefined,
            };
            const llmOptions = {
                ...options,
                temperature: options?.temperature,
                maxTokens: options?.maxTokens,
                signal: options?.signal,
            };
            const eventStream = await stream(llmModel, context, llmOptions);
            for await (const event of eventStream) {
                yield event;
            }
        };
    }
    // ============================================================================
    // Public API
    // ============================================================================
    /**
     * Subscribe to all agent events.
     */
    subscribe(handler) {
        return this.emitter.onAny(handler);
    }
    /**
     * Get current runtime state.
     */
    getState() {
        return this.runner.getState();
    }
    /**
     * Get current loop strategy.
     */
    getStrategy() {
        return this.strategy;
    }
    /**
     * Get configured max rounds.
     */
    getMaxRounds() {
        return this.config.maxRounds;
    }
    /**
     * Get the event emitter.
     */
    getEmitter() {
        return this.emitter;
    }
    /**
     * Register a new tool dynamically.
     */
    registerTool(tool) {
        this.toolExecutor.register(tool);
    }
    /**
     * Get all available tool names.
     */
    getToolNames() {
        return this.toolExecutor.getNames();
    }
    /**
     * Check if a tool is registered.
     */
    hasTool(name) {
        return this.toolExecutor.has(name);
    }
    /**
     * Set the LLM provider for non-streaming calls.
     */
    setLLMProvider(provider) {
        this.llmProvider = provider;
    }
    /**
     * Set the stream provider for streaming calls.
     */
    setStreamProvider(provider) {
        this.streamProvider = provider;
    }
    /**
     * Run the agent with a text prompt (non-streaming).
     * This starts a fresh execution with the given prompt.
     * @param prompt - The user's input prompt.
     * @param signal - Optional AbortSignal to cancel execution.
     * @returns A promise that resolves with the final result.
     */
    async run(prompt, signal) {
        if (this.runner.getState().isRunning) {
            throw new Error('Agent is already running');
        }
        if (!this.llmProvider) {
            throw new Error('LLM provider not set. Call setLLMProvider() first.');
        }
        const userTurn = {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
            timestamp: Date.now(),
        };
        // Track completion for waitForIdle()
        const p = this.execute([userTurn], signal);
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
    async resume(signal) {
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
        let initialTurns;
        if (lastTurn.role === 'assistant') {
            // Check steering queue first
            if (this.steeringQueue.hasPending) {
                initialTurns = this.steeringQueue.drainAll();
            }
            else if (this.followUpQueue.hasPending) {
                // Then check follow-up queue
                initialTurns = this.followUpQueue.drainAll();
            }
            else {
                throw new Error('Cannot resume: last message is assistant and no queued messages');
            }
        }
        else {
            // Continue with empty initial turns (uses existing history)
            initialTurns = [];
        }
        // Track completion for waitForIdle()
        const p = this.execute(initialTurns, signal);
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
    async *stream(prompt, signal) {
        if (this.runner.getState().isRunning) {
            throw new Error('Agent is already running');
        }
        if (!this.streamProvider) {
            throw new Error('Stream provider not set. Call setStreamProvider() first.');
        }
        const userTurn = {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
            timestamp: Date.now(),
        };
        // Track completion for waitForIdle()
        let resolveIdle;
        const idlePromise = new Promise((resolve) => { resolveIdle = resolve; });
        this._currentRunIdlePromise = idlePromise;
        try {
            const result = yield* this.streamExecute([userTurn], signal);
            return result;
        }
        finally {
            resolveIdle();
            if (this._currentRunIdlePromise === idlePromise)
                this._currentRunIdlePromise = null;
        }
    }
    /**
     * Queue a steering message (injected during next turn).
     */
    steer(turn) {
        this.steeringQueue.enqueue(turn);
    }
    /**
     * Queue a follow-up message (runs after agent stops).
     */
    followUp(turn) {
        this.followUpQueue.enqueue(turn);
    }
    /**
     * Clear steering queue.
     */
    clearSteeringQueue() {
        this.steeringQueue.clear();
    }
    /**
     * Clear follow-up queue.
     */
    clearFollowUpQueue() {
        this.followUpQueue.clear();
    }
    /**
     * Clear all queues.
     */
    clearAllQueues() {
        this.clearSteeringQueue();
        this.clearFollowUpQueue();
    }
    /**
     * Check if any queue has pending messages.
     */
    hasQueuedMessages() {
        return this.steeringQueue.hasPending || this.followUpQueue.hasPending;
    }
    /**
     * Abort current execution.
     */
    abort() {
        this.runner.abort();
    }
    /**
     * Reset agent state to pristine, clearing history and queues.
     * Throws if the agent is currently running.
     */
    reset() {
        const state = this.runner.getState();
        if (state.isRunning) {
            throw new Error('Cannot reset agent while it is running');
        }
        this.runner.reset();
        this.clearAllQueues();
        this._currentRunIdlePromise = null;
    }
    /**
     * Wait until the agent becomes idle (no active run and all listeners settled).
     * Returns a promise that resolves immediately if the agent is already idle.
     */
    waitForIdle() {
        return this._currentRunIdlePromise ?? Promise.resolve();
    }
    // ============================================================================
    // Private methods
    // ============================================================================
    async execute(initialTurns, signal) {
        return this.runner.run('', this.steeringQueue, this.followUpQueue, this.llmProvider, signal, initialTurns);
    }
    async *streamExecute(initialTurns, signal) {
        const result = yield* this.runner.stream('', this.steeringQueue, this.followUpQueue, this.streamProvider, signal);
        return result;
    }
    resolveConfig(config) {
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
                cacheSize: config?.executor?.cacheSize ?? 1000,
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
            compaction: config?.compaction ?? { enabled: true, autoCompact: true },
        };
    }
    createLogger(verbose) {
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
                        const tc = event.toolCallsExecuted;
                        console.log(`${time} ${round} ⏹️ Turn (${tc} tools)`);
                        break;
                    }
                    case 'tool:error':
                        console.error(`${time} ${round} 💥 Tool error: ${event.toolName}`);
                        break;
                    case 'error':
                        console.error(`${time} ${round} 💥 Error: ${event.message}`);
                        break;
                }
            });
        }
        return emitter;
    }
}
//# sourceMappingURL=agent.js.map