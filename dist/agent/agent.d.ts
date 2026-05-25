/**
 * Agent: main public API.
 * Different design: separates concerns with AgentLoop.
 */
import type { ConversationTurn, AgentConfig, AgentRuntimeState, AgentRunResult, ToolDefinition, LoopStrategy, LLMResponse } from './types.js';
import { EventEmitter } from '../events/event-emitter.js';
import type { Model } from "../llm/index.js";
/**
 * Agent orchestrates AI interactions with tools.
 */
export declare class Agent {
    private readonly config;
    private readonly emitter;
    private readonly toolExecutor;
    private readonly contextBuilder;
    private readonly strategy;
    private readonly runner;
    private readonly steeringQueue;
    private readonly followUpQueue;
    private memoryStore?;
    private model?;
    private llmProvider?;
    private streamProvider?;
    private _currentRunIdlePromise;
    /**
     * Constructs a new Agent instance.
     * @param model - The AI model configuration.
     * @param tools - Array of tool definitions.
     * @param config - Optional configuration (maxRounds, verbose, memoryStore, etc.).
     */
    constructor(model?: Model, tools?: ToolDefinition[], config?: Partial<AgentConfig>);
    /**
     * Convert agent's ToolDefinition to llm's Tool format
     */
    private _convertToolsToLlm;
    /** Prepare model for llm functions */
    private _prepareModel;
    /**
     * Create LLM provider using llm's complete function
     */
    private _createLlmProvider;
    /**
     * Create stream provider using llm's stream function
     */
    private _createStreamProvider;
    /**
     * Subscribe to all agent events.
     */
    subscribe(handler: (event: any) => Promise<void> | void): () => void;
    /**
     * Get current runtime state.
     */
    getState(): Readonly<AgentRuntimeState>;
    /**
     * Get current loop strategy.
     */
    getStrategy(): LoopStrategy;
    /**
     * Get configured max rounds.
     */
    getMaxRounds(): number;
    /**
     * Get the event emitter.
     */
    getEmitter(): EventEmitter;
    /**
     * Register a new tool dynamically.
     */
    registerTool(tool: ToolDefinition): void;
    /**
     * Get all available tool names.
     */
    getToolNames(): string[];
    /**
     * Check if a tool is registered.
     */
    hasTool(name: string): boolean;
    /**
     * Set the LLM provider for non-streaming calls.
     */
    setLLMProvider(provider: (prompt: string, tools: any[], options?: any) => Promise<LLMResponse>): void;
    /**
     * Set the stream provider for streaming calls.
     */
    setStreamProvider(provider: (prompt: string, tools: any[], options?: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>): void;
    /**
     * Run the agent with a text prompt (non-streaming).
     * This starts a fresh execution with the given prompt.
     * @param prompt - The user's input prompt.
     * @param signal - Optional AbortSignal to cancel execution.
     * @returns A promise that resolves with the final result.
     */
    run(prompt: string, signal?: AbortSignal): Promise<AgentRunResult>;
    /**
     * Resume execution from the current state.
     * Used after steering/follow-up messages have been queued.
     * @param signal - Optional AbortSignal to cancel execution.
     * @returns A promise that resolves with the final result.
     */
    resume(signal?: AbortSignal): Promise<AgentRunResult>;
    /**
     * Stream agent execution in real-time.
     * Yields LLMStreamEvent deltas as they arrive, then returns the final result.
     * @param prompt - The user's input prompt.
     * @param signal - Optional AbortSignal to cancel execution.
     * @returns An async generator that yields stream events and final result.
     */
    stream(prompt: string, signal?: AbortSignal): AsyncGenerator<any, AgentRunResult>;
    /**
     * Queue a steering message (injected during next turn).
     */
    steer(turn: ConversationTurn): void;
    /**
     * Queue a follow-up message (runs after agent stops).
     */
    followUp(turn: ConversationTurn): void;
    /**
     * Clear steering queue.
     */
    clearSteeringQueue(): void;
    /**
     * Clear follow-up queue.
     */
    clearFollowUpQueue(): void;
    /**
     * Clear all queues.
     */
    clearAllQueues(): void;
    /**
     * Check if any queue has pending messages.
     */
    hasQueuedMessages(): boolean;
    /**
     * Abort current execution.
     */
    abort(): void;
    /**
     * Reset agent state to pristine, clearing history and queues.
     * Throws if the agent is currently running.
     */
    reset(): void;
    /**
     * Wait until the agent becomes idle (no active run and all listeners settled).
     * Returns a promise that resolves immediately if the agent is already idle.
     */
    waitForIdle(): Promise<void>;
    private execute;
    private streamExecute;
    private resolveConfig;
    private createLogger;
}
//# sourceMappingURL=agent.d.ts.map