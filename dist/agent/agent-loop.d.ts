/**
 * AgentLoop: core loop execution.
 * Different from pi-agent-legacy: class-based, simpler flow.
 */
import type { ConversationTurn, AgentRuntimeState, AgentConfig, AgentRunResult, LLMResponse, MemoryStore, LoopStrategy } from './types.js';
import { EventEmitter } from '../events/event-emitter.js';
import { ToolExecutor } from './tool-executor.js';
import { ContextBuilder } from './context-manager.js';
import { MessageQueue } from './message-queue.js';
/**
 * Manages the agent execution loop.
 * Separated from Agent class for cleaner architecture.
 */
export declare class AgentLoop {
    private state;
    private config;
    private emitter;
    private toolExecutor;
    private contextBuilder;
    private strategy;
    private abortController;
    private memoryStore?;
    constructor(config: AgentConfig, emitter: EventEmitter, toolExecutor: ToolExecutor, contextBuilder: ContextBuilder, strategy: LoopStrategy, memoryStore?: MemoryStore);
    /** Abort current execution */
    abort(): void;
    /** Get current state snapshot */
    getState(): Readonly<AgentRuntimeState>;
    /** Reset state for new run */
    reset(): void;
    private createInitialState;
    /**
     * Run agent to completion (non-streaming).
     */
    run(initialPrompt: string, steeringQueue: MessageQueue, followUpQueue: MessageQueue, llmProvider: (prompt: string, tools: any[], options?: any) => Promise<LLMResponse>, signal?: AbortSignal, initialTurns?: ConversationTurn[]): Promise<AgentRunResult>;
    /**
     * Stream agent execution with delta events.
     * Yields LLMStreamEvent during streaming and returns final AgentRunResult.
     */
    stream(initialPrompt: string, steeringQueue: MessageQueue, followUpQueue: MessageQueue, streamProvider: (prompt: string, tools: any[], options?: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>, signal?: AbortSignal, initialTurns?: ConversationTurn[]): AsyncGenerator<any, AgentRunResult>;
    /**
     * Core execution loop used by both run and stream.
     * @param isStreaming - true for streaming, false for non-streaming
     */
    private executeLoop;
    private drainQueue;
    private autoSaveMemory;
    private createAssistantTurn;
    private createToolTurn;
    private createAbortedResult;
    private combineSignals;
    private getResultText;
}
//# sourceMappingURL=agent-loop.d.ts.map